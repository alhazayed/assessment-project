import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, adminRouteError } from '@/lib/admin-auth'

export const maxDuration = 60

export async function GET(request: Request) {
  try {
    await requireAdmin()
    // These RPCs are revoked from `authenticated`; call them with the
    // service-role client, and only after requireAdmin() has passed.
    const supabase = createAdminClient()

    const url = new URL(request.url)
    const type = url.searchParams.get('type') || null
    if (type && !/^[a-z_]{1,40}$/.test(type)) {
      return Response.json({ error: 'Invalid type' }, { status: 400 })
    }

    // Get demographics breakdown
    const { data: demographics, error } = await supabase.rpc(
      'get_demographics_breakdown',
      {
        p_demographic_type: type,
      }
    )

    if (error) {
      console.error('Demographics error:', error)
      return Response.json({ error: 'Failed to fetch demographics' }, { status: 500 })
    }

    // Group by type
    const grouped = (demographics || []).reduce((acc: any, item: any) => {
      if (!acc[item.demographic_type]) {
        acc[item.demographic_type] = []
      }
      acc[item.demographic_type].push(item)
      return acc
    }, {})

    return Response.json({
      success: true,
      demographics: grouped,
      count: demographics?.length || 0,
    })
  } catch (error) {
    console.error('Demographics API error:', error)
    return adminRouteError(error)
  }
}
