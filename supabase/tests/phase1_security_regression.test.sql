-- =============================================================================
-- PHASE 1 SECURITY REMEDIATION — RLS regression tests
-- =============================================================================
-- Verifies the database-level authorization guarantees added by:
--   20260718090000_phase1_admin_rpc_authz_lockdown.sql        (Obj 1 & 2)
--   20260718090100_phase1_clinician_relationship_helpers_backfill.sql (Obj 5 base)
--   20260718090200_phase1_rls_clinical_notes_messages_fix.sql (Obj 3 & 4)
--   20260718090300_phase1_rls_clinician_scope_relationships.sql (Obj 5)
--
-- Assumes a Supabase-compatible database with all migrations applied and
-- auth.uid() resolving from `request.jwt.claim.sub` (impersonation idiom below).
-- Run in CI with `supabase test db`, or locally via scratchpad/bootstrap.sql.
--
-- The whole suite runs in one transaction and ROLLBACKs, leaving no fixtures.
-- Any failed ASSERT aborts the transaction and returns a non-zero exit.
-- =============================================================================
BEGIN;

-- Impersonation helpers.
CREATE OR REPLACE FUNCTION pg_temp.act_as(p_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_uid::text, true);
  EXECUTE 'set local role authenticated';
END $$;
CREATE OR REPLACE FUNCTION pg_temp.act_as_superuser() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE 'reset role';
  PERFORM set_config('request.jwt.claim.sub', '', true);
END $$;

-- ── Fixtures ─────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001'), -- admin
  ('cccccccc-0000-0000-0000-000000000001'), -- clinician C1
  ('cccccccc-0000-0000-0000-000000000002'), -- clinician C2
  ('11111111-0000-0000-0000-000000000001'), -- patient P1 (assigned C1)
  ('22222222-0000-0000-0000-000000000002'), -- patient P2 (related to C2)
  ('33333333-0000-0000-0000-000000000003'); -- patient P3 (unassigned)

-- Inserting P1 with assigned_clinician_id = C1 fires the sync trigger →
-- creates an ACTIVE relationship (C1,P1). Order: clinicians before patients (FK).
INSERT INTO public.profiles (id, role, full_name_en, assigned_clinician_id) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'admin',     'Admin', NULL),
  ('cccccccc-0000-0000-0000-000000000001', 'clinician', 'C1',    NULL),
  ('cccccccc-0000-0000-0000-000000000002', 'clinician', 'C2',    NULL),
  ('11111111-0000-0000-0000-000000000001', 'patient',   'P1',    'cccccccc-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000002', 'patient',   'P2',    NULL),
  ('33333333-0000-0000-0000-000000000003', 'patient',   'P3',    NULL);
INSERT INTO public.patient_profiles (id) VALUES
  ('11111111-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000002'),
  ('33333333-0000-0000-0000-000000000003');

-- Explicit ACTIVE relationship (C2,P2); explicit REVOKED relationship (C1,P2).
INSERT INTO public.clinician_patient_relationships (clinician_id, patient_id, status, initiated_by) VALUES
  ('cccccccc-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000002','active','clinician'),
  ('cccccccc-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000002','revoked','clinician');

-- Notes: one private, one shared — both authored by C1 for P1.
INSERT INTO public.clinical_notes (patient_id, clinician_id, body, is_private) VALUES
  ('11111111-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001','PRIVATE note', true),
  ('11111111-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001','SHARED note',  false);

-- One message in the (P1,C1) conversation.
INSERT INTO public.messages (patient_id, clinician_id, sender_id, body) VALUES
  ('11111111-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001','hello');

-- PHI rows for relationship-gating tests.
INSERT INTO public.assessment_submissions (patient_id) VALUES
  ('11111111-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000002'),
  ('33333333-0000-0000-0000-000000000003');
INSERT INTO public.mood_logs (patient_id) VALUES ('11111111-0000-0000-0000-000000000001');

-- =============================================================================
-- OBJECTIVE 1 & 2 — admin RPC lockdown
-- =============================================================================
DO $$ BEGIN
  ASSERT NOT has_function_privilege('anon','public.get_admin_dashboard_stats(integer)','execute'),
    'OBJ1 FAIL: anon can still execute admin RPC';
  ASSERT has_function_privilege('authenticated','public.get_admin_dashboard_stats(integer)','execute'),
    'OBJ1 note: authenticated execute retained (gated by is_admin)';
  ASSERT NOT has_function_privilege('anon','public.get_high_risk_patients(integer)','execute'),
    'OBJ1 FAIL: anon can still execute get_high_risk_patients';
END $$;

-- Non-admin authenticated user must be denied at the DB (ERRCODE 42501).
SELECT pg_temp.act_as('11111111-0000-0000-0000-000000000001');
DO $$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    PERFORM * FROM public.get_admin_dashboard_stats(7);
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  ASSERT denied, 'OBJ2 FAIL: non-admin executed get_admin_dashboard_stats without error';
END $$;
SELECT pg_temp.act_as_superuser();

-- Admin must succeed.
SELECT pg_temp.act_as('aaaaaaaa-0000-0000-0000-000000000001');
DO $$
DECLARE ok boolean := true;
BEGIN
  BEGIN
    PERFORM * FROM public.get_admin_dashboard_stats(7);
  EXCEPTION WHEN OTHERS THEN ok := false;
  END;
  ASSERT ok, 'OBJ2 FAIL: admin could not execute get_admin_dashboard_stats';
END $$;
SELECT pg_temp.act_as_superuser();

-- =============================================================================
-- OBJECTIVE 3 — clinical_notes
-- =============================================================================
-- Patient sees the SHARED note but NOT the PRIVATE one.
SELECT pg_temp.act_as('11111111-0000-0000-0000-000000000001');
DO $$
DECLARE n_private int; n_shared int;
BEGIN
  SELECT count(*) INTO n_private FROM public.clinical_notes WHERE is_private = true;
  SELECT count(*) INTO n_shared  FROM public.clinical_notes WHERE is_private = false;
  ASSERT n_private = 0, 'OBJ3 FAIL: patient can read PRIVATE clinical notes';
  ASSERT n_shared  = 1, 'OBJ3 FAIL: patient cannot read own shared note';
END $$;
SELECT pg_temp.act_as_superuser();

-- Related clinician (C1) reads both notes and can write a new note for P1.
SELECT pg_temp.act_as('cccccccc-0000-0000-0000-000000000001');
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.clinical_notes WHERE patient_id = '11111111-0000-0000-0000-000000000001';
  ASSERT n = 2, 'OBJ3 FAIL: related clinician cannot read notes';
  INSERT INTO public.clinical_notes (patient_id, clinician_id, body, is_private)
  VALUES ('11111111-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001','new', true);
END $$;
SELECT pg_temp.act_as_superuser();

-- Unrelated clinician (C2) cannot read or write P1's notes.
SELECT pg_temp.act_as('cccccccc-0000-0000-0000-000000000002');
DO $$
DECLARE n int; blocked boolean := false;
BEGIN
  SELECT count(*) INTO n FROM public.clinical_notes WHERE patient_id = '11111111-0000-0000-0000-000000000001';
  ASSERT n = 0, 'OBJ3/5 FAIL: unrelated clinician can read P1 notes';
  BEGIN
    INSERT INTO public.clinical_notes (patient_id, clinician_id, body, is_private)
    VALUES ('11111111-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000002','x', true);
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  ASSERT blocked, 'OBJ3/5 FAIL: unrelated clinician wrote a note for P1';
END $$;
SELECT pg_temp.act_as_superuser();

-- =============================================================================
-- OBJECTIVE 4 — messages
-- =============================================================================
-- Unrelated clinician cannot inject a message into (P1,C1).
SELECT pg_temp.act_as('cccccccc-0000-0000-0000-000000000002');
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.messages (patient_id, clinician_id, sender_id, body)
    VALUES ('11111111-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000002','intrusion');
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  ASSERT blocked, 'OBJ4 FAIL: unrelated clinician inserted a message';
END $$;
SELECT pg_temp.act_as_superuser();

-- Sender forgery is rejected (P1 tries to send as C1).
SELECT pg_temp.act_as('11111111-0000-0000-0000-000000000001');
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.messages (patient_id, clinician_id, sender_id, body)
    VALUES ('11111111-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001','forged');
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  ASSERT blocked, 'OBJ4 FAIL: sender_id forgery accepted';
  -- Legitimate participant send is allowed.
  INSERT INTO public.messages (patient_id, clinician_id, sender_id, body)
  VALUES ('11111111-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','from patient');
END $$;
SELECT pg_temp.act_as_superuser();

-- Read scoping: participant reads, non-participant clinician does not.
SELECT pg_temp.act_as('cccccccc-0000-0000-0000-000000000002');
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.messages WHERE patient_id = '11111111-0000-0000-0000-000000000001';
  ASSERT n = 0, 'OBJ4 FAIL: non-participant clinician read the conversation';
END $$;
SELECT pg_temp.act_as_superuser();

-- =============================================================================
-- OBJECTIVE 5 — clinician access gated by clinician_patient_relationships
-- =============================================================================
-- Related clinician C1 reads P1 PHI; unrelated to P2 sees nothing.
SELECT pg_temp.act_as('cccccccc-0000-0000-0000-000000000001');
DO $$
DECLARE n_p1_sub int; n_p1_mood int; n_p2_sub int;
BEGIN
  SELECT count(*) INTO n_p1_sub  FROM public.assessment_submissions WHERE patient_id = '11111111-0000-0000-0000-000000000001';
  SELECT count(*) INTO n_p1_mood FROM public.mood_logs             WHERE patient_id = '11111111-0000-0000-0000-000000000001';
  SELECT count(*) INTO n_p2_sub  FROM public.assessment_submissions WHERE patient_id = '22222222-0000-0000-0000-000000000002';
  ASSERT n_p1_sub  >= 1, 'OBJ5 FAIL: related clinician cannot read P1 submissions';
  ASSERT n_p1_mood >= 1, 'OBJ5 FAIL: related clinician cannot read P1 mood';
  ASSERT n_p2_sub  =  0, 'OBJ5 FAIL: clinician read submissions of unrelated patient P2';
END $$;
SELECT pg_temp.act_as_superuser();

-- C2 is related to P2 only.
SELECT pg_temp.act_as('cccccccc-0000-0000-0000-000000000002');
DO $$
DECLARE n_p2 int; n_p1 int;
BEGIN
  SELECT count(*) INTO n_p2 FROM public.assessment_submissions WHERE patient_id = '22222222-0000-0000-0000-000000000002';
  SELECT count(*) INTO n_p1 FROM public.assessment_submissions WHERE patient_id = '11111111-0000-0000-0000-000000000001';
  ASSERT n_p2 >= 1, 'OBJ5 FAIL: C2 cannot read related P2 submissions';
  ASSERT n_p1 =  0, 'OBJ5 FAIL: C2 read unrelated P1 submissions';
END $$;
SELECT pg_temp.act_as_superuser();

-- Sync trigger + revoke-respect: assigning P3 to C1 grants access; re-assigning
-- the previously-REVOKED (C1,P2) must NOT resurrect access.
DO $$ BEGIN
  ASSERT public.relationship_active('cccccccc-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001'),
    'OBJ5 FAIL: trigger did not create relationship for assigned P1';
END $$;

UPDATE public.profiles SET assigned_clinician_id = 'cccccccc-0000-0000-0000-000000000001'
  WHERE id = '33333333-0000-0000-0000-000000000003';
UPDATE public.profiles SET assigned_clinician_id = 'cccccccc-0000-0000-0000-000000000001'
  WHERE id = '22222222-0000-0000-0000-000000000002';

DO $$ BEGIN
  ASSERT public.relationship_active('cccccccc-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000003'),
    'OBJ5 FAIL: sync trigger did not activate relationship for newly assigned P3';
  ASSERT NOT public.relationship_active('cccccccc-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000002'),
    'OBJ5 FAIL: sync trigger resurrected a REVOKED relationship (C1,P2)';
END $$;

-- Newly assigned P3 is now visible to C1.
SELECT pg_temp.act_as('cccccccc-0000-0000-0000-000000000001');
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.assessment_submissions WHERE patient_id = '33333333-0000-0000-0000-000000000003';
  ASSERT n >= 1, 'OBJ5 FAIL: clinician cannot read newly-assigned P3 after trigger';
END $$;
SELECT pg_temp.act_as_superuser();

-- =============================================================================
-- Overlap removal — exactly one consolidated policy set remains
-- =============================================================================
DO $$
DECLARE n_cn int; n_msg int; n_legacy int;
BEGIN
  SELECT count(*) INTO n_cn FROM pg_policies WHERE schemaname='public' AND tablename='clinical_notes';
  ASSERT n_cn = 3, format('OBJ3 FAIL: expected 3 clinical_notes policies, found %s', n_cn);

  -- The consolidated messages set is exactly the six policies from migration C.
  SELECT count(*) INTO n_msg FROM pg_policies WHERE schemaname='public' AND tablename='messages';
  ASSERT n_msg = 6, format('OBJ4 FAIL: expected 6 messages policies, found %s', n_msg);

  -- The loose baseline policies (which lacked sender/relationship checks) are gone.
  -- (Note: msg_participant_insert/read names are REUSED by migration C for the
  -- corrected, relationship-checked policies — behaviour is verified above.)
  SELECT count(*) INTO n_legacy FROM pg_policies
    WHERE schemaname='public' AND tablename='messages'
      AND policyname IN ('messages_insert','messages_read','messages_update');
  ASSERT n_legacy = 0, 'OBJ4 FAIL: baseline messages policies still present';
END $$;

\echo '============================================================'
\echo 'PHASE 1 RLS REGRESSION SUITE: ALL ASSERTIONS PASSED'
\echo '============================================================'

ROLLBACK;
