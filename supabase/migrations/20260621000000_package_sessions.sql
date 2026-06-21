-- ===================================================================
-- PACKAGE SESSIONS & RESULT UNIQUE CONSTRAINT
-- ===================================================================

-- Unique constraint on package_results so upsert works cleanly
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'package_results_unique'
  ) then
    alter table package_results add constraint package_results_unique unique (package_id, user_id);
  end if;
end $$;

-- Lightweight table tracking user progress through a package
create table if not exists package_sessions (
  id           uuid primary key default gen_random_uuid(),
  package_id   uuid not null references packages(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'in_progress'
                 check (status in ('in_progress', 'completed')),
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  result_id    uuid references package_results(id),
  constraint   package_sessions_unique unique (package_id, user_id)
);

alter table package_sessions enable row level security;

create policy "package_sessions_own"
  on package_sessions for all
  using (auth.uid() = user_id);

create policy "package_sessions_admin"
  on package_sessions for all
  using (exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin','superadmin')
  ));

create index if not exists idx_package_sessions_user on package_sessions(user_id);
create index if not exists idx_package_sessions_pkg  on package_sessions(package_id);
