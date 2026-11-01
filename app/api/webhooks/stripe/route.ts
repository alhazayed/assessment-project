import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { constructEvent, StripeWebhookError, type StripeEvent } from '@/lib/stripe/webhook'
import { fulfilPayment } from '@/lib/billing/fulfil'

// Stripe webhooks must read the raw request body for signature verification,
// so this route must run on the Node.js runtime (not Edge) and never be cached.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/stripe
 *
 * Receives Stripe webhook events, verifies the signature, and fulfils orders:
 *   - payment_intent.succeeded / checkout.session.completed → mark paid + grant access
 *   - payment_intent.payment_failed                          → mark failed
 *
 * The endpoint is idempotent: every event id is recorded, and duplicate
 * deliveries are acknowledged without reprocessing.
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    )
  }

  // Read the RAW body — required for signature verification.
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  let event: StripeEvent
  try {
    event = constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof StripeWebhookError ? err.message : 'Invalid payload'
    console.error('Stripe webhook verification failed:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const supabase = createAdminClient()

  // ---- Idempotency: atomically CLAIM the event before processing -----------
  // Insert-first (not insert-after): the stripe_event_id UNIQUE constraint makes
  // this the concurrency-safe dedup point. Two simultaneous redeliveries of the
  // same event can otherwise both pass a read-then-check and both fulfil the
  // order (double package_purchase / double promo increment). Whoever inserts
  // first wins; the loser gets a unique-violation (23505) and is acknowledged as
  // a duplicate. If processing then fails we delete the claim so Stripe's retry
  // can reprocess — preserving the original "transient failures retry" behaviour.
  const { error: claimError } = await supabase
    .from('stripe_webhook_events')
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event as unknown as Record<string, unknown>,
    })

  if (claimError) {
    // 23505 = unique_violation → already claimed/processed by another delivery.
    if ((claimError as { code?: string }).code === '23505') {
      return NextResponse.json({ received: true, duplicate: true })
    }
    console.error('Failed to claim webhook event:', claimError)
    return NextResponse.json({ error: 'Failed to record webhook' }, { status: 500 })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'checkout.session.completed':
        await handlePaymentSucceeded(supabase, event)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(supabase, event)
        break

      case 'charge.refunded':
        await handleRefund(supabase, event)
        break

      default:
        // Unhandled event types are acknowledged so Stripe stops retrying.
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Error processing Stripe webhook:', err)
    // Release the claim so the Stripe retry reprocesses this event.
    await supabase.from('stripe_webhook_events').delete().eq('stripe_event_id', event.id)
    // Return 500 so Stripe retries delivery.
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

/**
 * Resolve the payment record tied to a Stripe object, by payment intent id
 * (preferred) or by the checkout session id.
 */
async function findPayment(
  supabase: ReturnType<typeof createAdminClient>,
  obj: Record<string, any>
) {
  const intentId: string | undefined =
    obj.payment_intent || (obj.object === 'payment_intent' ? obj.id : undefined)
  const sessionId: string | undefined =
    obj.object === 'checkout.session' ? obj.id : undefined

  if (intentId) {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('stripe_payment_intent_id', intentId)
      .maybeSingle()
    if (data) return data
  }

  if (sessionId) {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .maybeSingle()
    if (data) return data
  }

  return null
}

async function handlePaymentSucceeded(
  supabase: ReturnType<typeof createAdminClient>,
  event: StripeEvent
) {
  const obj = event.data.object
  const payment = await findPayment(supabase, obj)

  if (!payment) {
    console.warn(`No payment record found for event ${event.id}`)
    return
  }

  // No early return on status 'succeeded': fulfilPayment is idempotent, and a
  // retry after a partial failure must still finish granting access / redeeming.
  const intentId: string | undefined =
    obj.payment_intent || (obj.object === 'payment_intent' ? obj.id : undefined)

  // Mark paid, grant access, and redeem the promo code (atomically, once per
  // customer). Throws on failure so this handler returns 500 and Stripe retries.
  await fulfilPayment(supabase, payment, {
    intentId: intentId || null,
    paymentMethod: obj.payment_method_types?.[0] || obj.payment_method || null,
  })
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createAdminClient>,
  event: StripeEvent
) {
  const obj = event.data.object
  const payment = await findPayment(supabase, obj)

  if (!payment) {
    console.warn(`No payment record found for failed event ${event.id}`)
    return
  }

  if (payment.status === 'failed') return

  await supabase
    .from('payments')
    .update({
      status: 'failed',
      metadata: {
        ...(payment.metadata || {}),
        failure_message: obj.last_payment_error?.message || 'Payment failed',
        failure_code: obj.last_payment_error?.code || null,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id)
}

async function handleRefund(
  supabase: ReturnType<typeof createAdminClient>,
  event: StripeEvent
) {
  const obj = event.data.object
  const payment = await findPayment(supabase, obj)

  if (!payment) return

  await supabase
    .from('payments')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', payment.id)

  // Revoke access on refund.
  await supabase
    .from('package_purchases')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('payment_id', payment.id)
}
