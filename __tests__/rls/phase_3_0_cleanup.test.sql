-- Phase 3.0 cleanup regression — throwaway Postgres.
-- Asserts the migration's intended end-state shape for profiles triggers,
-- messages SELECT policies, and absence of public.is_admin().
--
-- Mirrors: supabase/migrations/20260716210000_phase_3_0_db_cleanup.sql
-- Run: bash __tests__/rls/run.sh phase_3_0_cleanup.test.sql
-- (or ephemeral pg_ctl — see other __tests__/rls/*.test.sql)

\set ON_ERROR_STOP on

create extension if not exists pgcrypto;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid $$;

drop table if exists public.messages cascade;
drop table if exists public.profiles cascade;

create table public.profiles (
  id uuid primary key,
  role text not null default 'patient',
  updated_at timestamptz not null default now()
);

create or replace function public.prevent_role_self_escalation()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role then
    raise exception 'role change blocked in fixture';
  end if;
  return new;
end $$;

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Pre-cleanup duplicate pairs (as observed in production)
create trigger prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();
create trigger trg_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  clinician_id uuid not null,
  sender_id uuid not null,
  body text not null
);
alter table public.messages enable row level security;

create policy messages_read on public.messages for select
  using (((select auth.uid()) = patient_id) or ((select auth.uid()) = clinician_id));
create policy msg_participant_read on public.messages for select
  using ((patient_id = (select auth.uid())) or (clinician_id = (select auth.uid())));
create policy msg_admin_read on public.messages for select
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin','superadmin')));

create or replace function public.get_my_role()
returns text language sql stable security definer set search_path to 'public' as $$
  select role from public.profiles where id = auth.uid();
$$;
create or replace function public.is_admin()
returns boolean language sql stable set search_path to 'public' as $$
  select public.get_my_role() = any (array['admin','superadmin']);
$$;

-- Apply Phase 3.0 cleanup (verbatim intent of the migration)
drop trigger if exists prevent_role_escalation on public.profiles;
drop trigger if exists set_profiles_updated_at on public.profiles;
drop policy if exists msg_participant_read on public.messages;
drop function if exists public.is_admin();

do $$
declare
  n_trig int;
  n_sel int;
  has_is_admin boolean;
begin
  select count(*) into n_trig
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  where c.relname = 'profiles' and not t.tgisinternal;
  if n_trig <> 2 then
    raise exception 'FAIL: expected 2 profiles triggers, got %', n_trig;
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_prevent_role_escalation') then
    raise exception 'FAIL: canonical trg_prevent_role_escalation missing';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_profiles_updated_at') then
    raise exception 'FAIL: canonical trg_profiles_updated_at missing';
  end if;
  if exists (select 1 from pg_trigger where tgname in ('prevent_role_escalation','set_profiles_updated_at')) then
    raise exception 'FAIL: non-canonical duplicate profiles triggers still present';
  end if;
  raise notice 'ok: profiles triggers reduced to canonical trg_* pair';

  select count(*) into n_sel
  from pg_policies
  where schemaname = 'public' and tablename = 'messages' and cmd = 'SELECT';
  if n_sel <> 2 then
    raise exception 'FAIL: expected 2 messages SELECT policies, got %', n_sel;
  end if;
  if not exists (select 1 from pg_policies where tablename='messages' and policyname='messages_read') then
    raise exception 'FAIL: messages_read missing';
  end if;
  if not exists (select 1 from pg_policies where tablename='messages' and policyname='msg_admin_read') then
    raise exception 'FAIL: msg_admin_read missing';
  end if;
  if exists (select 1 from pg_policies where tablename='messages' and policyname='msg_participant_read') then
    raise exception 'FAIL: msg_participant_read should have been dropped';
  end if;
  raise notice 'ok: messages SELECT policies are messages_read + msg_admin_read only';

  select exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_admin'
  ) into has_is_admin;
  if has_is_admin then
    raise exception 'FAIL: public.is_admin() still exists';
  end if;
  raise notice 'ok: public.is_admin() removed';
end $$;

select 'ALL PHASE 3.0 CLEANUP ASSERTIONS PASSED' as result;
