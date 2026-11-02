-- ===================================================================
-- INDIVIDUAL PACKAGE PURCHASES
--
-- 1. packages.price_cents: the one-time price of a package. NULL means the
--    package is not for sale (no buy button, checkout refuses it).
-- 2. Starting prices for the six profile packages. Only fills packages
--    that have no price yet, so re-running never overwrites an admin edit.
-- 3. package_results can only be written by the server. The compute route
--    writes with the service-role client after checking the purchase; the
--    old "own insert/update" policies let a signed-in user write their own
--    result row directly and skip the paywall.
--
-- Idempotent: safe to run more than once.
-- ===================================================================

alter table packages add column if not exists price_cents integer;
alter table packages add column if not exists currency text not null default 'usd';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'packages_price_cents_check') then
    alter table packages add constraint packages_price_cents_check
      check (price_cents is null or (price_cents >= 100 and price_cents <= 100000));
  end if;
end $$;

-- 2. Starting prices (USD cents).
update packages p
   set price_cents = v.price_cents, updated_at = now()
  from (values
    ('mental_health_checkup',   1900),
    ('stress_burnout_recovery', 2900),
    ('personal_growth',         2900),
    ('mood_clarity',            2900),
    ('relationship_readiness',  3900),
    ('athlete_performance',     3900)
  ) as v(profile_key, price_cents)
 where p.profile_key = v.profile_key
   and p.price_cents is null;

-- Fast access checks: "does this user own this package?"
create index if not exists idx_package_purchases_user_package
  on package_purchases(user_id, package_id) where package_id is not null;

-- 3. Server-only writes to package_results.
drop policy if exists package_results_own_insert on package_results;
drop policy if exists package_results_own_update on package_results;
