import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_TIERS = ['basic', 'standard', 'professional'] as const

// Authoritative, server-side tier pricing in whole USD dollars. The client is
// NEVER trusted to supply the amount — doing so let a caller POST amount:0.01
// and receive full access. Prices mirror the checkout UI (app/(auth)/checkout).
const TIER_PRICES_USD: Record<(typeof VALID_TIERS)[number], number> = {
  basic: 9.99,
  standard: 24.99,
  professional: 49.99,
}

/**
 * Apply a validated promo discount to a base price, clamped to >= 0.
 * discount_type values written by the admin API: 'percentage' | 'fixed_amount' | 'free'.
 */
function applyDiscount(base: number, discountType: string | null, discountValue: number | null): number {
  if (!discountType) return base
  if (discountType === 'free') return 0
  if (discountValue == null) return base
  const discounted =
    discountType === 'percentage'
      ? base * (1 - discountValue / 100)
      : base - discountValue // fixed_amount discount
  return Math.max(0, Math.round(discounted * 100) / 100)
}

/**
 * POST /api/checkout/create-session
 *
 * Create a Stripe checkout session for a subscription tier purchase.
 * Validates promo codes and applies discounts, then records a pending
 * payment that the Stripe webhook fulfils once payment succeeds.
 *
 * NOTE: Stripe is mocked here until live API keys are configured. The mock
 * still writes a correctly-shaped payment row (with a payment intent id) so
 * the webhook flow can be exercised end to end.
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'User must be authenticated' },
        { status: 401 }
      )
    }

    // Payment/promo tables are intentionally RLS-locked so users cannot write
    // their own payment rows or read promo codes directly. This endpoint has
    // already authenticated the user and computes the amount server-side, so it
    // performs those controlled operations with the service-role client.
    const db = createAdminClient()

    const body = await request.json()
    // NOTE: any client-supplied `amount` is deliberately ignored. The charge
    // amount is derived server-side from the tier price and validated promo.
    const { packageId, promoCode } = body

    // Validate input — packageId here is a subscription tier.
    if (!packageId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!VALID_TIERS.includes(packageId)) {
      return NextResponse.json(
        { error: 'Invalid package tier' },
        { status: 400 }
      )
    }

    const basePrice = TIER_PRICES_USD[packageId as (typeof VALID_TIERS)[number]]

    // Validate promo code if provided, and capture its discount for server-side
    // price computation.
    let promoCodeId: string | null = null
    let discountType: string | null = null
    let discountValue: number | null = null
    if (promoCode) {
      const { data: code } = await db
        .from('promo_codes')
        .select('id, code, discount_type, discount_value, max_uses, current_uses, valid_from, valid_until, active')
        .eq('code', promoCode.toUpperCase())
        .eq('active', true)
        .maybeSingle()

      if (!code) {
        return NextResponse.json(
          { error: 'Invalid promo code' },
          { status: 400 }
        )
      }

      const now = new Date()
      if (code.valid_from && new Date(code.valid_from) > now) {
        return NextResponse.json(
          { error: 'Promo code is not yet active' },
          { status: 400 }
        )
      }
      if (code.valid_until && new Date(code.valid_until) < now) {
        return NextResponse.json(
          { error: 'Promo code has expired' },
          { status: 400 }
        )
      }
      if (code.max_uses && (code.current_uses ?? 0) >= code.max_uses) {
        return NextResponse.json(
          { error: 'Promo code usage limit reached' },
          { status: 400 }
        )
      }

      promoCodeId = code.id
      discountType = code.discount_type
      discountValue = code.discount_value
    }

    // Final charge amount is computed entirely server-side.
    const amount = applyDiscount(basePrice, discountType, discountValue)

    // TODO: Replace with a real Stripe PaymentIntent when live keys exist.
    const rand = () => Math.random().toString(36).substring(2, 12)
    const mockIntentId = `pi_test_${rand()}`
    const mockClientSecret = `${mockIntentId}_secret_${rand()}`
    const mockSessionId = `cs_test_${rand()}`

    // Server-computed amount in dollars; persist in cents.
    const amountCents = Math.round(amount * 100)

    // Create a pending payment record. package_id is null for tier
    // subscriptions (tiers are not rows in the packages catalog).
    const { data: payment, error: paymentError } = await db
      .from('payments')
      .insert({
        user_id: user.id,
        package_id: null,
        tier: packageId,
        amount_cents: amountCents,
        currency: 'usd',
        status: 'pending',
        stripe_payment_intent_id: mockIntentId,
        stripe_session_id: mockSessionId,
        stripe_client_secret: mockClientSecret,
        promo_code_id: promoCodeId,
        metadata: {
          promoCode: promoCode || null,
          basePrice,
          finalAmount: amount,
        },
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Payment creation error:', paymentError)
      return NextResponse.json(
        { error: 'Failed to create payment session' },
        { status: 500 }
      )
    }

    // Promo usage is recorded by the webhook on successful payment, so an
    // abandoned checkout never consumes a use.

    return NextResponse.json({
      success: true,
      sessionId: mockSessionId,
      clientSecret: mockClientSecret,
      paymentId: payment.id,
    })
  } catch (error) {
    console.error('Checkout session error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
