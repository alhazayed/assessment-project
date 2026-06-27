import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'

export const maxDuration = 60

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const url = new URL(request.url)
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '50', 10)))

    // Get high-risk patients for clinical dashboard
    const { data: patients, error } = await supabase.rpc('get_high_risk_patients', {
      p_limit: limit,
    })

    if (error) {
      console.error('High-risk patients error:', error)
      return Response.json({ error: 'Failed to fetch risk data' }, { status: 500 })
    }

    return Response.json({
      success: true,
      patients,
      count: patients?.length || 0,
    })
  } catch (error) {
    console.error('Risk API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
