-- Regression test for the production "Failed to save results" bug.
--
-- The API route (app/api/submit-assessment/route.ts) invokes
-- submit_assessment_atomic() via the SERVICE ROLE (no end-user JWT, so
-- auth.uid() is NULL). The original function raised 42501 in that case, which
-- surfaced to the user as "Failed to save results".
--
-- This test loads the FIXED function verbatim from the migration and proves:
--   1. Service-role path (auth.uid() NULL) succeeds and writes submission+responses.
--   2. Authenticated self-submit (auth.uid() = patient) still succeeds.
--   3. Authenticated cross-user submit (auth.uid() <> patient) is still BLOCKED (IDOR).
--   4. NULL patient_id is rejected.
--
-- Run:  bash __tests__/rls/run_submit.sh

\set ON_ERROR_STOP on

-- ── Supabase-provided objects the function assumes ────────────────────────────
create extension if not exists pgcrypto;
do $$ begin create role anon; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin create role service_role bypassrls; exception when duplicate_object then null; end $$;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;

-- ── Minimal schema mirroring the columns the function writes ──────────────────
create table assessment_submissions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  definition_id uuid,
  total_score int,
  severity_band text,
  high_risk_flag boolean,
  is_self_initiated boolean,
  submitted_at timestamptz default now()
);
create table assessment_responses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  item_id uuid,
  response_value int,
  response_label_en text,
  response_label_ar text
);

-- ── Function under test — mirrored verbatim from the fix migration ────────────
--   supabase/migrations/20260702180000_fix_submit_assessment_atomic_service_role.sql
CREATE OR REPLACE FUNCTION public.submit_assessment_atomic(
  p_patient_id uuid, p_definition_id uuid, p_total_score integer,
  p_severity_band text, p_high_risk_flag boolean, p_is_self_initiated boolean,
  p_responses jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_submission_id uuid; v_response record;
BEGIN
  IF p_patient_id IS NULL THEN
    RAISE EXCEPTION 'patient_id is required' USING ERRCODE = '22004';
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_patient_id THEN
    RAISE EXCEPTION 'Forbidden: patient_id does not match authenticated user' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.assessment_submissions (patient_id, definition_id, total_score, severity_band, high_risk_flag, is_self_initiated)
  VALUES (p_patient_id, p_definition_id, p_total_score, p_severity_band, p_high_risk_flag, p_is_self_initiated)
  RETURNING id INTO v_submission_id;
  FOR v_response IN
    SELECT (r->>'item_id')::uuid AS item_id, (r->>'response_value')::integer AS response_value,
           r->>'response_label_en' AS response_label_en, r->>'response_label_ar' AS response_label_ar
    FROM jsonb_array_elements(p_responses) AS r
  LOOP
    INSERT INTO public.assessment_responses (submission_id, item_id, response_value, response_label_en, response_label_ar)
    VALUES (v_submission_id, v_response.item_id, v_response.response_value, v_response.response_label_en, v_response.response_label_ar);
  END LOOP;
  RETURN v_submission_id;
END; $$;

-- ── Fixtures ──────────────────────────────────────────────────────────────────
\set patient  '''11111111-1111-1111-1111-111111111111'''
\set attacker '''22222222-2222-2222-2222-222222222222'''
\set defn     '''33333333-3333-3333-3333-333333333333'''
\set resp     '''[{"item_id":"44444444-4444-4444-4444-444444444444","response_value":4,"response_label_en":"Very often","response_label_ar":"غالبًا"}]'''

-- ── TEST 1: service-role path (auth.uid() NULL) — the production case ─────────
do $$
declare v_id uuid;
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true); -- service role: valid JSON, no sub → auth.uid() NULL
  v_id := public.submit_assessment_atomic(
    '11111111-1111-1111-1111-111111111111'::uuid,
    '33333333-3333-3333-3333-333333333333'::uuid,
    4, 'High', true, true,
    '[{"item_id":"44444444-4444-4444-4444-444444444444","response_value":4,"response_label_en":"Very often","response_label_ar":"غالبًا"}]'::jsonb
  );
  if v_id is null then raise exception 'TEST 1 FAILED: service-role submit returned null'; end if;
  if (select count(*) from assessment_submissions where id = v_id) <> 1 then
    raise exception 'TEST 1 FAILED: submission row not written'; end if;
  if (select count(*) from assessment_responses where submission_id = v_id) <> 1 then
    raise exception 'TEST 1 FAILED: response row not written'; end if;
  raise notice 'TEST 1 PASS: service-role submit succeeded (%).', v_id;
end $$;

-- ── TEST 2: authenticated self-submit succeeds ───────────────────────────────
do $$
declare v_id uuid;
begin
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
  v_id := public.submit_assessment_atomic(
    '11111111-1111-1111-1111-111111111111'::uuid,
    '33333333-3333-3333-3333-333333333333'::uuid,
    2, 'Mild', false, true,
    '[]'::jsonb
  );
  if v_id is null then raise exception 'TEST 2 FAILED: authenticated self-submit returned null'; end if;
  raise notice 'TEST 2 PASS: authenticated self-submit succeeded.';
end $$;

-- ── TEST 3: authenticated cross-user submit is BLOCKED (IDOR protection) ──────
do $$
declare v_blocked boolean := false;
begin
  perform set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true); -- attacker
  begin
    perform public.submit_assessment_atomic(
      '11111111-1111-1111-1111-111111111111'::uuid,  -- victim patient_id
      '33333333-3333-3333-3333-333333333333'::uuid, 0, 'Low', false, true, '[]'::jsonb
    );
  exception when others then
    if SQLERRM like 'Forbidden%' then v_blocked := true; end if;
  end;
  if not v_blocked then raise exception 'TEST 3 FAILED: cross-user submit was NOT blocked (IDOR!)'; end if;
  raise notice 'TEST 3 PASS: cross-user submit blocked (IDOR protected).';
end $$;

-- ── TEST 4: NULL patient_id rejected ─────────────────────────────────────────
do $$
declare v_rejected boolean := false;
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  begin
    perform public.submit_assessment_atomic(NULL, '33333333-3333-3333-3333-333333333333'::uuid, 0, 'Low', false, true, '[]'::jsonb);
  exception when others then v_rejected := true;
  end;
  if not v_rejected then raise exception 'TEST 4 FAILED: null patient_id was not rejected'; end if;
  raise notice 'TEST 4 PASS: null patient_id rejected.';
end $$;

select 'ALL SUBMIT_ASSESSMENT_ATOMIC TESTS PASSED' as result;
