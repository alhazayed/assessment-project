import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const db = createAdminClient()

    const url = new URL(request.url)
    const days = Math.max(1, Math.min(90, parseInt(url.searchParams.get('days') || '7', 10)))

    const { data: stats, error } = await db.rpc('get_admin_dashboard_stats', {
      p_days: days,
    })

    if (error) {
      console.error('Dashboard stats error:', error)
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      stats,
      period_days: days,
      cached_at: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const digest = (error as { digest?: string })?.digest
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
