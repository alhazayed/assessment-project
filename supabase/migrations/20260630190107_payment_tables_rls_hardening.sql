-- Migration: Security hardening for payment tables
-- Date: 2026-06-30
-- Purpose: Close gaps flagged by the Supabase security advisor after the
--          payment-system tables were created:
--   1. stripe_products / stripe_prices were exposed to PostgREST with RLS
--      DISABLED (ERROR) — lock them to superadmin only.
--   2. promo_code_usage had RLS enabled but no policies — add explicit ones.
--   3. increment_promo_code_usage had a mutable search_path and was executable
--      by anon/authenticated — pin search_path and restrict execution.

-- 1. stripe_products / stripe_prices — enable RLS, superadmin-only management.
ALTER TABLE public.stripe_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_can_manage_stripe_products" ON public.stripe_products;
CREATE POLICY "superadmin_can_manage_stripe_products"
  ON public.stripe_products FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin');

DROP POLICY IF EXISTS "superadmin_can_manage_stripe_prices" ON public.stripe_prices;
CREATE POLICY "superadmin_can_manage_stripe_prices"
  ON public.stripe_prices FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin');

-- 2. promo_code_usage — explicit read policies (writes happen via service role).
DROP POLICY IF EXISTS "users_can_view_own_promo_usage" ON public.promo_code_usage;
CREATE POLICY "users_can_view_own_promo_usage"
  ON public.promo_code_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "superadmin_can_view_all_promo_usage" ON public.promo_code_usage;
CREATE POLICY "superadmin_can_view_all_promo_usage"
  ON public.promo_code_usage FOR SELECT TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin');

-- 3. increment_promo_code_usage — pin search_path, restrict execution to the
--    service role (the webhook handler), which is the only caller.
CREATE OR REPLACE FUNCTION increment_promo_code_usage(code_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
begin
  update public.promo_codes
  set current_uses = coalesce(current_uses, 0) + 1,
      updated_at = now()
  where id = code_id;
end;
$$;

-- Revoke the implicit PUBLIC execute grant (CREATE OR REPLACE re-adds it), then
-- restrict execution to the service role (the webhook handler) only.
REVOKE EXECUTE ON FUNCTION increment_promo_code_usage(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION increment_promo_code_usage(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_promo_code_usage(uuid) TO service_role;
