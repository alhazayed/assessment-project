-- ===================================================================
-- BULK PACKAGE CODES (clinicians and employers)
--
-- A buyer can pay for 2–50 codes of one package in a single order. Each code
-- is a row in package_gift_codes (kind = 'bulk') with no recipient email: the
-- buyer hands the codes out (as client intake or to staff). Gifts keep working
-- as before (kind = 'gift', one row per payment, recipient email required).
--
-- Redemption needs no change: redeem_package_gift_code works per code row.
-- Idempotent: safe to run more than once.
-- ===================================================================

alter table public.package_gift_codes
  add column if not exists kind text not null default 'gift';
alter table public.package_gift_codes
  add column if not exists batch_index integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'package_gift_codes_kind_check') then
    alter table public.package_gift_codes add constraint package_gift_codes_kind_check
      check (kind in ('gift', 'bulk'));
  end if;
end $$;

-- Bulk codes have no recipient; a gift still must have one.
alter table public.package_gift_codes alter column recipient_email drop not null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'package_gift_codes_recipient_check') then
    alter table public.package_gift_codes add constraint package_gift_codes_recipient_check
      check (kind = 'bulk' or recipient_email is not null);
  end if;
end $$;

-- One payment can now own many codes: unique per (payment, position).
alter table public.package_gift_codes drop constraint if exists package_gift_codes_payment_id_key;
create unique index if not exists package_gift_codes_payment_batch_key
  on public.package_gift_codes (payment_id, batch_index);

create index if not exists package_gift_codes_buyer_kind_idx
  on public.package_gift_codes (buyer_id, kind);
