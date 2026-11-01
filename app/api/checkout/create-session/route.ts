import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { VALID_TIERS, TIER_PRICES_USD, isValidTier, applyDiscount } from '@/lib/billing/pricing'
import { isPackagesEnabled } from '@/lib/feature-flags'
import { checkPromoCode } from '@/lib/billing/promo'
import { fulfilPayment } from '@/lib/billing/fulfil'

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'User must be authenticated' },
        { status: 401 }
      )
    }

    // Hard gate: the paid Packages feature is disabled (show_packages=false) and
    // the Stripe integration is still mocked. Refuse to create a checkout session
    // — even on a direct API call — so no one can complete a no-op "purchase"
    // until real Stripe is wired and the flag is enabled.
    if (!(await isPackagesEnabled())) {
      return NextResponse.json(
        { error: 'Packages are not currently available' },
        { status: 403 }
      )
    }

    // Rate limit: this endpoint writes a payment row and reads promo codes with
    // the service-role client, so cap per-user creation to prevent DB spam/abuse.
    const rl = await checkRateLimit(`checkout:${user.id}`, { limit: 15, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many checkout attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      )
    }

    // Payment/promo tables are intentionally RLS-locked so users cannot write
    // their own payment rows or read promo codes directly. This endpoint has
    // already authenticated the user and computes the amount server-side, so it
    // performs those controlled operations with the service-role client.
    const db = createAdminClient()

    const body = await request.json().catch(() => ({}))
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

    // Validate promo code if provided (same checker as the checkout preview),
    // and capture its discount for server-side price computation.
    let promoCodeId: string | null = null
    let appliedCode: string | null = null
    let amount = basePrice
    if (promoCode) {
      const check = await checkPromoCode(db, promoCode, user.id)
      if (!check.ok) {
        return NextResponse.json({ error: check.error, reason: check.reason }, { status: 400 })
      }
      promoCodeId = check.code.id
      appliedCode = check.code.code
      amount = applyDiscount(basePrice, check.code.discount_type, check.code.discount_value, check.code.code_type)
    }
    const discountCents = Math.round(basePrice * 100) - Math.round(amount * 100)

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
        discount_applied_cents: discountCents,
        metadata: {
          promoCode: appliedCode,
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

    // A promo code that makes the order free ($0) can't go through Stripe
    // (it has a minimum charge), so fulfil it right here.
    if (amountCents === 0) {
      try {
        await fulfilPayment(db, payment, { paymentMethod: 'promo_code' })
      } catch (err) {
        console.error('Free checkout fulfilment error:', err)
        await db.from('payments').update({ status: 'failed' }).eq('id', payment.id)
        return NextResponse.json({ error: 'Failed to apply promo code' }, { status: 500 })
      }
      return NextResponse.json({ success: true, free: true, paymentId: payment.id })
    }

    // Otherwise promo usage is recorded by the webhook on successful payment,
    // so an abandoned checkout never consumes a use.

    return NextResponse.json({
      success: true,
      sessionId: mockSessionId,
      clientSecret: mockClientSecret,
      paymentId: payment.id,
    })
  } catch (error) {
    console.error('Checkout session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
