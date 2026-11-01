import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Promo code eligibility, shared by the checkout preview
 * (/api/checkout/validate-promo) and the real charge
 * (/api/checkout/create-session) so the two can never disagree.
 *
 * Rules:
 *   - code must exist and be active
 *   - now must be inside [valid_from, valid_until]
 *   - one redemption per customer
 *   - max_uses counts finished redemptions PLUS other customers' checkouts that
 *     are still open (pending, started in the last RESERVATION_MINUTES), so a
 *     code with one use left can't be paid for by several people at once
 */

export const RESERVATION_MINUTES = 30

export interface PromoRow {
  id: string
  code: string
  code_type: string
  discount_type: string | null
  discount_value: number | null
  max_uses: number | null
  current_uses: number | null
  valid_from: string | null
  valid_until: string | null
  active: boolean | null
}

export type PromoReason =
  | 'invalid'
  | 'not_yet_active'
  | 'expired'
  | 'limit_reached'
  | 'already_used'

export const PROMO_ERRORS: Record<PromoReason, string> = {
  invalid: 'Invalid or expired promo code',
  not_yet_active: 'Promo code is not yet active',
  expired: 'Promo code has expired',
  limit_reached: 'Promo code usage limit reached',
  already_used: 'You have already used this promo code',
}

export function normalizePromoCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const code = raw.trim().toUpperCase()
  return code.length > 0 ? code : null
}

/** Pure eligibility decision (unit-tested). */
export function evaluatePromo(
  code: PromoRow | null,
  opts: { now: Date; usedByUser: boolean; openReservations: number }
): { ok: true } | { ok: false; reason: PromoReason } {
  if (!code || !code.active) return { ok: false, reason: 'invalid' }
  if (code.valid_from && new Date(code.valid_from) > opts.now) {
    return { ok: false, reason: 'not_yet_active' }
  }
  if (code.valid_until && new Date(code.valid_until) < opts.now) {
    return { ok: false, reason: 'expired' }
  }
  if (opts.usedByUser) return { ok: false, reason: 'already_used' }
  if (code.max_uses != null && (code.current_uses ?? 0) + opts.openReservations >= code.max_uses) {
    return { ok: false, reason: 'limit_reached' }
  }
  return { ok: true }
}

/**
 * Look a code up with the service-role client and decide if `userId` may use it.
 */
export async function checkPromoCode(
  db: SupabaseClient,
  rawCode: unknown,
  userId: string
): Promise<{ ok: true; code: PromoRow } | { ok: false; reason: PromoReason; error: string }> {
  const fail = (reason: PromoReason) => ({ ok: false as const, reason, error: PROMO_ERRORS[reason] })

  const normalized = normalizePromoCode(rawCode)
  if (!normalized) return fail('invalid')

  const { data: code } = await db
    .from('promo_codes')
    .select('id, code, code_type, discount_type, discount_value, max_uses, current_uses, valid_from, valid_until, active')
    .eq('code', normalized)
    .maybeSingle()

  if (!code) return fail('invalid')

  const { count: userUses } = await db
    .from('promo_code_usage')
    .select('id', { count: 'exact', head: true })
    .eq('promo_code_id', code.id)
    .eq('user_id', userId)

  let openReservations = 0
  if (code.max_uses != null) {
    const since = new Date(Date.now() - RESERVATION_MINUTES * 60 * 1000).toISOString()
    const { data: pending } = await db
      .from('payments')
      .select('user_id')
      .eq('promo_code_id', code.id)
      .eq('status', 'pending')
      .neq('user_id', userId)
      .gte('created_at', since)
    openReservations = new Set((pending ?? []).map((p: { user_id: string }) => p.user_id)).size
  }

  const verdict = evaluatePromo(code as PromoRow, {
    now: new Date(),
    usedByUser: (userUses ?? 0) > 0,
    openReservations,
  })
  if (!verdict.ok) return fail(verdict.reason)
  return { ok: true, code: code as PromoRow }
}
