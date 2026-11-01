-- Promo code redemption fixes (promo code audit, 2026-11-01).
--
-- 1. One redemption per customer per code, enforced by a unique index.
-- 2. redeem_promo_code(): records the usage row and bumps current_uses in one
--    transaction, and does nothing if this customer already redeemed the code.
--    Replaces the webhook's separate insert + increment_promo_code_usage call,
--    which could double-count on a retry and ignored errors.
-- 3. Sanity checks on promo_codes values (percent 1-100, positive amounts and
--    limits) so a bad row can't be created by any path.
--
-- Safe to re-run.

-- 1. One use per customer per code. Drop exact duplicates first (keeps the
--    earliest) so the index can be built on existing data.
DELETE FROM public.promo_code_usage u
USING public.promo_code_usage d
WHERE u.promo_code_id = d.promo_code_id
  AND u.user_id = d.user_id
  AND (u.used_at, u.id) > (d.used_at, d.id);

CREATE UNIQUE INDEX IF NOT EXISTS promo_code_usage_code_user_key
  ON public.promo_code_usage (promo_code_id, user_id);

-- 2. Atomic, idempotent redemption.
CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  p_code_id uuid,
  p_user_id uuid,
  p_payment_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.promo_code_usage (promo_code_id, user_id, transaction_id)
  VALUES (p_code_id, p_user_id, p_payment_id)
  ON CONFLICT (promo_code_id, user_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN false; -- already redeemed by this customer
  END IF;

  UPDATE public.promo_codes
  SET current_uses = coalesce(current_uses, 0) + 1,
      updated_at = now()
  WHERE id = p_code_id;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(uuid, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(uuid, uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(uuid, uuid, uuid) TO service_role;

-- 3. Value checks on new and updated rows. NOT VALID skips checking old rows
--    so this can't fail on legacy data.
ALTER TABLE public.promo_codes DROP CONSTRAINT IF EXISTS promo_codes_discount_value_check;
ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_discount_value_check CHECK (
  discount_value IS NULL
  OR (discount_type = 'percentage' AND discount_value BETWEEN 1 AND 100)
  OR (discount_type <> 'percentage' AND discount_value > 0)
) NOT VALID;

ALTER TABLE public.promo_codes DROP CONSTRAINT IF EXISTS promo_codes_max_uses_check;
ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_max_uses_check CHECK (
  max_uses IS NULL OR max_uses > 0
) NOT VALID;
