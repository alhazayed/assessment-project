import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, adminRouteError, isAuthRedirectError } from '@/lib/admin-auth'
import * as Sentry from '@sentry/nextjs'

export const maxDuration = 30

interface ActivityResponse {
  success: boolean
  count: number
  timestamp: string
}

export async function GET(): Promise<Response> {
  const startTime = Date.now()

  try {
    await requireAdmin()
    const supabase = createAdminClient()

    // Get today's submissions
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()

    const { count, error } = await supabase
      .from('assessment_submissions')
      .select('id', { count: 'exact', head: true })
      .gte('submitted_at', todayStart)

    if (error) {
      throw new Error(`Failed to fetch today's activity: ${error.message}`)
    }

    const duration = Date.now() - startTime

    return Response.json(
      { success: true, count: count || 0, timestamp: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 'private, no-store',
          'X-Response-Time': `${duration}ms`,
        },
      }
    )
  } catch (error) {
    if (isAuthRedirectError(error)) return adminRouteError(error)
    console.error('[widget:activity-today] Error:', error)
    Sentry.captureException(error, {
      tags: { widget: 'activity-today', type: 'api' },
      extra: { duration: Date.now() - startTime },
    })

    return adminRouteError(error)
  }
}
