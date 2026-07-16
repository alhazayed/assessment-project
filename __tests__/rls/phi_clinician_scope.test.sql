-- Phase 2.4 F-1 regression test — throwaway Postgres.
-- Proves the rewritten clinician SELECT policies on PHI tables now require an
-- authorized relationship (has_clinician_access) instead of bare clinician role,
-- while preserving patient-owner and admin/superadmin access.
--
-- Mirrors verbatim: supabase/migrations/20260716120000_scope_clinician_phi_rls_to_relationship.sql
-- Helpers mirror 20260624120000 (check_relationship_permission) + 20260715120000 (has_clinician_access) + baseline (get_my_role).
--
-- Run: bash __tests__/rls/run.sh phi_clinician_scope.test.sql

\set ON_ERROR_STOP on

create extension if not exists pgcrypto;
do $$ begin create role anon; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid $$;
grant usage on schema auth to anon, authenticated;

drop table if exists pdf_reports, patient_profiles, journal_entries,
  relationship_permissions, clinician_patient_relationships, profiles cascade;
create table profiles (id uuid primary key, role text not null default 'patient', assigned_clinician_id uuid);
create table clinician_patient_relationships (id uuid primary key default gen_random_uuid(),
  clinician_id uuid not null, patient_id uuid not null, status text not null, unique(clinician_id,patient_id));
create table relationship_permissions (relationship_id uuid not null references clinician_patient_relationships(id),
  permission_key text not null, granted boolean not null default false, unique(relationship_id,permission_key));
create table pdf_reports (id uuid primary key default gen_random_uuid(), patient_id uuid not null);
create table patient_profiles (id uuid primary key);
create table journal_entries (id uuid primary key default gen_random_uuid(), patient_id uuid not null, is_shared boolean not null default false);
grant select, insert, update, delete on all tables in schema public to authenticated;

create or replace function public.get_my_role() returns text
  language sql stable security definer set search_path to 'public' as $$ select role from public.profiles where id = auth.uid(); $$;
create or replace function public.check_relationship_permission(p_clinician_id uuid, p_patient_id uuid, p_permission text)
  returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.clinician_patient_relationships cpr
    join public.relationship_permissions rp on rp.relationship_id=cpr.id
    where cpr.clinician_id=p_clinician_id and cpr.patient_id=p_patient_id and cpr.status='active'
      and rp.permission_key=p_permission and rp.granted=true); $$;
create or replace function public.has_clinician_access(p_clinician_id uuid, p_patient_id uuid, p_permission text)
  returns boolean language sql stable security definer set search_path=public as $$
  select public.check_relationship_permission(p_clinician_id,p_patient_id,p_permission)
    or exists (select 1 from public.profiles pr where pr.id=p_patient_id and pr.assigned_clinician_id=p_clinician_id); $$;

-- Owner policies (patient) + the REWRITTEN clinician policies (verbatim)
alter table pdf_reports enable row level security;
create policy pdf_reports_patient on pdf_reports for all using ((select auth.uid())=patient_id) with check ((select auth.uid())=patient_id);
create policy pdf_reports_clinician on pdf_reports for select using (
  get_my_role() = any (array['admin','superadmin'])
  or (get_my_role()='clinician' and public.has_clinician_access((select auth.uid()), pdf_reports.patient_id, 'view_reports')));

alter table patient_profiles enable row level security;
create policy patient_prof_own on patient_profiles for all using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy patient_prof_clinician on patient_profiles for select using (
  get_my_role() = any (array['admin','superadmin'])
  or (get_my_role()='clinician' and public.has_clinician_access((select auth.uid()), patient_profiles.id, 'view_profile')));

alter table journal_entries enable row level security;
create policy journal_own on journal_entries for all using ((select auth.uid())=patient_id) with check ((select auth.uid())=patient_id);
create policy journal_clinician_shared on journal_entries for select using (
  is_shared = true and (
    get_my_role() = any (array['admin','superadmin'])
    or (get_my_role()='clinician' and public.has_clinician_access((select auth.uid()), journal_entries.patient_id, 'view_progress_tracking'))));

-- Seed: C1 consented (view_reports+view_profile+view_progress_tracking) to P1; C2 unrelated; P2 unrelated patient
insert into profiles(id,role) values
 ('c1111111-0000-0000-0000-000000000001','clinician'),
 ('c2222222-0000-0000-0000-000000000002','clinician'),
 ('a1111111-0000-0000-0000-000000000001','patient'),
 ('b2222222-0000-0000-0000-000000000002','patient'),
 ('ad000000-0000-0000-0000-0000000000ad','admin');
insert into clinician_patient_relationships(id,clinician_id,patient_id,status) values
 ('11111111-1111-1111-1111-111111111111','c1111111-0000-0000-0000-000000000001','a1111111-0000-0000-0000-000000000001','active');
insert into relationship_permissions(relationship_id,permission_key,granted) values
 ('11111111-1111-1111-1111-111111111111','view_reports',true),
 ('11111111-1111-1111-1111-111111111111','view_profile',true),
 ('11111111-1111-1111-1111-111111111111','view_progress_tracking',true);
insert into pdf_reports(patient_id) values ('a1111111-0000-0000-0000-000000000001'),('b2222222-0000-0000-0000-000000000002');
insert into patient_profiles(id) values ('a1111111-0000-0000-0000-000000000001'),('b2222222-0000-0000-0000-000000000002');
insert into journal_entries(patient_id,is_shared) values
 ('a1111111-0000-0000-0000-000000000001',true),('a1111111-0000-0000-0000-000000000001',false);

create or replace function assert_count(claim_sub uuid, sql text, expected bigint, label text)
returns void language plpgsql as $$
declare got bigint;
begin
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',claim_sub)::text, true);
  execute sql into got; reset role;
  if got is distinct from expected then raise exception 'FAIL: % — expected %, got %', label, expected, got; end if;
  raise notice 'ok: %', label;
end $$;

do $$
begin
  -- IDOR closed: unrelated clinician C2 sees nothing
  perform assert_count('c2222222-0000-0000-0000-000000000002','select count(*) from pdf_reports',0,'C2 (unrelated) sees NO pdf_reports');
  perform assert_count('c2222222-0000-0000-0000-000000000002','select count(*) from patient_profiles',0,'C2 (unrelated) sees NO patient_profiles');
  perform assert_count('c2222222-0000-0000-0000-000000000002','select count(*) from journal_entries',0,'C2 (unrelated) sees NO journals');
  -- Consented clinician C1 sees ONLY P1
  perform assert_count('c1111111-0000-0000-0000-000000000001',$q$select count(*) from pdf_reports where patient_id='a1111111-0000-0000-0000-000000000001'$q$,1,'C1 reads P1 pdf_report (view_reports)');
  perform assert_count('c1111111-0000-0000-0000-000000000001','select count(*) from pdf_reports',1,'C1 sees ONLY P1 pdf_reports (not P2)');
  perform assert_count('c1111111-0000-0000-0000-000000000001','select count(*) from patient_profiles',1,'C1 reads P1 patient_profile only');
  perform assert_count('c1111111-0000-0000-0000-000000000001','select count(*) from journal_entries',1,'C1 reads P1 SHARED journal only (not private)');
  -- Patient owner preserved
  perform assert_count('a1111111-0000-0000-0000-000000000001','select count(*) from pdf_reports',1,'patient P1 reads own pdf_report');
  perform assert_count('a1111111-0000-0000-0000-000000000001','select count(*) from journal_entries',2,'patient P1 reads own journals (shared+private)');
  -- Admin preserved
  perform assert_count('ad000000-0000-0000-0000-0000000000ad','select count(*) from pdf_reports',2,'admin reads all pdf_reports');
  perform assert_count('ad000000-0000-0000-0000-0000000000ad','select count(*) from patient_profiles',2,'admin reads all patient_profiles');
end $$;

-- Revoking the grant cuts the consented clinician off
do $$
begin
  update relationship_permissions set granted=false where permission_key='view_reports';
  perform assert_count('c1111111-0000-0000-0000-000000000001','select count(*) from pdf_reports',0,'C1 loses pdf_reports once view_reports revoked');
end $$;

select 'ALL F-1 PHI CLINICIAN-SCOPE ASSERTIONS PASSED' as result;
