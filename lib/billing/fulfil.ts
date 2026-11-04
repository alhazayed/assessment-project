import type { SupabaseClient } from '@supabase/supabase-js'
import { issueGiftCode } from '@/lib/billing/gift-codes'
import { sendEmail } from '@/lib/email/send'
import { giftReceiptEmail, receiptEmail } from '@/lib/email/templates'
import { absoluteUrl } from '@/lib/site-url'

/**
 * Fulfil a payment: mark it succeeded, grant access (30 days for a legacy tier
 * subscription; no expiry for a one-time package purchase), and redeem its
 * promo code.

 * A gift (metadata.giftRecipientEmail) grants nothing to the buyer: it creates
 * a one-time code and emails it to the recipient, who redeems it on their own
 * account. Emails (receipt, gift code) are best effort and never fail the
 * payment; a gift whose email did not go out can be resent from billing. Used by the Stripe webhook and by create-session for orders a
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
    amount_cents?: number | null
    metadata?: Record<string, unknown> | null
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

  const giftEmail =
    typeof payment.metadata?.giftRecipientEmail === 'string' ? payment.metadata.giftRecipientEmail : null

  if (giftEmail && payment.package_id) {
    // Gift: one code row per payment (payment_id is unique), created once.
    const { data: existingGift } = await db
      .from('package_gift_codes')
      .select('id, recipient_email, package_id, emailed_at, redeemed_at')
      .eq('payment_id', payment.id)
      .maybeSingle()
    let gift = existingGift
    let isNew = false
    if (!gift) {
      const { data: created, error } = await db
        .from('package_gift_codes')
        .insert({ package_id: payment.package_id, payment_id: payment.id, buyer_id: payment.user_id, recipient_email: giftEmail })
        .select('id, recipient_email, package_id, emailed_at, redeemed_at')
        .single()
      if (error) throw new Error(`Failed to create gift: ${error.message}`)
      gift = created
      isNew = true
    }
    // (Re)issue only while the code has never reached the recipient.
    if (gift && !gift.emailed_at && !gift.redeemed_at) {
      try {
        await issueGiftCode(db, gift)
      } catch (err) {
        console.error('[fulfil] gift code issue failed:', err instanceof Error ? err.message : err)
      }
    }
    if (isNew) await sendBuyerReceipt(db, payment, { giftRecipient: giftEmail })
  } else {
    const { data: existingPurchase } = await db
      .from('package_purchases')
      .select('id')
      .eq('payment_id', payment.id)
      .maybeSingle()

    if (!existingPurchase) {
      const now = new Date()
      // A package is a one-time purchase: its report stays unlocked.
      const expires = payment.package_id ? null : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const { error } = await db.from('package_purchases').insert({
        user_id: payment.user_id,
        package_id: payment.package_id, // null for legacy tier subscriptions
        payment_id: payment.id,
        tier: payment.tier ?? null,
        status: 'active',
        access_level: 'full',
        purchased_at: now.toISOString(),
        expires_at: expires ? expires.toISOString() : null,
      })
      if (error) throw new Error(`Failed to grant access: ${error.message}`)
      if (payment.package_id) await sendBuyerReceipt(db, payment, { giftRecipient: null })
    }
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

function formatUsd(cents: number | null | undefined): string {
  return `$${((cents ?? 0) / 100).toFixed(2)}`
}

/** Best effort: a missing or failed receipt never undoes the purchase. */
async function sendBuyerReceipt(
  db: SupabaseClient,
  payment: { user_id: string; package_id: string | null; amount_cents?: number | null },
  opts: { giftRecipient: string | null }
): Promise<void> {
  try {
    if (!payment.package_id) return
    const [{ data: userRes }, { data: pkg }] = await Promise.all([
      db.auth.admin.getUserById(payment.user_id),
      db.from('packages').select('name_en, name_ar').eq('id', payment.package_id).maybeSingle(),
    ])
    const to = userRes?.user?.email
    if (!to) return
    const names = { en: pkg?.name_en ?? 'Assessment package', ar: pkg?.name_ar ?? 'باقة تقييم' }
    const amount = formatUsd(payment.amount_cents)
    await sendEmail(
      opts.giftRecipient
        ? giftReceiptEmail({ to, pkg: names, amount, recipient: opts.giftRecipient, billingUrl: absoluteUrl('/billing') })
        : receiptEmail({ to, pkg: names, amount, packageUrl: absoluteUrl(`/packages/${payment.package_id}`) })
    )
  } catch (err) {
    console.error('[fulfil] receipt email failed:', err instanceof Error ? err.message : err)
  }
}
