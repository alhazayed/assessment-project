-- Database checks for the 2026-10-15 access-audit launch blockers (B1–B6).
--
-- Run as the `postgres` role against a Supabase preview branch or a local
-- database with all migrations applied:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/launch_blocker_access.sql
--
-- Everything runs inside one transaction that is rolled back, so it leaves no
-- data behind. Each check acts as a real end user (role `authenticated` plus a
-- JWT claim set), the same way PostgREST does. Any failed check raises and
-- aborts the run.

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
SELECT id, k || '-' || left(id::text, 8) || '@launch-blocker.test' FROM ids;

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

-- ── B1: clinician self-verification ───────────────────────
SELECT pg_temp.expect('B1 clinician cannot verify self', pg_temp.u('c'), 'aal1',
  format($q$UPDATE public.clinician_verifications SET status = 'verified' WHERE clinician_id = %L$q$, pg_temp.u('c')),
  'denied');
SELECT pg_temp.expect('B1 patient cannot insert a verified row', pg_temp.u('p'), 'aal1',
  format($q$INSERT INTO public.clinician_verifications
    (clinician_id, full_name, professional_title, license_number, country, specialty, organization, status)
    VALUES (%L, 'x', 'x', 'x', 'x', 'x', 'x', 'verified')$q$, pg_temp.u('p')),
  'denied');
SELECT pg_temp.expect_rows('B1 clinician still reads own verification', pg_temp.u('c'), 'aal1',
  'SELECT 1 FROM public.clinician_verifications', 1);

-- ── B2: forged scores ─────────────────────────────────────
SELECT pg_temp.expect('B2 patient cannot insert a submission', pg_temp.u('p'), 'aal1',
  format($q$INSERT INTO public.assessment_submissions (patient_id, definition_id, total_score, severity_band, high_risk_flag)
    VALUES (%L, (SELECT id FROM public.assessment_definitions LIMIT 1), 0, 'Minimal', false)$q$, pg_temp.u('p')),
  'denied');
SELECT pg_temp.expect('B2 patient cannot call submit_assessment_atomic', pg_temp.u('p'), 'aal1',
  format($q$SELECT public.submit_assessment_atomic(%L, (SELECT id FROM public.assessment_definitions LIMIT 1),
    0, 'Minimal', false, true, '[]'::jsonb)$q$, pg_temp.u('p')),
  'denied');
SELECT pg_temp.expect_rows('B2 patient still reads own results', pg_temp.u('p'), 'aal1',
  'SELECT 1 FROM public.assessment_submissions', 1);

-- ── B3: legacy link and revocation ────────────────────────
SELECT pg_temp.expect_rows('B3 consented clinician reads results', pg_temp.u('v'), 'aal1',
  format('SELECT 1 FROM public.assessment_submissions WHERE patient_id = %L', pg_temp.u('p')), 1);
SELECT pg_temp.expect_rows('B3 legacy link alone grants nothing', pg_temp.u('v'), 'aal1',
  format('SELECT 1 FROM public.assessment_submissions WHERE patient_id = %L', pg_temp.u('p2')), 0);
UPDATE public.clinician_patient_relationships SET status = 'revoked', revoked_at = now()
WHERE clinician_id = pg_temp.u('v') AND patient_id = pg_temp.u('p');
SELECT pg_temp.expect_rows('B3 revoked clinician loses access', pg_temp.u('v'), 'aal1',
  format('SELECT 1 FROM public.assessment_submissions WHERE patient_id = %L', pg_temp.u('p')), 0);
UPDATE public.clinician_patient_relationships SET status = 'active', revoked_at = NULL
WHERE clinician_id = pg_temp.u('v') AND patient_id = pg_temp.u('p');

-- ── B4: protected profile fields ──────────────────────────
SELECT pg_temp.expect('B4 patient cannot attach a clinician', pg_temp.u('p'), 'aal1',
  format('UPDATE public.profiles SET assigned_clinician_id = %L WHERE id = %L', pg_temp.u('c'), pg_temp.u('p')),
  'denied');
SELECT pg_temp.expect('B4 patient cannot change is_active', pg_temp.u('p'), 'aal1',
  format('UPDATE public.profiles SET is_active = false WHERE id = %L', pg_temp.u('p')),
  'denied');
SELECT pg_temp.expect('B4 patient cannot clear deletion request', pg_temp.u('p'), 'aal1',
  format('UPDATE public.profiles SET deletion_requested_at = now() WHERE id = %L', pg_temp.u('p')),
  'denied');
SELECT pg_temp.expect('B4 patient can still edit own name', pg_temp.u('p'), 'aal1',
  format($q$UPDATE public.profiles SET full_name_en = 'New name' WHERE id = %L$q$, pg_temp.u('p')),
  'allowed');

-- ── B5: suspension and deactivation ───────────────────────
UPDATE public.clinician_verifications SET status = 'suspended' WHERE clinician_id = pg_temp.u('v');
SELECT pg_temp.expect_rows('B5 suspended clinician loses access', pg_temp.u('v'), 'aal1',
  format('SELECT 1 FROM public.assessment_submissions WHERE patient_id = %L', pg_temp.u('p')), 0);
UPDATE public.clinician_verifications SET status = 'verified' WHERE clinician_id = pg_temp.u('v');

UPDATE public.profiles SET is_active = false WHERE id = pg_temp.u('v');
SELECT pg_temp.expect_rows('B5 deactivated clinician loses access', pg_temp.u('v'), 'aal1',
  format('SELECT 1 FROM public.assessment_submissions WHERE patient_id = %L', pg_temp.u('p')), 0);
UPDATE public.profiles SET is_active = true WHERE id = pg_temp.u('v');

UPDATE public.profiles SET is_active = false WHERE id = pg_temp.u('a');
SELECT pg_temp.expect_rows('B5 deactivated admin reads no PHI even with MFA', pg_temp.u('a'), 'aal2',
  'SELECT 1 FROM public.assessment_submissions', 0);
UPDATE public.profiles SET is_active = true WHERE id = pg_temp.u('a');

-- ── B6: admin rules need an MFA (aal2) session ────────────
SELECT pg_temp.expect_rows('B6 admin without MFA reads no results', pg_temp.u('a'), 'aal1',
  'SELECT 1 FROM public.assessment_submissions', 0);
SELECT pg_temp.expect_rows('B6 admin without MFA reads no other profiles', pg_temp.u('a'), 'aal1',
  'SELECT 1 FROM public.profiles', 1);
SELECT pg_temp.expect_rows('B6 admin without MFA reads no verifications', pg_temp.u('a'), 'aal1',
  'SELECT 1 FROM public.clinician_verifications', 0);
SELECT pg_temp.expect('B6 admin without MFA cannot deactivate users', pg_temp.u('a'), 'aal1',
  format('UPDATE public.profiles SET is_active = false WHERE id = %L', pg_temp.u('p')),
  'denied');
SELECT pg_temp.expect('B6 superadmin without MFA cannot delete results', pg_temp.u('s'), 'aal1',
  'DELETE FROM public.assessment_submissions', 'denied');

SELECT pg_temp.expect_rows('B6 admin with MFA reads results', pg_temp.u('a'), 'aal2',
  format('SELECT 1 FROM public.assessment_submissions WHERE patient_id IN (%L, %L)', pg_temp.u('p'), pg_temp.u('p2')), 2);
-- Reviews go through /api/admin/clinician-verifications (service role), not RLS.
SELECT pg_temp.expect('B6 admin cannot write verifications directly', pg_temp.u('a'), 'aal2',
  format($q$UPDATE public.clinician_verifications SET status = 'verified' WHERE clinician_id = %L$q$, pg_temp.u('c')),
  'denied');
SELECT pg_temp.expect('B6 admin with MFA can deactivate a patient', pg_temp.u('a'), 'aal2',
  format('UPDATE public.profiles SET is_active = false WHERE id = %L', pg_temp.u('p')),
  'allowed');

-- Failed admin logins are audited by the service role with no actor.
INSERT INTO public.audit_log (action, target_type) VALUES ('admin_login_failed', 'admin_session');
SELECT pg_temp.expect('audit: users cannot write actor-less audit rows', pg_temp.u('p'), 'aal1',
  $q$INSERT INTO public.audit_log (action, target_type) VALUES ('forged', 'admin_session')$q$,
  'denied');

ROLLBACK;
