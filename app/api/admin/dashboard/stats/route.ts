import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { withServerCache, cacheHeaders } from '@/lib/server-cache'

export const maxDuration = 60

const CACHE_TTL_MS = 5 * 60 * 1000

export async function GET(request: Request) {
  try {
    await requireAdmin()

    const url = new URL(request.url)
    const days = Math.max(1, Math.min(90, parseInt(url.searchParams.get('days') || '7', 10)))
    const cacheKey = `admin-dashboard-stats:${days}`

    const payload = await withServerCache(cacheKey, CACHE_TTL_MS, async () => {
      const supabase = await createClient()
      const { data: stats, error } = await supabase.rpc('get_admin_dashboard_stats', {
        p_days: days,
      })
      if (error) throw error
      return {
        success: true,
        stats,
        period_days: days,
        cached_at: new Date().toISOString(),
      }
    })

    return Response.json(payload, { headers: cacheHeaders(300) })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
