import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_TIERS = ['basic', 'standard', 'professional'] as const

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

    const body = await request.json()
    const { packageId, promoCode, amount } = body

    // Validate input — packageId here is a subscription tier.
    if (!packageId || amount === undefined || amount === null) {
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

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Validate promo code if provided.
    let promoCodeId: string | null = null
    if (promoCode) {
      const { data: code } = await supabase
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
    }

    // TODO: Replace with a real Stripe PaymentIntent when live keys exist.
    const rand = () => Math.random().toString(36).substring(2, 12)
    const mockIntentId = `pi_test_${rand()}`
    const mockClientSecret = `${mockIntentId}_secret_${rand()}`
    const mockSessionId = `cs_test_${rand()}`

    // Amount arrives in dollars; persist in cents.
    const amountCents = Math.round(amount * 100)

    // Create a pending payment record. package_id is null for tier
    // subscriptions (tiers are not rows in the packages catalog).
    const { data: payment, error: paymentError } = await supabase
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
          originalAmount: amount,
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
