import { createClient } from '@/lib/supabase/server'
import { requireAdmin, adminRouteError, isAuthRedirectError } from '@/lib/admin-auth'
import * as Sentry from '@sentry/nextjs'

export const maxDuration = 30

interface AssessmentsResponse {
  success: boolean
  count: number
  timestamp: string
}

export async function GET(): Promise<Response> {
  const startTime = Date.now()

  try {
    await requireAdmin()
    const supabase = await createClient()

    const { count, error } = await supabase
      .from('assessment_definitions')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)

    if (error) {
      throw new Error(`Failed to fetch assessments: ${error.message}`)
    }

    const duration = Date.now() - startTime

    return Response.json(
      { success: true, count: count || 0, timestamp: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          'X-Response-Time': `${duration}ms`,
        },
      }
    )
  } catch (error) {
    if (isAuthRedirectError(error)) return adminRouteError(error)
    console.error('[widget:assessments] Error:', error)
    Sentry.captureException(error, {
      tags: { widget: 'assessments', type: 'api' },
      extra: { duration: Date.now() - startTime },
    })

    return adminRouteError(error)
  }
}
