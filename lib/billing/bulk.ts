import type { SupabaseClient } from '@supabase/supabase-js'
import { generateGiftCode, hashGiftCode, normalizeGiftCode } from '@/lib/billing/gift-codes'
import { isProfileReport, type ProfileReport } from '@/lib/package-profiles'

/**
 * Bulk package codes: a clinician or employer pays for several codes of one
 * package in one order and hands them out (client intake, staff). Each code is
 * a package_gift_codes row with kind = 'bulk' and no recipient email. Codes are
 * stored only as hashes, so the plain codes are shown to the buyer once (email
 * and screen); an unused code can be replaced from the order page.
 */

import { BULK_MIN, BULK_MAX } from '@/lib/billing/bulk-limits'
export { BULK_MIN, BULK_MAX }

/**
 * Read the requested quantity. Absent or 1 = a normal single purchase (null).
 * Returns 'invalid' for anything that is not a whole number in range.
 */
export function parseBulkQuantity(input: unknown): number | null | 'invalid' {
  if (input == null || input === '' || input === 1 || input === '1') return null
  const n = typeof input === 'string' && /^\d+$/.test(input.trim()) ? Number(input.trim()) : input
  if (typeof n !== 'number' || !Number.isInteger(n) || n < BULK_MIN || n > BULK_MAX) return 'invalid'
  return n
}

/** The bulk quantity stored on a payment, or null for a normal purchase. */
export function bulkQuantityOf(metadata: Record<string, unknown> | null | undefined): number | null {
  const q = metadata?.bulkQuantity
  return typeof q === 'number' && Number.isInteger(q) && q >= BULK_MIN && q <= BULK_MAX ? q : null
}

/**
 * Create the codes for a paid bulk order, once. Returns the plain codes when
 * this call created them, or null when they already existed (a retried
 * webhook), so the caller emails them only once.
 */
export async function createBulkCodes(
  db: SupabaseClient,
  payment: { id: string; user_id: string; package_id: string },
  quantity: number
): Promise<string[] | null> {
  const { count, error: countErr } = await db
    .from('package_gift_codes')
    .select('id', { count: 'exact', head: true })
    .eq('payment_id', payment.id)
  if (countErr) throw new Error(`Failed to check bulk codes: ${countErr.message}`)
  if ((count ?? 0) > 0) return null

  const codes = Array.from({ length: quantity }, () => generateGiftCode())
  const rows = codes.map((code, i) => {
    const normalized = normalizeGiftCode(code)!
    return {
      kind: 'bulk',
      batch_index: i,
      package_id: payment.package_id,
      payment_id: payment.id,
      buyer_id: payment.user_id,
      recipient_email: null,
      code_hash: hashGiftCode(normalized),
      code_hint: normalized.slice(-4),
    }
  })
  // (payment_id, batch_index) is unique, so a concurrent second call fails
  // here instead of creating a second set of codes.
  const { error } = await db.from('package_gift_codes').insert(rows)
  if (error) throw new Error(`Failed to create bulk codes: ${error.message}`)
  return codes
}

/** Give one unused bulk code a fresh value (the old one stops working). */
export async function replaceBulkCode(db: SupabaseClient, codeId: string): Promise<string | null> {
  const code = generateGiftCode()
  const normalized = normalizeGiftCode(code)!
  const { data, error } = await db
    .from('package_gift_codes')
    .update({ code_hash: hashGiftCode(normalized), code_hint: normalized.slice(-4) })
    .eq('id', codeId)
    .eq('kind', 'bulk')
    .is('redeemed_at', null)
    .select('id')
  if (error) throw new Error(`Failed to replace code: ${error.message}`)
  return data && data.length > 0 ? code : null
}

export type BulkCodeStatus = 'unused' | 'redeemed' | 'report_ready'

export function bulkCodeStatus(redeemedAt: string | null, reportCompleted: boolean): BulkCodeStatus {
  if (!redeemedAt) return 'unused'
  return reportCompleted ? 'report_ready' : 'redeemed'
}

// ---------------------------------------------------------------------------
// Anonymised group report
// ---------------------------------------------------------------------------

/** No group report until at least this many people finished their report. */
export const GROUP_MIN = 10
/** Any count below this is shown as "fewer than 3", never the exact number. */
export const CELL_MIN = 3

export interface GroupCount {
  label: { en: string; ar: string }
  /** null = suppressed (fewer than CELL_MIN people). */
  count: number | null
}

export interface GroupReport {
  completed: number
  scales: { code: string; name: { en: string; ar: string }; bands: GroupCount[] }[]
  patterns: GroupCount[]
  quadrant: GroupCount[]
}

function suppress(n: number): number | null {
  return n < CELL_MIN ? null : n
}

function tally(map: Map<string, { label: { en: string; ar: string }; count: number }>, key: string, label: { en: string; ar: string }) {
  const cur = map.get(key)
  if (cur) cur.count++
  else map.set(key, { label, count: 1 })
}

function toCounts(map: Map<string, { label: { en: string; ar: string }; count: number }>): GroupCount[] {
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .map(v => ({ label: v.label, count: suppress(v.count) }))
}

/**
 * Build the employer view from completed profile reports. Returns null below
 * GROUP_MIN people. Only counts are shown, small counts are suppressed, and
 * safety patterns are left out entirely: they are handled with each person,
 * never reported to an employer.
 */
export function buildGroupReport(reports: unknown[]): GroupReport | null {
  const profiles = reports.filter(isProfileReport) as ProfileReport[]
  if (profiles.length < GROUP_MIN) return null

  const scaleBands = new Map<string, { name: { en: string; ar: string }; bands: Map<string, { label: { en: string; ar: string }; count: number }> }>()
  const patterns = new Map<string, { label: { en: string; ar: string }; count: number }>()
  const quadrant = new Map<string, { label: { en: string; ar: string }; count: number }>()

  for (const r of profiles) {
    for (const s of r.scales) {
      if (!s.band) continue
      let entry = scaleBands.get(s.code)
      if (!entry) {
        entry = { name: s.name, bands: new Map() }
        scaleBands.set(s.code, entry)
      }
      tally(entry.bands, s.band.en, s.band)
    }
    const seen = new Set<string>()
    for (const p of r.patterns) {
      if (p.kind === 'safety' || seen.has(p.id)) continue
      seen.add(p.id)
      tally(patterns, p.id, p.title)
    }
    if (r.quadrant) tally(quadrant, r.quadrant.result.en, r.quadrant.result)
  }

  return {
    completed: profiles.length,
    scales: Array.from(scaleBands.entries()).map(([code, v]) => ({ code, name: v.name, bands: toCounts(v.bands) })),
    patterns: toCounts(patterns),
    quadrant: toCounts(quadrant),
  }
}
