-- Database checks for migration 20261024120000_revoked_clinician_history.sql:
-- a clinician whose relationship is revoked no longer sees past messages or
-- the assignments they set; the patient still does.
--
--   bash supabase/tests/run.sh revoked_clinician_history.sql
--
-- Helpers and fixtures are the same as role_audit_followup.sql; everything is
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

-- v may message p and see p's assessment history.
INSERT INTO public.relationship_permissions (relationship_id, permission_key, granted, granted_at)
SELECT r.id, k, true, now()
FROM public.clinician_patient_relationships r,
     unnest(ARRAY['message_patient', 'view_assessment_history']) k
WHERE r.clinician_id = pg_temp.u('v') AND r.patient_id = pg_temp.u('p');

INSERT INTO public.messages (patient_id, clinician_id, sender_id, body)
VALUES (pg_temp.u('p'), pg_temp.u('v'), pg_temp.u('v'), 'from clinician'),
       (pg_temp.u('p'), pg_temp.u('v'), pg_temp.u('p'), 'from patient');

INSERT INTO public.assessment_assignments (patient_id, clinician_id, definition_id)
VALUES (pg_temp.u('p'), pg_temp.u('v'), (SELECT id FROM public.assessment_definitions LIMIT 1));

-- ── 1. while the relationship is active ───────────────────
SELECT pg_temp.expect_rows('active: clinician sees the conversation', pg_temp.u('v'), 'aal1',
  'SELECT 1 FROM public.messages', 2);
SELECT pg_temp.expect_rows('active: clinician sees the assignment', pg_temp.u('v'), 'aal1',
  'SELECT 1 FROM public.assessment_assignments', 1);

-- ── 2. after the patient revokes ──────────────────────────
UPDATE public.clinician_patient_relationships SET status = 'revoked'
WHERE clinician_id = pg_temp.u('v') AND patient_id = pg_temp.u('p');

SELECT pg_temp.expect_rows('revoked: clinician no longer sees the conversation', pg_temp.u('v'), 'aal1',
  'SELECT 1 FROM public.messages', 0);
SELECT pg_temp.expect_rows('revoked: clinician no longer sees the assignment', pg_temp.u('v'), 'aal1',
  'SELECT 1 FROM public.assessment_assignments', 0);
SELECT pg_temp.expect('revoked: clinician cannot mark messages read', pg_temp.u('v'), 'aal1',
  'UPDATE public.messages SET read_at = now()', 'denied');
SELECT pg_temp.expect_rows('revoked: patient still sees the conversation', pg_temp.u('p'), 'aal1',
  'SELECT 1 FROM public.messages', 2);
SELECT pg_temp.expect_rows('revoked: patient still sees the assignment', pg_temp.u('p'), 'aal1',
  'SELECT 1 FROM public.assessment_assignments', 1);
SELECT pg_temp.expect('revoked: patient can still mark a message read', pg_temp.u('p'), 'aal1',
  'UPDATE public.messages SET read_at = now() WHERE sender_id <> auth.uid()', 'allowed');

-- ── 3. restoring the relationship restores the history ────
UPDATE public.clinician_patient_relationships SET status = 'active'
WHERE clinician_id = pg_temp.u('v') AND patient_id = pg_temp.u('p');

SELECT pg_temp.expect_rows('restored: clinician sees the conversation again', pg_temp.u('v'), 'aal1',
  'SELECT 1 FROM public.messages', 2);

ROLLBACK;
