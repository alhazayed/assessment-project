-- Database checks for the 2026-10-15 role-audit follow-up fixes
-- (migration 20261022130000_role_audit_followup_fixes.sql).
--
--   bash supabase/tests/run.sh role_audit_followup.sql
--
-- Same harness and fixtures as launch_blocker_access.sql; everything is
-- rolled back at the end.

BEGIN;

-- ── helpers ───────────────────────────────────────────────
-- Drops the acting user's claims so fixture changes run as postgres again.
CREATE FUNCTION pg_temp.clear_claims() RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claim.sub', '', true),
         set_config('request.jwt.claim.role', '', true),
         set_config('request.jwt.claims', '', true);
$$;

-- Runs `stmt` as user `uid` with the given assurance level and reports
-- whether it took effect: an exception, or zero rows affected (RLS filtered
-- the row out), both count as "denied".
CREATE FUNCTION pg_temp.attempt(uid uuid, aal text, stmt text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  n bigint;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', uid::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
  BEGIN
    SET LOCAL ROLE authenticated;
    EXECUTE stmt;
    GET DIAGNOSTICS n = ROW_COUNT;
    RESET ROLE;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    PERFORM pg_temp.clear_claims();
    RETURN 'denied: ' || SQLERRM;
  END;
  PERFORM pg_temp.clear_claims();
  RETURN CASE WHEN n > 0 THEN 'allowed' ELSE 'denied: 0 rows' END;
END;
$$;

CREATE FUNCTION pg_temp.expect(label text, uid uuid, aal text, stmt text, want text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  got text := pg_temp.attempt(uid, aal, stmt);
BEGIN
  IF split_part(got, ':', 1) <> want THEN
    RAISE EXCEPTION 'FAIL %: expected %, got %', label, want, got;
  END IF;
  RAISE NOTICE 'ok   %  (%)', label, got;
END;
$$;

-- Read check: does `uid` see exactly `want_rows` rows from `query`?
CREATE FUNCTION pg_temp.expect_rows(label text, uid uuid, aal text, query text, want_rows bigint)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  n bigint;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', uid::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
  SET LOCAL ROLE authenticated;
  EXECUTE 'SELECT count(*) FROM (' || query || ') q' INTO n;
  RESET ROLE;
  PERFORM pg_temp.clear_claims();
  IF n <> want_rows THEN
    RAISE EXCEPTION 'FAIL %: expected % rows, got %', label, want_rows, n;
  END IF;
  RAISE NOTICE 'ok   %  (% rows)', label, n;
END;
$$;

-- ── fixtures ──────────────────────────────────────────────
-- p  = patient, p2 = second patient, c = clinician awaiting verification,
-- v  = verified clinician, a = admin, s = superadmin
CREATE TEMP TABLE ids (k text PRIMARY KEY, id uuid) ON COMMIT DROP;
INSERT INTO ids VALUES
  ('p',  gen_random_uuid()), ('p2', gen_random_uuid()),
  ('c',  gen_random_uuid()), ('v',  gen_random_uuid()),
  ('a',  gen_random_uuid()), ('s',  gen_random_uuid());
GRANT SELECT ON ids TO authenticated;

INSERT INTO auth.users (id, email)
SELECT id, k || '-' || left(id::text, 8) || '@role-followup.test' FROM ids;

-- handle_new_user creates the profiles; set roles as the service would.
INSERT INTO public.profiles (id, role, full_name_en)
SELECT id, 'patient', k FROM ids
ON CONFLICT (id) DO NOTHING;
UPDATE public.profiles p SET role = CASE i.k
    WHEN 'c' THEN 'clinician' WHEN 'v' THEN 'clinician'
    WHEN 'a' THEN 'admin'     WHEN 's' THEN 'superadmin'
    ELSE 'patient' END
FROM ids i WHERE p.id = i.id;

INSERT INTO public.clinician_verifications
  (clinician_id, full_name, professional_title, license_number, country, specialty, organization, status)
SELECT id, k, 'Psychologist', 'L-' || k, 'JO', 'Clinical', 'Clinic',
       CASE k WHEN 'v' THEN 'verified' ELSE 'pending_verification' END
FROM ids WHERE k IN ('c', 'v');

-- v has an active, consented relationship with p, plus a legacy link to p2
-- with no relationship at all.
WITH r AS (
  INSERT INTO public.clinician_patient_relationships (clinician_id, patient_id, status, initiated_by)
  SELECT (SELECT id FROM ids WHERE k = 'v'), (SELECT id FROM ids WHERE k = 'p'), 'active', 'patient'
  RETURNING id
)
INSERT INTO public.relationship_permissions (relationship_id, permission_key, granted, granted_at)
SELECT r.id, 'view_assessment_results', true, now() FROM r;
UPDATE public.profiles SET assigned_clinician_id = (SELECT id FROM ids WHERE k = 'v')
WHERE id = (SELECT id FROM ids WHERE k = 'p2');

INSERT INTO public.assessment_definitions (code, name_en, name_ar, total_questions)
SELECT 'LB_TEST', 'Launch blocker test', 'اختبار', 1
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_definitions);

INSERT INTO public.assessment_submissions (patient_id, definition_id, total_score, severity_band, high_risk_flag)
SELECT i.id, (SELECT id FROM public.assessment_definitions LIMIT 1), 12, 'Moderate', false
FROM ids i WHERE i.k IN ('p', 'p2');

-- Make the fixture ids reachable from the checks below by name.
CREATE FUNCTION pg_temp.u(key text) RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT id FROM ids WHERE k = key $$;

-- ── 1. audit_log is append-only ───────────────────────────
INSERT INTO public.audit_log (actor_id, action, created_at)
VALUES (pg_temp.u('p'), 'old_entry', now() - interval '400 days'),
       (pg_temp.u('p'), 'recent_entry', now() - interval '1 day');

SELECT pg_temp.expect('audit: patient can self-report a consent', pg_temp.u('p'), 'aal1',
  format($q$INSERT INTO public.audit_log (actor_id, action) VALUES (%L, 'consent_given')$q$, pg_temp.u('p')),
  'allowed');
SELECT pg_temp.expect('audit: patient cannot forge other actions', pg_temp.u('p'), 'aal1',
  format($q$INSERT INTO public.audit_log (actor_id, action) VALUES (%L, 'data_export')$q$, pg_temp.u('p')),
  'denied');
SELECT pg_temp.expect('audit: superadmin cannot delete an entry', pg_temp.u('s'), 'aal2',
  $q$DELETE FROM public.audit_log WHERE action = 'recent_entry'$q$,
  'denied');

DO $$
BEGIN
  BEGIN
    DELETE FROM public.audit_log WHERE action = 'recent_entry';
    RAISE EXCEPTION 'FAIL audit: server delete was allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
    RAISE NOTICE 'ok   audit: even the server cannot delete an entry  (%)', SQLERRM;
  END;
  BEGIN
    UPDATE public.audit_log SET action = 'tampered' WHERE action = 'recent_entry';
    RAISE EXCEPTION 'FAIL audit: server update was allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
    RAISE NOTICE 'ok   audit: even the server cannot edit an entry  (%)', SQLERRM;
  END;
  BEGIN
    PERFORM public.purge_audit_log_before(now() - interval '30 days');
    RAISE EXCEPTION 'FAIL audit: purge of recent entries was allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
    RAISE NOTICE 'ok   audit: purge refuses entries newer than 365 days  (%)', SQLERRM;
  END;
END $$;

DO $$
DECLARE n integer;
BEGIN
  n := public.purge_audit_log_before(now() - interval '366 days', pg_temp.u('s'));
  IF n <> 1 OR EXISTS (SELECT 1 FROM public.audit_log WHERE action = 'old_entry')
     OR NOT EXISTS (SELECT 1 FROM public.audit_log WHERE action = 'recent_entry')
     OR NOT EXISTS (SELECT 1 FROM public.audit_log WHERE action = 'audit_log_purged') THEN
    RAISE EXCEPTION 'FAIL audit: retention purge removed % rows or left the wrong rows', n;
  END IF;
  RAISE NOTICE 'ok   audit: retention purge removes only old entries and logs itself';
END $$;

SELECT pg_temp.expect('audit: purge function is not callable by users', pg_temp.u('s'), 'aal2',
  $q$SELECT public.purge_audit_log_before(now() - interval '400 days')$q$,
  'denied');

-- Erasing a user keeps their audit history.
DO $$
DECLARE x uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email) VALUES (x, 'erase-me@role-followup.test');
  INSERT INTO public.profiles (id, role) VALUES (x, 'patient') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.audit_log (actor_id, action, target_id) VALUES (x, 'erase_probe', x);
  PERFORM admin_hard_delete_user(x);
  IF NOT EXISTS (SELECT 1 FROM public.audit_log WHERE action = 'erase_probe' AND actor_id IS NULL) THEN
    RAISE EXCEPTION 'FAIL audit: hard delete removed the user''s audit history';
  END IF;
  RAISE NOTICE 'ok   audit: hard delete keeps history with actor set to NULL';
END $$;

-- ── 2. relationships and invitations are server-only ──────
SELECT pg_temp.expect('rel: verified clinician cannot insert an active link', pg_temp.u('v'), 'aal1',
  format($q$INSERT INTO public.clinician_patient_relationships (clinician_id, patient_id, status, initiated_by)
            VALUES (%L, %L, 'active', 'clinician')$q$, pg_temp.u('v'), pg_temp.u('p2')),
  'denied');
SELECT pg_temp.expect('rel: patient cannot re-point a relationship', pg_temp.u('p'), 'aal1',
  format($q$UPDATE public.clinician_patient_relationships SET clinician_id = %L WHERE patient_id = %L$q$,
         pg_temp.u('c'), pg_temp.u('p')),
  'denied');
SELECT pg_temp.expect('rel: patient cannot change status directly', pg_temp.u('p'), 'aal1',
  format($q$UPDATE public.clinician_patient_relationships SET status = 'revoked' WHERE patient_id = %L$q$, pg_temp.u('p')),
  'denied');
SELECT pg_temp.expect_rows('rel: both parties still read it', pg_temp.u('p'), 'aal1',
  'SELECT 1 FROM public.clinician_patient_relationships', 1);

DO $$
BEGIN
  BEGIN
    UPDATE public.clinician_patient_relationships SET patient_id = pg_temp.u('p2')
    WHERE patient_id = pg_temp.u('p');
    RAISE EXCEPTION 'FAIL rel: server moved a relationship to another patient';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
    RAISE NOTICE 'ok   rel: parties are fixed even for the server  (%)', SQLERRM;
  END;
END $$;

INSERT INTO public.clinician_invitations (clinician_id, status, patient_id, accepted_at)
VALUES (pg_temp.u('v'), 'accepted', pg_temp.u('p'), now());

SELECT pg_temp.expect('invite: patient cannot forge an invitation', pg_temp.u('p'), 'aal1',
  format($q$INSERT INTO public.clinician_invitations (clinician_id) VALUES (%L)$q$, pg_temp.u('c')),
  'denied');
SELECT pg_temp.expect('invite: clinician cannot insert directly', pg_temp.u('c'), 'aal1',
  format($q$INSERT INTO public.clinician_invitations (clinician_id) VALUES (%L)$q$, pg_temp.u('c')),
  'denied');
SELECT pg_temp.expect('invite: clinician cannot reset an accepted invite', pg_temp.u('v'), 'aal1',
  format($q$UPDATE public.clinician_invitations SET status = 'pending' WHERE clinician_id = %L$q$, pg_temp.u('v')),
  'denied');
SELECT pg_temp.expect_rows('invite: clinician still reads own invites', pg_temp.u('v'), 'aal1',
  'SELECT 1 FROM public.clinician_invitations', 1);

-- ── 3. messages ───────────────────────────────────────────
INSERT INTO public.messages (patient_id, clinician_id, sender_id, body)
VALUES (pg_temp.u('p'), pg_temp.u('v'), pg_temp.u('v'), 'hello');

SELECT pg_temp.expect('msg: sender cannot mark own message read', pg_temp.u('v'), 'aal1',
  'UPDATE public.messages SET read_at = now()', 'denied');
SELECT pg_temp.expect('msg: recipient cannot edit the body', pg_temp.u('p'), 'aal1',
  $q$UPDATE public.messages SET body = 'edited', read_at = now()$q$, 'denied');
SELECT pg_temp.expect('msg: recipient marks it read', pg_temp.u('p'), 'aal1',
  'UPDATE public.messages SET read_at = now()', 'allowed');
SELECT pg_temp.expect('msg: read time cannot be rewritten', pg_temp.u('p'), 'aal1',
  $q$UPDATE public.messages SET read_at = now() + interval '1 day'$q$, 'denied');
SELECT pg_temp.expect('msg: outsider cannot mark it read', pg_temp.u('p2'), 'aal1',
  'UPDATE public.messages SET read_at = now()', 'denied');

-- ── 4. package results ────────────────────────────────────
DO $$
BEGIN
  IF (SELECT count(*) FROM pg_policies
      WHERE tablename = 'package_results' AND permissive = 'RESTRICTIVE'
        AND policyname IN ('package_results_no_end_user_insert', 'package_results_no_end_user_update')) <> 2 THEN
    RAISE EXCEPTION 'FAIL pkg: end-user write blocks are missing';
  END IF;
  RAISE NOTICE 'ok   pkg: end users cannot write package results';
END $$;

-- ── 5. access codes ───────────────────────────────────────
DO $$
DECLARE c text := public.generate_patient_access_code();
BEGIN
  IF c !~ '^V[A-HJ-NP-Z2-9]{10}$' THEN
    RAISE EXCEPTION 'FAIL code: unexpected format %', c;
  END IF;
  RAISE NOTICE 'ok   code: % has the new 50-bit format', c;
END $$;

ROLLBACK;
