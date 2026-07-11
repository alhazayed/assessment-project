import { createClient } from '@/lib/supabase/server'
import { requireAdmin, adminRouteError, isAuthRedirectError } from '@/lib/admin-auth'
import * as Sentry from '@sentry/nextjs'

export const maxDuration = 30

interface UserStatsResponse {
  success: boolean
  total: number
  roles: Record<string, number>
  source: 'cache' | 'live'
  timestamp: string
}

export async function GET(): Promise<Response> {
  const startTime = Date.now()

  try {
    await requireAdmin()
    const supabase = await createClient()

    // Query roles aggregation
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('role')

    if (error) {
      throw new Error(`Failed to fetch user stats: ${error.message}`)
    }

    // Aggregate by role
    const roles: Record<string, number> = {}
    ;(profiles || []).forEach((p: any) => {
      roles[p.role] = (roles[p.role] || 0) + 1
    })

    const duration = Date.now() - startTime

    const response: UserStatsResponse = {
      success: true,
      total: profiles?.length || 0,
      roles,
      source: 'live',
      timestamp: new Date().toISOString(),
    }

    return Response.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Response-Time': `${duration}ms`,
      },
    })
  } catch (error) {
    if (isAuthRedirectError(error)) return adminRouteError(error)
    console.error('[widget:user-stats] Error:', error)
    Sentry.captureException(error, {
      tags: { widget: 'user-stats', type: 'api' },
      extra: { duration: Date.now() - startTime },
    })

    return adminRouteError(error)
  }
}
