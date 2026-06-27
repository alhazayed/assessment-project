import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'

export const maxDuration = 60

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const supabase = await createClient()

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
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
