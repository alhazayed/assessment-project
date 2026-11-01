import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Fulfil a payment: mark it succeeded, grant 30 days of access, and redeem its
 * promo code. Used by the Stripe webhook and by create-session for orders a
 * promo code makes free ($0 — Stripe cannot charge zero). Idempotent.
 *
 * Throws on a promo redemption error so the webhook returns 500 and Stripe
 * retries, instead of silently losing the usage count.
 */
export async function fulfilPayment(
  db: SupabaseClient,
  payment: {
    id: string
    user_id: string
    package_id: string | null
    tier?: string | null
    status: string
    promo_code_id: string | null
    stripe_payment_intent_id?: string | null
  },
  extra: { intentId?: string | null; paymentMethod?: string | null } = {}
): Promise<void> {
  if (payment.status !== 'succeeded') {
    const { error } = await db
      .from('payments')
      .update({
        status: 'succeeded',
        stripe_payment_intent_id: extra.intentId || payment.stripe_payment_intent_id || null,
        payment_method: extra.paymentMethod ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id)
    if (error) throw new Error(`Failed to mark payment succeeded: ${error.message}`)
  }

  const { data: existingPurchase } = await db
    .from('package_purchases')
    .select('id')
    .eq('payment_id', payment.id)
    .maybeSingle()

  if (!existingPurchase) {
    const now = new Date()
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const { error } = await db.from('package_purchases').insert({
      user_id: payment.user_id,
      package_id: payment.package_id, // null for tier subscriptions
      payment_id: payment.id,
      tier: payment.tier ?? null,
      status: 'active',
      access_level: 'full',
      purchased_at: now.toISOString(),
      expires_at: expires.toISOString(),
    })
    if (error) throw new Error(`Failed to grant access: ${error.message}`)
  }

  if (payment.promo_code_id) {
    // Atomic: records the usage row once per (code, customer) and bumps
    // current_uses in the same transaction. A repeat call is a no-op.
    const { error } = await db.rpc('redeem_promo_code', {
      p_code_id: payment.promo_code_id,
      p_user_id: payment.user_id,
      p_payment_id: payment.id,
    })
    if (error) throw new Error(`Failed to redeem promo code: ${error.message}`)
  }
}
