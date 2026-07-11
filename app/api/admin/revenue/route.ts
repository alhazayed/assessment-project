import { NextResponse } from 'next/server'
import { requireAdmin, adminRouteError } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/revenue
 *
 * Comprehensive revenue & subscription analytics for the admin panel.
 * Built for the subscription tier model (basic/standard/professional).
 */
export async function GET() {
  try {
    const { role } = await requireAdmin()
    if (!['admin', 'superadmin'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const db = createAdminClient()

    // All payments (lightweight columns) for status + trend aggregation.
    const { data: payments } = await db
      .from('payments')
      .select('amount_cents, currency, status, tier, discount_applied_cents, created_at')

    const all = payments || []
    const succeeded = all.filter((p) => p.status === 'succeeded')

    // ---- Headline metrics ----------------------------------------------------
    const totalRevenueCents = succeeded.reduce((s, p) => s + (p.amount_cents || 0), 0)
    const totalDiscountCents = succeeded.reduce((s, p) => s + (p.discount_applied_cents || 0), 0)
    const avgOrderCents = succeeded.length ? Math.round(totalRevenueCents / succeeded.length) : 0
    const conversionRate = all.length
      ? Math.round((succeeded.length / all.length) * 1000) / 10
      : 0

    // ---- Payments by status --------------------------------------------------
    const paymentsByStatus: Record<string, number> = {}
    all.forEach((p) => {
      const st = p.status || 'unknown'
      paymentsByStatus[st] = (paymentsByStatus[st] || 0) + 1
    })

    // ---- Revenue by tier -----------------------------------------------------
    const tierMap: Record<string, { count: number; revenueCents: number }> = {}
    succeeded.forEach((p) => {
      const tier = p.tier || 'other'
      if (!tierMap[tier]) tierMap[tier] = { count: 0, revenueCents: 0 }
      tierMap[tier].count += 1
      tierMap[tier].revenueCents += p.amount_cents || 0
    })
    const revenueByTier = Object.entries(tierMap).map(([tier, v]) => ({
      tier,
      count: v.count,
      revenueCents: v.revenueCents,
      revenueUSD: v.revenueCents / 100,
    }))

    // ---- Daily revenue trend (last 30 days) ----------------------------------
    const days = 30
    const dayBuckets: { date: string; label: string; revenueCents: number; count: number }[] = []
    const byDay: Record<string, { revenueCents: number; count: number }> = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setUTCHours(0, 0, 0, 0)
      d.setUTCDate(d.getUTCDate() - i)
      const key = d.toISOString().slice(0, 10)
      byDay[key] = { revenueCents: 0, count: 0 }
      dayBuckets.push({
        date: key,
        label: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`,
        revenueCents: 0,
        count: 0,
      })
    }
    succeeded.forEach((p) => {
      if (!p.created_at) return
      const key = new Date(p.created_at).toISOString().slice(0, 10)
      if (byDay[key]) {
        byDay[key].revenueCents += p.amount_cents || 0
        byDay[key].count += 1
      }
    })
    dayBuckets.forEach((b) => {
      b.revenueCents = byDay[b.date].revenueCents
      b.count = byDay[b.date].count
    })

    // ---- Active subscriptions (by tier) --------------------------------------
    const { data: purchases } = await db
      .from('package_purchases')
      .select('tier, status')
      .eq('status', 'active')

    const activeByTier: Record<string, number> = {}
    ;(purchases || []).forEach((p) => {
      const tier = p.tier || 'other'
      activeByTier[tier] = (activeByTier[tier] || 0) + 1
    })
    const activeSubscriptions = (purchases || []).length

    // ---- Promo code usage ----------------------------------------------------
    const { count: promoUses } = await db
      .from('promo_code_usage')
      .select('*', { count: 'exact', head: true })

    // ---- ADHD check-in engagement (last 30d) ---------------------------------
    const since = new Date()
    since.setUTCDate(since.getUTCDate() - 30)
    const { count: adhdCheckins } = await db
      .from('adhd_zone_checkins')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since.toISOString())

    return NextResponse.json({
      headline: {
        totalRevenueCents,
        totalRevenueUSD: totalRevenueCents / 100,
        totalDiscountCents,
        avgOrderCents,
        avgOrderUSD: avgOrderCents / 100,
        successfulPayments: succeeded.length,
        totalPayments: all.length,
        conversionRate,
        activeSubscriptions,
      },
      paymentsByStatus,
      revenueByTier,
      activeByTier,
      dailyTrend: dayBuckets,
      promoUses: promoUses || 0,
      adhdCheckins30d: adhdCheckins || 0,
    })
  } catch (error) {
    console.error('Revenue analytics error:', error)
    return adminRouteError(error)
  }
}
