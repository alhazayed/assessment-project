import type { SupabaseClient } from '@supabase/supabase-js'
import { packageSaleState } from '@/lib/billing/product'

export interface PackageCandidate {
  id: string
  nameEn: string
  nameAr: string
  priceCents: number
  codes: string[]
}

export interface SuggestedPackage {
  id: string
  nameEn: string
  nameAr: string
  priceUSD: number
  /** How many of the package's scales the user has already taken. */
  matched: number
  total: number
}

/**
 * The package that best fits what a user has already taken: the most scales
 * in common, then the larger share of the package already done, then the
 * lower price. Null when no package shares a scale with the user.
 */
export function pickPackage(candidates: PackageCandidate[], takenCodes: Iterable<string>): SuggestedPackage | null {
  const taken = new Set(takenCodes)
  let best: { c: PackageCandidate; matched: number } | null = null
  for (const c of candidates) {
    if (c.codes.length === 0) continue
    const matched = c.codes.filter(code => taken.has(code)).length
    if (matched === 0) continue
    if (
      !best ||
      matched > best.matched ||
      (matched === best.matched && matched / c.codes.length > best.matched / best.c.codes.length) ||
      (matched === best.matched && matched / c.codes.length === best.matched / best.c.codes.length && c.priceCents < best.c.priceCents)
    ) {
      best = { c, matched }
    }
  }
  if (!best) return null
  return {
    id: best.c.id,
    nameEn: best.c.nameEn,
    nameAr: best.c.nameAr,
    priceUSD: best.c.priceCents / 100,
    matched: best.matched,
    total: best.c.codes.length,
  }
}

/** Load the packages on sale (active, priced, profile-based) with their available scales. */
export async function loadSaleCandidates(db: SupabaseClient): Promise<PackageCandidate[]> {
  const { data } = await db
    .from('packages')
    .select('id, name_en, name_ar, status, price_cents, scoring_method, package_assessments(assessment_code, is_available)')
    .eq('status', 'active')
    .eq('scoring_method', 'profile_rules')
  type Row = {
    id: string
    name_en: string
    name_ar: string
    status: string
    price_cents: number | null
    package_assessments: { assessment_code: string; is_available: boolean }[] | null
  }
  return ((data || []) as Row[])
    .filter(p => packageSaleState(p) === 'for_sale')
    .map(p => ({
      id: p.id,
      nameEn: p.name_en,
      nameAr: p.name_ar,
      priceCents: p.price_cents as number,
      codes: (p.package_assessments || []).filter(a => a.is_available).map(a => a.assessment_code),
    }))
}
