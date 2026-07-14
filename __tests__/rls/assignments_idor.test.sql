-- Assignments IDOR regression test — runs against a throwaway Postgres.
-- Proves the FIXED `assign_read` policy stops a clinician from reading arbitrary
-- patients' assignments while preserving every legitimate read path.
--
-- Policy mirrored verbatim from:
--   supabase/migrations/20260714120000_fix_assignments_idor.sql
-- Helpers mirrored from:
--   supabase/migrations/20260619120000_schema_baseline.sql            (get_my_role)
--   supabase/migrations/20260624120000_clinician_patient_consent_system.sql (check_relationship_permission)
-- Keep them in sync if those migrations change.
--
-- Run:  bash __tests__/rls/run.sh assignments_idor.test.sql
-- Any failed assertion RAISEs an exception → non-zero psql exit.

\set ON_ERROR_STOP on

-- ── Supabase-provided objects the policies assume ─────────────────────────────
create extension if not exists pgcrypto;
do $$ begin create role anon; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin create role service_role bypassrls; exception when duplicate_object then null; end $$;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;

-- ── Minimal schema mirroring columns the policy references ────────────────────
drop table if exists assessment_assignments, relationship_permissions, clinician_patient_relationships, profiles cascade;
create table profiles (
  id uuid primary key,
  role text not null default 'patient',
  assigned_clinician_id uuid
);
create table clinician_patient_relationships (
  id uuid primary key default gen_random_uuid(),
  clinician_id uuid not null,
  patient_id uuid not null,
  status text not null
);
create table relationship_permissions (
  relationship_id uuid not null references clinician_patient_relationships(id),
  permission_key text not null,
  granted boolean not null default false
);
create table assessment_assignments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  clinician_id uuid not null,
  status text default 'pending'
);
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ── Helper functions (mirrored from migrations) ───────────────────────────────
create or replace function public.get_my_role() returns text
  language sql stable security definer set search_path to 'public' as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.check_relationship_permission(
  p_clinician_id uuid, p_patient_id uuid, p_permission text
) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.clinician_patient_relationships cpr
    join public.relationship_permissions rp on rp.relationship_id = cpr.id
    where cpr.clinician_id  = p_clinician_id
      and cpr.patient_id    = p_patient_id
      and cpr.status        = 'active'
      and rp.permission_key = p_permission
      and rp.granted        = true
  );
$$;

-- ── The FIXED assign_read policy (verbatim) ───────────────────────────────────
alter table assessment_assignments enable row level security;
create policy assign_read on assessment_assignments for select
  using (
    ((select auth.uid()) = patient_id)
    or (get_my_role() = any (array['admin', 'superadmin']))
    or (
      get_my_role() = 'clinician'
      and (
        clinician_id = (select auth.uid())
        or exists (
          select 1 from public.profiles p
          where p.id = assessment_assignments.patient_id
            and p.assigned_clinician_id = (select auth.uid())
        )
        or public.check_relationship_permission((select auth.uid()), patient_id, 'view_assessment_history')
      )
    )
  );

-- ── Seed ──────────────────────────────────────────────────────────────────────
-- C1 = clinician with a LEGACY-assigned patient P1
-- C2 = clinician with a CONSENT relationship to patient P2 (view_assessment_history granted)
-- P3 = patient with NO clinician relationship; assignment authored by admin
insert into profiles(id, role, assigned_clinician_id) values
 ('cccccccc-0000-0000-0000-000000000001','clinician', null),          -- C1
 ('cccccccc-0000-0000-0000-000000000002','clinician', null),          -- C2
 ('aaaaaaaa-0000-0000-0000-000000000001','patient','cccccccc-0000-0000-0000-000000000001'), -- P1 legacy→C1
 ('bbbbbbbb-0000-0000-0000-000000000002','patient', null),            -- P2 consent→C2
 ('dddddddd-0000-0000-0000-000000000003','patient', null),            -- P3 no relationship
 ('eeeeeeee-0000-0000-0000-000000000009','admin',  null);             -- A admin

-- P2 grants C2 an active relationship with view_assessment_history
insert into clinician_patient_relationships(id, clinician_id, patient_id, status) values
 ('11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000002','active');
insert into relationship_permissions(relationship_id, permission_key, granted) values
 ('11111111-1111-1111-1111-111111111111','view_assessment_history', true);

-- One assignment per patient. P1's is authored by C1 (covers the authorship +
-- legacy paths); P2's and P3's are authored by the admin so that C2's ONLY route
-- to P2 is the active consent relationship — letting us prove revocation cuts it
-- off, and that C1/C2 cannot reach a row they neither authored nor are related to.
insert into assessment_assignments(patient_id, clinician_id) values
 ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001'), -- P1 by C1
 ('bbbbbbbb-0000-0000-0000-000000000002','eeeeeeee-0000-0000-0000-000000000009'), -- P2 by admin (C2 sees via consent only)
 ('dddddddd-0000-0000-0000-000000000003','eeeeeeee-0000-0000-0000-000000000009'); -- P3 by admin

-- ── Assertions ────────────────────────────────────────────────────────────────
create or replace function assert_count(claim_sub uuid, sql text, expected bigint, label text)
returns void language plpgsql as $$
declare got bigint;
begin
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub', claim_sub)::text, true);
  execute sql into got;
  reset role;
  if got is distinct from expected then
    raise exception 'FAIL: % — expected %, got %', label, expected, got;
  end if;
  raise notice 'ok: %', label;
end $$;

do $$
begin
  -- IDOR is CLOSED: clinicians cannot read arbitrary patients' assignments
  perform assert_count('cccccccc-0000-0000-0000-000000000001',
    $q$select count(*) from assessment_assignments where patient_id='bbbbbbbb-0000-0000-0000-000000000002'$q$,
    0, 'C1 CANNOT read P2 assignment (no relationship) — IDOR closed');
  perform assert_count('cccccccc-0000-0000-0000-000000000001',
    $q$select count(*) from assessment_assignments where patient_id='dddddddd-0000-0000-0000-000000000003'$q$,
    0, 'C1 CANNOT read P3 assignment (no relationship) — IDOR closed');
  perform assert_count('cccccccc-0000-0000-0000-000000000002',
    $q$select count(*) from assessment_assignments where patient_id='aaaaaaaa-0000-0000-0000-000000000001'$q$,
    0, 'C2 CANNOT read P1 assignment (no relationship) — IDOR closed');

  -- Legitimate read paths PRESERVED
  perform assert_count('cccccccc-0000-0000-0000-000000000001',
    $q$select count(*) from assessment_assignments where patient_id='aaaaaaaa-0000-0000-0000-000000000001'$q$,
    1, 'C1 reads P1 assignment (legacy assigned_clinician_id)');
  perform assert_count('cccccccc-0000-0000-0000-000000000002',
    $q$select count(*) from assessment_assignments where patient_id='bbbbbbbb-0000-0000-0000-000000000002'$q$,
    1, 'C2 reads P2 assignment (active consent view_assessment_history)');
  perform assert_count('aaaaaaaa-0000-0000-0000-000000000001',
    'select count(*) from assessment_assignments', 1, 'patient P1 reads only own assignment');
  perform assert_count('bbbbbbbb-0000-0000-0000-000000000002',
    $q$select count(*) from assessment_assignments where patient_id='aaaaaaaa-0000-0000-0000-000000000001'$q$,
    0, 'patient P2 cannot read P1 assignment');
  perform assert_count('eeeeeeee-0000-0000-0000-000000000009',
    'select count(*) from assessment_assignments', 3, 'admin reads all assignments');
end $$;

-- Revoking consent must immediately cut off the clinician's read access.
do $$
begin
  update relationship_permissions set granted = false where permission_key = 'view_assessment_history';
  perform assert_count('cccccccc-0000-0000-0000-000000000002',
    $q$select count(*) from assessment_assignments where patient_id='bbbbbbbb-0000-0000-0000-000000000002'$q$,
    0, 'C2 loses P2 access once view_assessment_history is revoked');
end $$;

select 'ALL ASSIGNMENTS IDOR ASSERTIONS PASSED' as result;
