-- F-0 regression test — throwaway Postgres.
-- Proves handle_new_user() clamps every signup to role='patient', so a client
-- cannot self-assign clinician/admin/superadmin via signup metadata.
--
-- Mirrors: supabase/migrations/20260716130000_harden_signup_role_assignment.sql
-- Run: bash __tests__/rls/run.sh signup_role_clamp.test.sql

\set ON_ERROR_STOP on

create extension if not exists pgcrypto;
create schema if not exists auth;

-- Minimal mirror of the objects the trigger touches
drop table if exists public.patient_profiles cascade;
drop table if exists public.profiles cascade;
drop table if exists auth.users cascade;
create table auth.users (id uuid primary key default gen_random_uuid(), raw_user_meta_data jsonb);
create table public.profiles (
  id uuid primary key,
  role text not null check (role in ('patient','clinician','admin','superadmin')),
  full_name_en text
);
create table public.patient_profiles (id uuid primary key);

-- Function + trigger (verbatim from the migration)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'patient');
  if v_role is distinct from 'patient' then v_role := 'patient'; end if;
  insert into public.profiles (id, role, full_name_en)
  values (new.id, v_role, coalesce(new.raw_user_meta_data->>'full_name_en',''))
  on conflict (id) do nothing;
  insert into public.patient_profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end; $$;

create trigger trg_on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: insert an auth user with given metadata, return the resulting role
create or replace function signup_role(meta jsonb) returns text language plpgsql as $$
declare uid uuid; got text;
begin
  uid := gen_random_uuid();
  insert into auth.users(id, raw_user_meta_data) values (uid, meta);
  select role into got from public.profiles where id = uid;
  return got;
end; $$;

do $$
begin
  -- Attack payloads must all be clamped to 'patient'
  if signup_role('{"role":"superadmin"}')      <> 'patient' then raise exception 'FAIL: superadmin self-assign not blocked'; end if;
  raise notice 'ok: signup role=superadmin -> clamped to patient';
  if signup_role('{"role":"admin"}')           <> 'patient' then raise exception 'FAIL: admin self-assign not blocked'; end if;
  raise notice 'ok: signup role=admin -> clamped to patient';
  if signup_role('{"role":"clinician"}')       <> 'patient' then raise exception 'FAIL: clinician self-assign not blocked'; end if;
  raise notice 'ok: signup role=clinician -> clamped to patient';
  if signup_role('{"role":"garbage"}')         <> 'patient' then raise exception 'FAIL: junk role not clamped'; end if;
  raise notice 'ok: signup role=garbage -> clamped to patient';
  -- Legitimate signups still work (no role, or explicit patient)
  if signup_role('{"full_name_en":"Jane"}')    <> 'patient' then raise exception 'FAIL: default role not patient'; end if;
  raise notice 'ok: signup with no role -> patient (default preserved)';
  if signup_role('{"role":"patient"}')         <> 'patient' then raise exception 'FAIL: explicit patient rejected'; end if;
  raise notice 'ok: signup role=patient -> patient';
  -- patient_profiles bootstrap still happens
  if (select count(*) from public.patient_profiles) <> 6 then raise exception 'FAIL: patient_profiles not bootstrapped for all signups'; end if;
  raise notice 'ok: patient_profiles row created for every signup';
end $$;

select 'ALL SIGNUP ROLE-CLAMP ASSERTIONS PASSED' as result;
