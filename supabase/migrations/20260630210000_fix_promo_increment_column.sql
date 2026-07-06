-- Migration: Fix promo code usage increment column
-- Date: 2026-06-30
-- Purpose: The promo_codes table uses `current_uses`, not `times_used`.
--          Correct the increment function so usage tracking works.

create or replace function increment_promo_code_usage(code_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.promo_codes
  set current_uses = coalesce(current_uses, 0) + 1,
      updated_at = now()
  where id = code_id;
end;
$$;

grant execute on function increment_promo_code_usage(uuid) to authenticated, anon, service_role;
