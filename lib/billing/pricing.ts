/**
 * Server-authoritative subscription pricing.
 *
 * The checkout API must NEVER trust a client-supplied amount (that let a caller
 * pay $0.01 for any tier). All charge amounts are derived here from the tier
 * price and a validated promo discount. Kept dependency-free so it is unit
 * testable in isolation.
 */

export const VALID_TIERS = ['basic', 'standard', 'professional'] as const
export type Tier = (typeof VALID_TIERS)[number]

/** Authoritative tier prices in whole USD dollars. Mirrors the checkout UI. */
export const TIER_PRICES_USD: Record<Tier, number> = {
  basic: 9.99,
  standard: 24.99,
  professional: 49.99,
}

export function isValidTier(value: unknown): value is Tier {
  return typeof value === 'string' && (VALID_TIERS as readonly string[]).includes(value)
}

/**
 * Apply a validated promo discount to a base price, clamped to >= 0.
 * discount_type values written by the admin API: 'percentage' | 'fixed_amount' | 'free'.
 */
export function applyDiscount(
  base: number,
  discountType: string | null,
  discountValue: number | null
): number {
  if (!discountType) return base
  if (discountType === 'free') return 0
  if (discountValue == null) return base
  const discounted =
    discountType === 'percentage'
      ? base * (1 - discountValue / 100)
      : base - discountValue // fixed_amount discount
  return Math.max(0, Math.round(discounted * 100) / 100)
}
