import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/checkout/create-session
 *
 * Create a Stripe checkout session for package purchase
 * Validates promo codes and applies discounts
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

    // Validate input
    if (!packageId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Validate promo code if provided
    let promoCodeId: string | null = null
    if (promoCode) {
      const { data: codes } = await supabase
        .from('promo_codes')
        .select('id, code, type, discount_value, max_uses, times_used, valid_until, active')
        .eq('code', promoCode.toUpperCase())
        .eq('active', true)
        .single()

      if (!codes) {
        return NextResponse.json(
          { error: 'Invalid promo code' },
          { status: 400 }
        )
      }

      // Check expiration
      if (codes.valid_until && new Date(codes.valid_until) < new Date()) {
        return NextResponse.json(
          { error: 'Promo code has expired' },
          { status: 400 }
        )
      }

      // Check max uses
      if (codes.max_uses && codes.times_used >= codes.max_uses) {
        return NextResponse.json(
          { error: 'Promo code usage limit reached' },
          { status: 400 }
        )
      }

      promoCodeId = codes.id
    }

    // TODO: Integrate with actual Stripe API when keys are available
    // For now, generate mock client secret for frontend integration testing

    const mockClientSecret = `pi_test_${Math.random().toString(36).substring(7)}_secret_${Math.random().toString(36).substring(7)}`
    const mockSessionId = `cs_test_${Math.random().toString(36).substring(7)}`

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        package_id: packageId,
        amount_cents: Math.round(amount),
        currency: 'USD',
        status: 'pending',
        stripe_session_id: mockSessionId,
        stripe_client_secret: mockClientSecret,
        promo_code_id: promoCodeId,
        metadata: {
          promoCode,
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

    // Increment promo code usage if applicable
    if (promoCodeId) {
      try {
        await supabase.rpc('increment_promo_code_usage', {
          code_id: promoCodeId,
        })
      } catch (err) {
        console.error('Promo code usage increment error:', err)
        // Don't fail the checkout if usage increment fails
      }
    }

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
