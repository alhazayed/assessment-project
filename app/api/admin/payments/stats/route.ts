import { NextResponse } from 'next/server'
import { requireAdmin, adminRouteError } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/payments/stats
 *
 * Payment statistics dashboard for superadmin analytics
 */
export async function GET(request: Request) {
  try {
    const { role } = await requireAdmin()
    if (!['admin', 'superadmin'].includes(role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const db = createAdminClient()

    // Total revenue
    const { data: revenueData } = await db
      .from('payments')
      .select('amount_cents, currency')
      .eq('status', 'succeeded')

    const totalRevenue = revenueData?.reduce((sum, p) => sum + (p.amount_cents || 0), 0) || 0

    // Payment count by status
    const { data: statusCounts } = await db
      .from('payments')
      .select('status, id', { count: 'exact' })

    const statsByStatus: Record<string, number> = {}
    statusCounts?.forEach((p: any) => {
      statsByStatus[p.status] = (statsByStatus[p.status] || 0) + 1
    })

    // Top packages by revenue
    const { data: topPackages } = await db
      .from('payments')
      .select('package_id, amount_cents, package:packages(name_en, name_ar)')
      .eq('status', 'succeeded')
      .order('amount_cents', { ascending: false })
      .limit(5)

    // Purchases
    const { count: activePurchases } = await db
      .from('package_purchases')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    return NextResponse.json({
      revenue: {
        totalCents: totalRevenue,
        totalUSD: totalRevenue / 100,
      },
      paymentsByStatus: statsByStatus,
      topPackages: topPackages || [],
      activePurchases: activePurchases || 0,
    })
  } catch (error) {
    console.error('Payment stats error:', error)
    return adminRouteError(error)
  }
}
