-- Migration: Payment webhook support & subscription tier model
-- Date: 2026-06-30
-- Purpose: Support Stripe webhook processing and the basic/standard/professional
--          subscription tiers, which are NOT rows in the packages catalog.

-- =============================================================================
-- PAYMENTS: subscription tier support
-- =============================================================================

-- The 3 pricing tiers (basic/standard/professional) are subscription products,
-- not entries in the assessment `packages` catalog. Allow package_id to be NULL
-- for tier-based subscription payments and record the tier explicitly.
ALTER TABLE public.payments
  ALTER COLUMN package_id DROP NOT NULL;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS tier text CHECK (tier IN ('basic', 'standard', 'professional'));

-- The checkout session id used while the PaymentIntent / Checkout Session is open.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_session_id text;

CREATE INDEX IF NOT EXISTS idx_payments_stripe_session_id
  ON public.payments(stripe_session_id);

-- =============================================================================
-- PACKAGE PURCHASES: subscription tier support
-- =============================================================================

ALTER TABLE public.package_purchases
  ALTER COLUMN package_id DROP NOT NULL;

ALTER TABLE public.package_purchases
  ADD COLUMN IF NOT EXISTS tier text CHECK (tier IN ('basic', 'standard', 'professional'));

-- =============================================================================
-- WEBHOOK EVENT LOG (idempotency)
-- =============================================================================

-- Stripe may deliver the same event more than once. We record every processed
-- event id so the handler can short-circuit duplicates.
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  payload jsonb,
  processed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id
  ON public.stripe_webhook_events(stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type
  ON public.stripe_webhook_events(event_type);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only the service role (webhook handler) writes here; superadmin can read.
CREATE POLICY "superadmin_can_view_webhook_events"
  ON public.stripe_webhook_events
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  );
