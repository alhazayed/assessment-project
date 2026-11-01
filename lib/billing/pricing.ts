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
 * Apply a validated promo discount to a base price (USD), clamped to >= 0.
 *
 * Units match what the admin panel stores in `promo_codes`:
 *   - 'percentage'   → discount_value is whole percent (1–100)
 *   - 'fixed_amount' → discount_value is in CENTS (the column is an integer and
 *                      the admin form asks for "Amount off (cents)")
 *   - 'free'         → price becomes 0
 * A code with code_type 'free_use' (no discount_type) also makes the price 0.
 */
export function applyDiscount(
  base: number,
  discountType: string | null,
  discountValue: number | null,
  codeType: string | null = null
): number {
  if (codeType === 'free_use') return 0
  if (!discountType) return base
  if (discountType === 'free') return 0
  if (discountValue == null) return base
  let discounted: number
  if (discountType === 'percentage') discounted = base * (1 - discountValue / 100)
  else if (discountType === 'fixed_amount') discounted = base - discountValue / 100
  else return base
  return Math.max(0, Math.round(discounted * 100) / 100)
}
