import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * What a checkout is for: one profile package (its UUID). Packages are the
 * only paid product; the monthly tiers were retired and the rest of the
 * platform is free. Shared by the product lookup, the promo preview and the
 * real charge, so the three always agree on the price. `tier` stays null so
 * payment rows keep their shape.
 */
export type Product = {
  kind: 'package'; id: string; tier: null; packageId: string; nameEn: string; nameAr: string; priceUSD: number
}

export type ProductError = 'invalid' | 'not_for_sale'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isPackageProductId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/** A package can be bought when it is active and has a price. */
export function packageSaleState(pkg: { status: string; price_cents: number | null } | null): 'for_sale' | ProductError {
  if (!pkg) return 'invalid'
  if (pkg.status !== 'active' || pkg.price_cents == null || pkg.price_cents <= 0) return 'not_for_sale'
  return 'for_sale'
}

/**
 * Resolve a checkout product id (a package UUID) to its server-side price. Package prices come
 * from packages.price_cents (read with the service-role client), never from
 * the request.
 */
export async function resolveProduct(
  db: SupabaseClient,
  id: unknown
): Promise<{ ok: true; product: Product } | { ok: false; error: ProductError }> {
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
