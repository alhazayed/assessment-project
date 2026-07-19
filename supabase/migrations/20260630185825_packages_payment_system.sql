-- Migration: Packages Payment System with Stripe & Promo Codes
-- Date: 2026-06-30
-- Purpose: Enable paid packages with Stripe integration and superadmin code management

-- =============================================================================
-- STRIPE PRODUCTS & PRICES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.stripe_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_product_id text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stripe_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_price_id text UNIQUE NOT NULL,
  stripe_product_id text NOT NULL REFERENCES public.stripe_products(stripe_product_id),
  package_id uuid REFERENCES public.packages(id),
  amount_cents integer NOT NULL,
  currency text DEFAULT 'usd',
  interval text DEFAULT 'one_time', -- one_time, month, year
  interval_count integer DEFAULT 1,
  active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- =============================================================================
-- PROMO & FREE USE CODES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  code_type text NOT NULL CHECK (code_type IN ('free_use', 'discount')),
  discount_type text CHECK (discount_type IN ('percentage', 'fixed_amount', 'free')),
  discount_value integer,
  description text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  max_uses integer,
  current_uses integer DEFAULT 0,
  valid_from timestamp with time zone DEFAULT now(),
  valid_until timestamp with time zone,
  active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- =============================================================================
-- PROMO CODE USAGE TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.promo_code_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  transaction_id uuid,
  used_at timestamp with time zone DEFAULT now()
);

-- =============================================================================
-- PAYMENTS & TRANSACTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id text UNIQUE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  package_id uuid NOT NULL REFERENCES public.packages(id),
  amount_cents integer NOT NULL,
  currency text DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
  payment_method text,
  promo_code_id uuid REFERENCES public.promo_codes(id),
  discount_applied_cents integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- =============================================================================
-- PACKAGE PURCHASES / SUBSCRIPTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.package_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  package_id uuid NOT NULL REFERENCES public.packages(id),
  payment_id uuid REFERENCES public.payments(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  access_level text DEFAULT 'full',
  purchased_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- =============================================================================
-- PACKAGE RESULTS (After Purchase)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.purchased_package_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  package_id uuid NOT NULL REFERENCES public.packages(id),
  package_purchase_id uuid NOT NULL REFERENCES public.package_purchases(id),
  responses jsonb NOT NULL,
  results jsonb NOT NULL,
  interpretation text,
  score integer,
  severity_level text,
  recommendations text[],
  saved_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- =============================================================================
-- RLS POLICIES: PAYMENTS & PURCHASES
-- =============================================================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchased_package_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "users_can_view_own_payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view their own purchases
CREATE POLICY "users_can_view_own_purchases"
  ON public.package_purchases
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view their own package results
CREATE POLICY "users_can_view_own_package_results"
  ON public.purchased_package_results
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Superadmin can view all payments
CREATE POLICY "superadmin_can_view_all_payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  );

-- Superadmin can view all purchases
CREATE POLICY "superadmin_can_view_all_purchases"
  ON public.package_purchases
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  );

-- Superadmin can manage promo codes
CREATE POLICY "superadmin_can_manage_promo_codes"
  ON public.promo_codes
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  );

-- =============================================================================
-- INDEXES FOR PAYMENT OPERATIONS
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_id ON public.payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_package_purchases_user_id ON public.package_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_package_purchases_status ON public.package_purchases(status);
CREATE INDEX IF NOT EXISTS idx_package_purchases_expires_at ON public.package_purchases(expires_at);

CREATE INDEX IF NOT EXISTS idx_purchased_results_user_id ON public.purchased_package_results(user_id);
CREATE INDEX IF NOT EXISTS idx_purchased_results_package_id ON public.purchased_package_results(package_id);
CREATE INDEX IF NOT EXISTS idx_purchased_results_created_at ON public.purchased_package_results(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_valid_until ON public.promo_codes(valid_until);

CREATE INDEX IF NOT EXISTS idx_promo_usage_code_id ON public.promo_code_usage(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_user_id ON public.promo_code_usage(user_id);

-- =============================================================================
-- STRIPE CONFIGURATION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.stripe_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_key text,
  webhook_secret text,
  configured boolean DEFAULT false,
  test_mode boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.stripe_configuration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "only_superadmin_can_access_stripe_config"
  ON public.stripe_configuration
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  );
