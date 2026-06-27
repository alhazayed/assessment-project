import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'

export const maxDuration = 60

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const url = new URL(request.url)
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '10', 10)))

    // Get top assessments by submission volume
    const { data: assessments, error } = await supabase.rpc('get_top_assessments', {
      p_limit: limit,
    })

    if (error) {
      console.error('Top assessments error:', error)
      return Response.json({ error: 'Failed to fetch assessments' }, { status: 500 })
    }

    return Response.json({
      success: true,
      assessments,
      count: assessments?.length || 0,
    })
  } catch (error) {
    console.error('Assessments API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
