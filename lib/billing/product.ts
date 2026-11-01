import type { SupabaseClient } from '@supabase/supabase-js'
import { TIER_PRICES_USD, isValidTier } from '@/lib/billing/pricing'

/**
 * What a checkout is for: a subscription tier ('basic' | 'standard' |
 * 'professional') or one profile package (its UUID). Shared by the product
 * lookup, the promo preview and the real charge, so the three always agree on
 * the price.
 */
export type Product =
  | { kind: 'tier'; id: string; tier: string; packageId: null; nameEn: string; nameAr: string; priceUSD: number }
  | { kind: 'package'; id: string; tier: null; packageId: string; nameEn: string; nameAr: string; priceUSD: number }

export type ProductError = 'invalid' | 'not_for_sale'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isPackageProductId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

const TIER_NAMES: Record<string, { en: string; ar: string }> = {
  basic: { en: 'Basic', ar: 'الأساسي' },
  standard: { en: 'Standard', ar: 'القياسي' },
  professional: { en: 'Professional', ar: 'احترافي' },
}

/** A package can be bought when it is active and has a price. */
export function packageSaleState(pkg: { status: string; price_cents: number | null } | null): 'for_sale' | ProductError {
  if (!pkg) return 'invalid'
  if (pkg.status !== 'active' || pkg.price_cents == null || pkg.price_cents <= 0) return 'not_for_sale'
  return 'for_sale'
}

/**
 * Resolve a checkout product id to its server-side price. Package prices come
 * from packages.price_cents (read with the service-role client), never from
 * the request.
 */
export async function resolveProduct(
  db: SupabaseClient,
  id: unknown
): Promise<{ ok: true; product: Product } | { ok: false; error: ProductError }> {
  if (isValidTier(id)) {
    const names = TIER_NAMES[id]
    return {
      ok: true,
      product: { kind: 'tier', id, tier: id, packageId: null, nameEn: names.en, nameAr: names.ar, priceUSD: TIER_PRICES_USD[id] },
    }
  }
  if (!isPackageProductId(id)) return { ok: false, error: 'invalid' }

  const { data: pkg } = await db
    .from('packages')
    .select('id, name_en, name_ar, status, price_cents')
    .eq('id', id)
    .maybeSingle()

  const state = packageSaleState(pkg)
  if (state !== 'for_sale') return { ok: false, error: state }
  return {
    ok: true,
    product: {
      kind: 'package',
      id: pkg!.id,
      tier: null,
      packageId: pkg!.id,
      nameEn: pkg!.name_en,
      nameAr: pkg!.name_ar,
      priceUSD: (pkg!.price_cents as number) / 100,
    },
  }
}
