-- RLS cross-user isolation test — runs against a throwaway Postgres.
-- Validates the *authorization* core of authenticated flows without needing a
-- live Supabase/Auth stack: proves user A cannot read user B's payments,
-- clinical notes, or messages under the real shipped RLS policies.
--
-- Policies below are mirrored verbatim from:
--   supabase/migrations/20260630120000_packages_payment_system.sql   (payments, package_purchases)
--   supabase/migrations/20260624190200_clinical_notes_and_messages_rls.sql (clinical_notes, messages)
-- Keep them in sync if those migrations change.
--
-- Run:  bash __tests__/rls/run.sh   (boots ephemeral PG, applies this, asserts)
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

-- ── Minimal schema mirroring columns the policies reference ───────────────────
drop table if exists payments, package_purchases, clinical_notes, messages, profiles cascade;
create table profiles (id uuid primary key, role text not null default 'patient');
create table payments (id uuid primary key default gen_random_uuid(), user_id uuid not null, amount_cents int);
create table package_purchases (id uuid primary key default gen_random_uuid(), user_id uuid not null, status text);
create table clinical_notes (id uuid primary key default gen_random_uuid(), patient_id uuid, clinician_id uuid, body text);
create table messages (id uuid primary key default gen_random_uuid(), patient_id uuid, clinician_id uuid, body text);
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ── Real shipped policies (verbatim) ──────────────────────────────────────────
alter table payments enable row level security;
create policy "users_can_view_own_payments" on payments for select to authenticated using (user_id = auth.uid());
create policy "superadmin_can_view_all_payments" on payments for select to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'superadmin'));
alter table package_purchases enable row level security;
create policy "users_can_view_own_purchases" on package_purchases for select to authenticated using (user_id = auth.uid());
alter table clinical_notes enable row level security;
create policy "cn_clinician_own" on clinical_notes for all to authenticated
  using (clinician_id = (select auth.uid())) with check (clinician_id = (select auth.uid()));
create policy "cn_patient_read" on clinical_notes for select to authenticated using (patient_id = (select auth.uid()));
create policy "cn_admin_read" on clinical_notes for select to authenticated
  using (exists (select 1 from profiles where id = (select auth.uid()) and role in ('admin','superadmin')));
alter table messages enable row level security;
create policy "msg_participant_read" on messages for select to authenticated
  using (patient_id = (select auth.uid()) or clinician_id = (select auth.uid()));

-- ── Seed ──────────────────────────────────────────────────────────────────────
insert into profiles(id, role) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','patient'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','patient'),
 ('cccccccc-cccc-cccc-cccc-cccccccccccc','clinician'),
 ('dddddddd-dddd-dddd-dddd-dddddddddddd','admin');
insert into payments(user_id, amount_cents) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',999),('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',4999);
insert into clinical_notes(patient_id, clinician_id, body) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','cccccccc-cccc-cccc-cccc-cccccccccccc','A note by C');
insert into messages(patient_id, clinician_id, body) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','cccccccc-cccc-cccc-cccc-cccccccccccc','hello A<->C');

-- ── Assertions (each RAISEs on failure) ───────────────────────────────────────
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
  perform assert_count('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','select count(*) from payments',1,'A sees only own payment');
  perform assert_count('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',$q$select count(*) from payments where user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$q$,0,'A cannot see B payment');
  perform assert_count('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','select count(*) from payments',1,'B sees only own payment');
  perform assert_count('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','select count(*) from clinical_notes',1,'patient A reads own note');
  perform assert_count('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','select count(*) from clinical_notes',0,'patient B cannot read A note');
  perform assert_count('cccccccc-cccc-cccc-cccc-cccccccccccc','select count(*) from clinical_notes',1,'clinician C reads own note');
  perform assert_count('dddddddd-dddd-dddd-dddd-dddddddddddd','select count(*) from clinical_notes',1,'admin D reads note');
  perform assert_count('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','select count(*) from messages',1,'participant A reads message');
  perform assert_count('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','select count(*) from messages',0,'non-participant B cannot read message');
  perform assert_count('cccccccc-cccc-cccc-cccc-cccccccccccc','select count(*) from messages',1,'participant C reads message');
end $$;

-- WITH CHECK: patient A forging a note attributed to clinician C must be blocked.
do $$
declare blocked boolean := false;
begin
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims','{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}',true);
  begin
    insert into clinical_notes(patient_id,clinician_id,body)
      values('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','cccccccc-cccc-cccc-cccc-cccccccccccc','forged');
  exception when insufficient_privilege then blocked := true;
  end;
  reset role;
  if not blocked then raise exception 'FAIL: A was able to forge a note as clinician C (WITH CHECK not enforced)'; end if;
  raise notice 'ok: WITH CHECK blocks forged authorship';
end $$;

select 'ALL RLS ISOLATION ASSERTIONS PASSED' as result;
