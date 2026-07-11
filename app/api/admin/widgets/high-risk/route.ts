import { createClient } from '@/lib/supabase/server'
import { requireAdmin, adminRouteError, isAuthRedirectError } from '@/lib/admin-auth'
import * as Sentry from '@sentry/nextjs'

export const maxDuration = 30

interface HighRiskResponse {
  success: boolean
  current: number
  previous: number
  change: number | null
  percentage: number
  timestamp: string
}

export async function GET(): Promise<Response> {
  const startTime = Date.now()

  try {
    await requireAdmin()
    const supabase = await createClient()

    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString()
    const twoWeeksAgo = new Date(Date.now() - 14 * 864e5).toISOString()

    const [currentRes, previousRes, totalRes] = await Promise.all([
      supabase.from('assessment_submissions').select('id', { count: 'exact', head: true }).eq('high_risk_flag', true).gte('submitted_at', weekAgo),
      supabase.from('assessment_submissions').select('id', { count: 'exact', head: true }).eq('high_risk_flag', true).gte('submitted_at', twoWeeksAgo).lt('submitted_at', weekAgo),
      supabase.from('assessment_submissions').select('id', { count: 'exact', head: true }).gte('submitted_at', weekAgo),
    ])

    if (currentRes.error || previousRes.error || totalRes.error) {
      throw new Error('Failed to fetch high-risk data')
    }

    const current = currentRes.count || 0
    const previous = previousRes.count || 0
    const total = totalRes.count || 0
    const change = previous > 0 ? parseFloat(((current - previous) / previous * 100).toFixed(1)) : null
    const percentage = total > 0 ? parseFloat((current / total * 100).toFixed(1)) : 0

    const duration = Date.now() - startTime

    return Response.json(
      { success: true, current, previous, change, percentage, timestamp: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Response-Time': `${duration}ms`,
        },
      }
    )
  } catch (error) {
    if (isAuthRedirectError(error)) return adminRouteError(error)
    console.error('[widget:high-risk] Error:', error)
    Sentry.captureException(error, {
      tags: { widget: 'high-risk', type: 'api' },
      extra: { duration: Date.now() - startTime },
    })

    return adminRouteError(error)
  }
}
