import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'

export const maxDuration = 60

export async function GET(request: Request) {
  try {
    await requireAdmin()

    const supabase = createAdminClient()

    // Get days parameter from query
    const url = new URL(request.url)
    const days = Math.max(1, Math.min(90, parseInt(url.searchParams.get('days') || '7', 10)))

    // Call RPC function to get dashboard stats
    const { data: stats, error } = await supabase.rpc('get_admin_dashboard_stats', {
      p_days: days,
    })

    if (error) {
      console.error('Dashboard stats error:', error)
      return Response.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    return Response.json({
      success: true,
      stats,
      period_days: days,
      cached_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
