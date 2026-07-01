import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/payments
 *
 * View all payments and transactions (superadmin/admin only)
 *
 * Query parameters:
 * - userId: Filter by user ID
 * - packageId: Filter by package ID
 * - status: Filter by payment status (pending, succeeded, failed, cancelled)
 * - sortBy: Sort field (created_at, amount_cents, status)
 * - order: asc or desc
 * - limit: Results per page (default 50, max 500)
 * - offset: Pagination offset
 */
export async function GET(request: Request) {
  try {
    const { role } = await requireAdmin()
    if (!['admin', 'superadmin'].includes(role)) {
      return NextResponse.json(
        { error: 'Only admin+ can view payments' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const packageId = searchParams.get('packageId')
    const status = searchParams.get('status')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500)
    const offset = parseInt(searchParams.get('offset') || '0')

    const db = createAdminClient()

    let query = db
      .from('payments')
      .select('*, user:profiles(full_name_en, full_name_ar), package:packages(name_en, name_ar)')

    if (userId) query = query.eq('user_id', userId)
    if (packageId) query = query.eq('package_id', packageId)
    if (status) query = query.eq('status', status)

    const { data, error, count } = await query
      .order(sortBy, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: 'Database operation failed' }, { status: 500 })
    }

    return NextResponse.json({
      payments: data || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
      },
    })
  } catch (error) {
    console.error('Payments fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

