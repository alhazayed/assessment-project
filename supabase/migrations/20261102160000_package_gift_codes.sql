-- Gift codes: a package bought for someone else. The buyer pays; the
-- recipient gets a one-time code by email and redeems it on their own account.
-- Only a SHA-256 of the code is stored. Service-role access only (no RLS
-- policies): the app reads and writes this table from server routes.

create table if not exists public.package_gift_codes (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id),
  payment_id uuid not null unique references public.payments(id),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  recipient_email text not null check (length(recipient_email) <= 254),
  code_hash text unique,
  code_hint text,
  emailed_at timestamptz,
  redeemed_by uuid references public.profiles(id) on delete set null,
  redeemed_at timestamptz,
  redeemed_purchase_id uuid references public.package_purchases(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists package_gift_codes_buyer_idx on public.package_gift_codes (buyer_id);
create index if not exists package_gift_codes_redeemed_by_idx on public.package_gift_codes (redeemed_by);
create index if not exists package_gift_codes_package_idx on public.package_gift_codes (package_id);

alter table public.package_gift_codes enable row level security;
revoke all on public.package_gift_codes from anon, authenticated;

-- Atomic redemption. Locks the code row, refuses a used code, refuses a user
-- who already owns the package (the code stays unused so they can pass it on),
-- then grants a permanent purchase and marks the code used.
create or replace function public.redeem_package_gift_code(p_code_hash text, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.package_gift_codes%rowtype;
  v_purchase_id uuid;
begin
  select * into g from public.package_gift_codes where code_hash = p_code_hash for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if g.redeemed_at is not null then
    return jsonb_build_object('ok', false, 'reason',
      case when g.redeemed_by = p_user_id then 'already_redeemed_by_you' else 'used' end,
      'package_id', g.package_id);
  end if;
  if exists (
    select 1 from public.package_purchases
     where user_id = p_user_id and package_id = g.package_id and status = 'active'
       and (expires_at is null or expires_at > now())
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_owned', 'package_id', g.package_id);
  end if;

  insert into public.package_purchases (user_id, package_id, payment_id, status, access_level, purchased_at, expires_at)
  values (p_user_id, g.package_id, g.payment_id, 'active', 'full', now(), null)
  returning id into v_purchase_id;

  update public.package_gift_codes
     set redeemed_by = p_user_id, redeemed_at = now(), redeemed_purchase_id = v_purchase_id
   where id = g.id;

  return jsonb_build_object('ok', true, 'package_id', g.package_id);
end;
$$;

revoke all on function public.redeem_package_gift_code(text, uuid) from public, anon, authenticated;
grant execute on function public.redeem_package_gift_code(text, uuid) to service_role;
