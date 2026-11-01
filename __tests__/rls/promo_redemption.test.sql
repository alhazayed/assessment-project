-- Promo code redemption: one use per customer, atomic counter, value checks.
-- Run: bash __tests__/rls/run.sh promo_redemption.test.sql
\set ON_ERROR_STOP 1

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
END $$;

-- Minimal copies of the production tables.
CREATE TABLE public.profiles (id uuid PRIMARY KEY);
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  code_type text NOT NULL CHECK (code_type IN ('free_use', 'discount')),
  discount_type text CHECK (discount_type IN ('percentage', 'fixed_amount', 'free')),
  discount_value integer,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  max_uses integer,
  current_uses integer DEFAULT 0,
  active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.promo_code_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  transaction_id uuid,
  used_at timestamptz DEFAULT now()
);

INSERT INTO public.profiles VALUES
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');
INSERT INTO public.promo_codes (id, code, code_type, discount_type, discount_value, created_by)
VALUES ('10000000-0000-0000-0000-000000000001', 'SAVE10', 'discount', 'percentage', 10,
        '00000000-0000-0000-0000-000000000001');
-- Legacy duplicate usage rows must not block the migration.
INSERT INTO public.promo_code_usage (promo_code_id, user_id, used_at) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', now() - interval '2 days'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', now() - interval '1 day');
UPDATE public.promo_codes SET current_uses = 2;

\ir ../../supabase/migrations/20261101170000_promo_code_redemption.sql
-- Re-runnable.
\ir ../../supabase/migrations/20261101170000_promo_code_redemption.sql

DO $$
DECLARE r boolean; n int;
BEGIN
  SELECT count(*) INTO n FROM promo_code_usage;
  ASSERT n = 1, 'duplicate legacy usage rows collapsed to one';

  r := redeem_promo_code('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', gen_random_uuid());
  ASSERT r, 'first redemption by a customer succeeds';
  SELECT current_uses INTO n FROM promo_codes WHERE code = 'SAVE10';
  ASSERT n = 3, 'first redemption bumps current_uses';

  r := redeem_promo_code('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', gen_random_uuid());
  ASSERT NOT r, 'second redemption by the same customer is a no-op';
  SELECT current_uses INTO n FROM promo_codes WHERE code = 'SAVE10';
  ASSERT n = 3, 'repeat redemption does not bump current_uses';

  ASSERT NOT has_function_privilege('authenticated', 'redeem_promo_code(uuid,uuid,uuid)', 'EXECUTE'), 'authenticated cannot redeem';
  ASSERT NOT has_function_privilege('anon', 'redeem_promo_code(uuid,uuid,uuid)', 'EXECUTE'), 'anon cannot redeem';
  ASSERT has_function_privilege('service_role', 'redeem_promo_code(uuid,uuid,uuid)', 'EXECUTE'), 'service_role can redeem';

  BEGIN
    INSERT INTO promo_codes (code, code_type, discount_type, discount_value, created_by)
    VALUES ('BAD150', 'discount', 'percentage', 150, '00000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'percentage over 100 was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO promo_codes (code, code_type, discount_type, discount_value, created_by, max_uses)
    VALUES ('BADMAX', 'discount', 'free', NULL, '00000000-0000-0000-0000-000000000001', 0);
    RAISE EXCEPTION 'max_uses 0 was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  INSERT INTO promo_codes (code, code_type, discount_type, discount_value, created_by)
  VALUES ('FIVEOFF', 'discount', 'fixed_amount', 500, '00000000-0000-0000-0000-000000000001');
  INSERT INTO promo_codes (code, code_type, created_by)
  VALUES ('FREEUSE', 'free_use', '00000000-0000-0000-0000-000000000001');

  RAISE NOTICE 'promo redemption: all assertions passed';
END $$;
