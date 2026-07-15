-- Phase 2.1 authorization-consolidation regression test — throwaway Postgres.
-- Proves the consolidated model (has_clinician_access + the re-pointed RLS
-- policies + the assigned_clinician_id backfill) authorizes identically to the
-- legacy model for legacy patients, honours consent for modern patients, denies
-- revoked/unrelated access, and that the backfill is idempotent.
--
-- Mirrors verbatim:
--   supabase/migrations/20260715120000_consolidate_clinician_authorization.sql
--   supabase/migrations/20260624120000_clinician_patient_consent_system.sql (check_relationship_permission)
--   supabase/migrations/20260619120000_schema_baseline.sql (get_my_role)
--
-- Run:  bash __tests__/rls/run.sh authorization_consolidation.test.sql
-- Any failed assertion RAISEs → non-zero psql exit.

\set ON_ERROR_STOP on

create extension if not exists pgcrypto;
do $$ begin create role anon; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin create role service_role bypassrls; exception when duplicate_object then null; end $$;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;

-- ── Schema (columns the policies reference) ───────────────────────────────────
drop table if exists messages, mood_logs, assessment_assignments, assessment_submissions,
  relationship_permissions, clinician_patient_relationships, profiles cascade;
create table profiles (id uuid primary key, role text not null default 'patient', assigned_clinician_id uuid);
create table clinician_patient_relationships (
  id uuid primary key default gen_random_uuid(),
  clinician_id uuid not null, patient_id uuid not null, status text not null,
  initiated_by text, request_message text, requested_at timestamptz default now(), responded_at timestamptz,
  unique(clinician_id, patient_id));
create table relationship_permissions (
  relationship_id uuid not null references clinician_patient_relationships(id) on delete cascade,
  permission_key text not null, granted boolean not null default false, granted_at timestamptz,
  unique(relationship_id, permission_key));
create table assessment_submissions (id uuid primary key default gen_random_uuid(), patient_id uuid not null);
create table assessment_assignments (id uuid primary key default gen_random_uuid(), patient_id uuid not null, clinician_id uuid not null);
create table mood_logs (id uuid primary key default gen_random_uuid(), patient_id uuid not null);
create table messages (id uuid primary key default gen_random_uuid(), patient_id uuid not null, clinician_id uuid not null, sender_id uuid not null);
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ── Helper functions (mirrored) ───────────────────────────────────────────────
create or replace function public.get_my_role() returns text
  language sql stable security definer set search_path to 'public' as $$
  select role from public.profiles where id = auth.uid();
$$;
create or replace function public.check_relationship_permission(p_clinician_id uuid, p_patient_id uuid, p_permission text)
  returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.clinician_patient_relationships cpr
    join public.relationship_permissions rp on rp.relationship_id = cpr.id
    where cpr.clinician_id = p_clinician_id and cpr.patient_id = p_patient_id
      and cpr.status = 'active' and rp.permission_key = p_permission and rp.granted = true);
$$;
create or replace function public.has_clinician_access(p_clinician_id uuid, p_patient_id uuid, p_permission text)
  returns boolean language sql stable security definer set search_path = public as $$
  select public.check_relationship_permission(p_clinician_id, p_patient_id, p_permission)
    or exists (select 1 from public.profiles pr where pr.id = p_patient_id and pr.assigned_clinician_id = p_clinician_id);
$$;

-- ── Consolidated policies (verbatim from the migration) ───────────────────────
alter table assessment_submissions enable row level security;
create policy submissions_patient_select on assessment_submissions for select using ((select auth.uid()) = patient_id);
create policy submissions_clinician on assessment_submissions for select using (
  (get_my_role() = any (array['admin','superadmin']))
  or (get_my_role() = 'clinician' and public.has_clinician_access((select auth.uid()), assessment_submissions.patient_id, 'view_assessment_results')));

alter table mood_logs enable row level security;
create policy mood_owner on mood_logs for all using ((select auth.uid()) = patient_id) with check ((select auth.uid()) = patient_id);
create policy mood_clinician on mood_logs for select using (
  (get_my_role() = any (array['admin','superadmin']))
  or (get_my_role() = 'clinician' and public.has_clinician_access((select auth.uid()), mood_logs.patient_id, 'view_mood_tracking')));

alter table assessment_assignments enable row level security;
create policy assign_read on assessment_assignments for select using (
  ((select auth.uid()) = patient_id)
  or (get_my_role() = any (array['admin','superadmin']))
  or (get_my_role() = 'clinician' and (
      clinician_id = (select auth.uid())
      or public.has_clinician_access((select auth.uid()), assessment_assignments.patient_id, 'view_assessment_history'))));

alter table messages enable row level security;
create policy messages_read on messages for select using (((select auth.uid()) = patient_id) or ((select auth.uid()) = clinician_id));
create policy messages_insert on messages for insert with check (
  (select auth.uid()) = sender_id
  and (
    ((select auth.uid()) = patient_id and public.has_clinician_access(messages.clinician_id, (select auth.uid()), 'message_patient'))
    or ((select auth.uid()) = clinician_id and public.has_clinician_access((select auth.uid()), messages.patient_id, 'message_patient'))
    or get_my_role() = any (array['admin','superadmin'])));

-- ── Seed ──────────────────────────────────────────────────────────────────────
-- C1/C2 clinicians; PL legacy(→C1); PC consent-only(→C2); PRV revoked(→C2); PN none; ADM admin; SUP superadmin
insert into profiles(id, role, assigned_clinician_id) values
 ('c1111111-0000-0000-0000-000000000001','clinician', null),
 ('c2222222-0000-0000-0000-000000000002','clinician', null),
 ('a1111111-0000-0000-0000-000000000001','patient','c1111111-0000-0000-0000-000000000001'), -- PL legacy→C1
 ('b2222222-0000-0000-0000-000000000002','patient', null),  -- PC consent→C2
 ('d3333333-0000-0000-0000-000000000003','patient', null),  -- PRV revoked→C2
 ('e4444444-0000-0000-0000-000000000004','patient', null),  -- PN none
 ('f5555555-0000-0000-0000-000000000005','admin',  null),
 ('a6666666-0000-0000-0000-000000000006','superadmin', null);

-- PC: active consent granting the read/message permissions
insert into clinician_patient_relationships(id, clinician_id, patient_id, status, initiated_by) values
 ('11111111-1111-1111-1111-111111111111','c2222222-0000-0000-0000-000000000002','b2222222-0000-0000-0000-000000000002','active','clinician');
insert into relationship_permissions(relationship_id, permission_key, granted) values
 ('11111111-1111-1111-1111-111111111111','view_assessment_results', true),
 ('11111111-1111-1111-1111-111111111111','view_assessment_history', true),
 ('11111111-1111-1111-1111-111111111111','view_mood_tracking', true),
 ('11111111-1111-1111-1111-111111111111','message_patient', true);
-- PRV: relationship exists but consent revoked (status revoked)
insert into clinician_patient_relationships(id, clinician_id, patient_id, status, initiated_by) values
 ('22222222-2222-2222-2222-222222222222','c2222222-0000-0000-0000-000000000002','d3333333-0000-0000-0000-000000000003','revoked','clinician');
insert into relationship_permissions(relationship_id, permission_key, granted) values
 ('22222222-2222-2222-2222-222222222222','view_assessment_results', true),
 ('22222222-2222-2222-2222-222222222222','view_mood_tracking', true);

-- One submission, mood log, and admin-authored assignment per patient
insert into assessment_submissions(patient_id) values
 ('a1111111-0000-0000-0000-000000000001'),('b2222222-0000-0000-0000-000000000002'),
 ('d3333333-0000-0000-0000-000000000003'),('e4444444-0000-0000-0000-000000000004');
insert into mood_logs(patient_id) values
 ('a1111111-0000-0000-0000-000000000001'),('b2222222-0000-0000-0000-000000000002'),
 ('d3333333-0000-0000-0000-000000000003');
insert into assessment_assignments(patient_id, clinician_id) values
 ('a1111111-0000-0000-0000-000000000001','f5555555-0000-0000-0000-000000000005'),
 ('b2222222-0000-0000-0000-000000000002','f5555555-0000-0000-0000-000000000005');

create or replace function assert_count(claim_sub uuid, sql text, expected bigint, label text)
returns void language plpgsql as $$
declare got bigint;
begin
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub', claim_sub)::text, true);
  execute sql into got;
  reset role;
  if got is distinct from expected then raise exception 'FAIL: % — expected %, got %', label, expected, got; end if;
  raise notice 'ok: %', label;
end $$;

-- attempt an insert as a role; returns true if BLOCKED by RLS
create or replace function insert_blocked(claim_sub uuid, sql text) returns boolean language plpgsql as $$
declare blocked boolean := false;
begin
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub', claim_sub)::text, true);
  begin execute sql; exception when insufficient_privilege then blocked := true; end;
  reset role;
  return blocked;
end $$;

-- ══ PRE-BACKFILL assertions ══════════════════════════════════════════════════
do $$
begin
  -- Submissions (view_assessment_results)
  perform assert_count('c1111111-0000-0000-0000-000000000001', $q$select count(*) from assessment_submissions where patient_id='a1111111-0000-0000-0000-000000000001'$q$, 1, 'legacy: C1 reads PL submission');
  perform assert_count('c1111111-0000-0000-0000-000000000001', $q$select count(*) from assessment_submissions where patient_id='b2222222-0000-0000-0000-000000000002'$q$, 0, 'C1 cannot read PC submission (no rel)');
  perform assert_count('c2222222-0000-0000-0000-000000000002', $q$select count(*) from assessment_submissions where patient_id='b2222222-0000-0000-0000-000000000002'$q$, 1, 'consent: C2 reads PC submission');
  perform assert_count('c2222222-0000-0000-0000-000000000002', $q$select count(*) from assessment_submissions where patient_id='a1111111-0000-0000-0000-000000000001'$q$, 0, 'C2 cannot read PL submission');
  perform assert_count('c2222222-0000-0000-0000-000000000002', $q$select count(*) from assessment_submissions where patient_id='d3333333-0000-0000-0000-000000000003'$q$, 0, 'revoked: C2 cannot read PRV submission');
  perform assert_count('f5555555-0000-0000-0000-000000000005', 'select count(*) from assessment_submissions', 4, 'admin reads all submissions');
  perform assert_count('a6666666-0000-0000-0000-000000000006', 'select count(*) from assessment_submissions', 4, 'superadmin reads all submissions');
  perform assert_count('a1111111-0000-0000-0000-000000000001', 'select count(*) from assessment_submissions', 1, 'patient self reads own submission only');

  -- Mood (view_mood_tracking)
  perform assert_count('c1111111-0000-0000-0000-000000000001', $q$select count(*) from mood_logs where patient_id='a1111111-0000-0000-0000-000000000001'$q$, 1, 'legacy: C1 reads PL mood');
  perform assert_count('c2222222-0000-0000-0000-000000000002', $q$select count(*) from mood_logs where patient_id='b2222222-0000-0000-0000-000000000002'$q$, 1, 'consent: C2 reads PC mood');
  perform assert_count('c2222222-0000-0000-0000-000000000002', $q$select count(*) from mood_logs where patient_id='d3333333-0000-0000-0000-000000000003'$q$, 0, 'revoked: C2 cannot read PRV mood');

  -- Assignments (assign_read, view_assessment_history)
  perform assert_count('c1111111-0000-0000-0000-000000000001', $q$select count(*) from assessment_assignments where patient_id='a1111111-0000-0000-0000-000000000001'$q$, 1, 'legacy: C1 reads PL assignment');
  perform assert_count('c2222222-0000-0000-0000-000000000002', $q$select count(*) from assessment_assignments where patient_id='b2222222-0000-0000-0000-000000000002'$q$, 1, 'consent: C2 reads PC assignment');
  perform assert_count('c2222222-0000-0000-0000-000000000002', $q$select count(*) from assessment_assignments where patient_id='a1111111-0000-0000-0000-000000000001'$q$, 0, 'C2 cannot read PL assignment');
end $$;

-- Messaging (message_patient) — WITH CHECK on insert
do $$
begin
  if insert_blocked('a1111111-0000-0000-0000-000000000001', $q$insert into messages(patient_id,clinician_id,sender_id) values('a1111111-0000-0000-0000-000000000001','c1111111-0000-0000-0000-000000000001','a1111111-0000-0000-0000-000000000001')$q$)
    then raise exception 'FAIL: legacy patient PL should be able to message C1'; end if;
  raise notice 'ok: legacy PL can message C1';
  if not insert_blocked('e4444444-0000-0000-0000-000000000004', $q$insert into messages(patient_id,clinician_id,sender_id) values('e4444444-0000-0000-0000-000000000004','c1111111-0000-0000-0000-000000000001','e4444444-0000-0000-0000-000000000004')$q$)
    then raise exception 'FAIL: unrelated patient PN must NOT message C1'; end if;
  raise notice 'ok: unrelated PN blocked from messaging C1';
  if insert_blocked('c2222222-0000-0000-0000-000000000002', $q$insert into messages(patient_id,clinician_id,sender_id) values('b2222222-0000-0000-0000-000000000002','c2222222-0000-0000-0000-000000000002','c2222222-0000-0000-0000-000000000002')$q$)
    then raise exception 'FAIL: consent clinician C2 should message PC'; end if;
  raise notice 'ok: consent C2 can message PC';
  if not insert_blocked('c2222222-0000-0000-0000-000000000002', $q$insert into messages(patient_id,clinician_id,sender_id) values('a1111111-0000-0000-0000-000000000001','c2222222-0000-0000-0000-000000000002','c2222222-0000-0000-0000-000000000002')$q$)
    then raise exception 'FAIL: C2 must NOT message unrelated PL'; end if;
  raise notice 'ok: C2 blocked from messaging unrelated PL';
end $$;

-- ══ BACKFILL (mirrors the migration) — then assert idempotency + convergence ══
insert into clinician_patient_relationships (clinician_id, patient_id, status, initiated_by, request_message, requested_at, responded_at)
select p.assigned_clinician_id, p.id, 'active', 'clinician', 'legacy_assigned_clinician_backfill', now(), now()
from profiles p
where p.assigned_clinician_id is not null and p.role='patient'
  and not exists (select 1 from clinician_patient_relationships r where r.clinician_id=p.assigned_clinician_id and r.patient_id=p.id)
on conflict (clinician_id, patient_id) do nothing;
insert into relationship_permissions (relationship_id, permission_key, granted, granted_at)
select r.id, k.key, true, now()
from clinician_patient_relationships r
join profiles p on p.id=r.patient_id and p.assigned_clinician_id=r.clinician_id
cross join (values ('view_profile'),('view_assessment_results'),('view_assessment_history'),('view_reports'),
  ('view_progress_tracking'),('view_mood_tracking'),('export_reports'),('message_patient'),
  ('upload_documents'),('generate_clinical_notes')) as k(key)
where r.status='active'
on conflict (relationship_id, permission_key) do nothing;

do $$
declare rel_count bigint; perm_count bigint;
begin
  select count(*) into rel_count from clinician_patient_relationships
    where clinician_id='c1111111-0000-0000-0000-000000000001' and patient_id='a1111111-0000-0000-0000-000000000001' and status='active';
  if rel_count <> 1 then raise exception 'FAIL: backfill did not create PL→C1 relationship (got %)', rel_count; end if;
  raise notice 'ok: backfill created active PL→C1 relationship';
  -- Now consent path alone (no legacy) authorizes PL — prove via check_relationship_permission
  if not check_relationship_permission('c1111111-0000-0000-0000-000000000001','a1111111-0000-0000-0000-000000000001','view_assessment_results')
    then raise exception 'FAIL: backfilled relationship should grant view_assessment_results'; end if;
  raise notice 'ok: backfilled PL relationship grants modern permissions';
  select count(*) into perm_count from relationship_permissions rp
    join clinician_patient_relationships r on r.id=rp.relationship_id
    where r.clinician_id='c1111111-0000-0000-0000-000000000001' and r.patient_id='a1111111-0000-0000-0000-000000000001';
  if perm_count <> 10 then raise exception 'FAIL: expected 10 permission grants for backfilled PL, got %', perm_count; end if;
  raise notice 'ok: backfilled PL granted full 10-permission set';
end $$;

-- Idempotency: re-run the backfill; counts must not change (no duplicates)
insert into clinician_patient_relationships (clinician_id, patient_id, status, initiated_by, request_message, requested_at, responded_at)
select p.assigned_clinician_id, p.id, 'active', 'clinician', 'legacy_assigned_clinician_backfill', now(), now()
from profiles p
where p.assigned_clinician_id is not null and p.role='patient'
  and not exists (select 1 from clinician_patient_relationships r where r.clinician_id=p.assigned_clinician_id and r.patient_id=p.id)
on conflict (clinician_id, patient_id) do nothing;

do $$
declare rel_count bigint;
begin
  select count(*) into rel_count from clinician_patient_relationships
    where clinician_id='c1111111-0000-0000-0000-000000000001' and patient_id='a1111111-0000-0000-0000-000000000001';
  if rel_count <> 1 then raise exception 'FAIL: backfill not idempotent — duplicated PL relationship (got %)', rel_count; end if;
  raise notice 'ok: backfill is idempotent (no duplicate on re-run)';
  -- Legacy access still works after backfill (assigned_clinician_id preserved)
  perform assert_count('c1111111-0000-0000-0000-000000000001', $q$select count(*) from assessment_submissions where patient_id='a1111111-0000-0000-0000-000000000001'$q$, 1, 'post-backfill: C1 still reads PL submission');
end $$;

select 'ALL AUTHORIZATION CONSOLIDATION ASSERTIONS PASSED' as result;
