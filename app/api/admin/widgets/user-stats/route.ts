import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, adminRouteError, isAuthRedirectError } from '@/lib/admin-auth'
import * as Sentry from '@sentry/nextjs'
import { fetchAll } from '@/lib/admin/fetch-all'

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
    const supabase = createAdminClient()

    // Every profile's role, paged past PostgREST's 1,000-row max_rows cap
    // (fetchAll throws on a query error).
    const profiles = await fetchAll<{ role: string }>(() => supabase
      .from('profiles')
      .select('role')
      .order('id', { ascending: true }))

    // Aggregate by role
    const roles: Record<string, number> = {}
    profiles.forEach((p) => {
      roles[p.role] = (roles[p.role] || 0) + 1
    })

    const duration = Date.now() - startTime

    const response: UserStatsResponse = {
      success: true,
      total: profiles.length,
      roles,
      source: 'live',
      timestamp: new Date().toISOString(),
    }

    return Response.json(response, {
      headers: {
        'Cache-Control': 'private, no-store',
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
