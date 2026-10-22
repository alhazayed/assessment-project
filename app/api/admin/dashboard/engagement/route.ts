import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, adminRouteError } from '@/lib/admin-auth'

export const maxDuration = 60

export async function GET(request: Request) {
  try {
    await requireAdmin()
    // These RPCs are revoked from `authenticated`; call them with the
    // service-role client, and only after requireAdmin() has passed.
    const supabase = createAdminClient()

    // Get user engagement metrics
    const { data: metrics, error } = await supabase.rpc('get_user_engagement_metrics')

    if (error) {
      console.error('Engagement metrics error:', error)
      return Response.json({ error: 'Failed to fetch engagement data' }, { status: 500 })
    }

    return Response.json({
      success: true,
      metrics: metrics?.[0] || null,
    })
  } catch (error) {
    console.error('Engagement API error:', error)
    return adminRouteError(error)
  }
}
