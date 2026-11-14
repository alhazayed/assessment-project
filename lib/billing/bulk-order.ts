import type { SupabaseClient } from '@supabase/supabase-js'
import { buildGroupReport, bulkCodeStatus, bulkQuantityOf, type BulkCodeStatus, type GroupReport } from '@/lib/billing/bulk'

export interface BulkOrderView {
  paymentId: string
  createdAt: string
  status: string
  quantity: number
  package: { id: string; nameEn: string; nameAr: string } | null
  codes: { id: string; index: number; hint: string | null; status: BulkCodeStatus; redeemedAt: string | null }[]
  counts: Record<BulkCodeStatus, number>
  groupReport: GroupReport | null
}

/**
 * One bulk order as its buyer sees it: each code's status (never who used it)
 * and, once enough people finished, the anonymised group report. Returns null
 * if the payment is not a bulk order of this buyer.
 */
export async function loadBulkOrder(db: SupabaseClient, buyerId: string, paymentId: string): Promise<BulkOrderView | null> {
  const { data: payment } = await db
    .from('payments')
    .select('id, user_id, package_id, status, created_at, metadata')
    .eq('id', paymentId)
    .maybeSingle()
  if (!payment || payment.user_id !== buyerId || !payment.package_id) return null
  const quantity = bulkQuantityOf(payment.metadata as Record<string, unknown> | null)
  if (!quantity) return null

  const [{ data: pkg }, { data: rows }] = await Promise.all([
    db.from('packages').select('id, name_en, name_ar').eq('id', payment.package_id).maybeSingle(),
    db
      .from('package_gift_codes')
      .select('id, batch_index, code_hint, redeemed_at, redeemed_by')
      .eq('payment_id', paymentId)
      .eq('kind', 'bulk')
      .order('batch_index'),
  ])
  const codeRows = (rows || []) as { id: string; batch_index: number; code_hint: string | null; redeemed_at: string | null; redeemed_by: string | null }[]

  // Finished reports of the people who redeemed these codes (read server-side
  // only to count statuses and build the group report; never returned as-is).
  const redeemers = codeRows.map(r => r.redeemed_by).filter((x): x is string => !!x)
  const { data: results } = redeemers.length
    ? await db
        .from('package_results')
        .select('user_id, status, dimension_scores')
        .eq('package_id', payment.package_id)
        .eq('status', 'completed')
        .in('user_id', redeemers)
    : { data: [] as { user_id: string; status: string; dimension_scores: unknown }[] }
  const done = new Map((results || []).map(r => [r.user_id as string, r.dimension_scores as unknown]))

  const codes = codeRows.map(r => ({
    id: r.id,
    index: r.batch_index + 1,
    hint: r.code_hint,
    status: bulkCodeStatus(r.redeemed_at, !!r.redeemed_by && done.has(r.redeemed_by)),
    redeemedAt: r.redeemed_at,
  }))
  const counts: Record<BulkCodeStatus, number> = { unused: 0, redeemed: 0, report_ready: 0 }
  for (const c of codes) counts[c.status]++

  return {
    paymentId,
    createdAt: payment.created_at,
    status: payment.status,
    quantity,
    package: pkg ? { id: pkg.id, nameEn: pkg.name_en, nameAr: pkg.name_ar } : null,
    codes,
    counts,
    groupReport: buildGroupReport(Array.from(done.values())),
  }
}
