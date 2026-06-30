import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import * as Sentry from '@sentry/nextjs'

export const maxDuration = 60

interface DashboardStatRow {
  stat_date: string
  submissions: number
  high_risk_count: number
  unique_patients: number
  avg_score: number
}

export async function GET(request: Request) {
  try {
    await requireAdmin()

    const supabase = await createClient()

    // Get days parameter from query
    const url = new URL(request.url)
    const days = Math.max(1, Math.min(90, parseInt(url.searchParams.get('days') || '7', 10)))

    // First attempt: Call RPC function to get dashboard stats from materialized view
    const { data: stats, error: rpcError } = await supabase.rpc('get_admin_dashboard_stats', {
      p_days: days,
    })

    // If RPC succeeds and returns data, use it
    if (!rpcError && stats && Array.isArray(stats) && stats.length > 0) {
      return Response.json({
        success: true,
        stats,
        period_days: days,
        cached_at: new Date().toISOString(),
        source: 'materialized_view',
      })
    }

    // Fallback: If RPC fails or returns empty data, query directly from base tables
    console.warn('Dashboard RPC returned empty or error, using fallback query', { rpcError })
    Sentry.captureMessage('Admin dashboard RPC fallback triggered', {
      level: 'warning',
      extra: { rpcError, days },
    })

    const { data: directStats, error: fallbackError } = await supabase
      .from('assessment_submissions')
      .select('submitted_at, total_score, high_risk_flag, patient_id')
      .gte('submitted_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('submitted_at', { ascending: false })

    if (fallbackError || !directStats) {
      console.error('Dashboard stats fallback query failed:', fallbackError)
      Sentry.captureException(fallbackError || new Error('Fallback query returned no data'), {
        tags: { endpoint: 'admin_dashboard_stats' },
        extra: { days },
      })
      return Response.json(
        { error: 'Failed to fetch statistics', details: 'Both primary and fallback queries failed' },
        { status: 503 }
      )
    }

    // Aggregate the direct query results into daily stats
    const statsByDate = new Map<string, {
      submissions: number
      high_risk_count: number
      unique_patients: Set<string>
      scores: number[]
    }>()

    for (const row of directStats) {
      const date = new Date(row.submitted_at).toISOString().split('T')[0]
      if (!statsByDate.has(date)) {
        statsByDate.set(date, {
          submissions: 0,
          high_risk_count: 0,
          unique_patients: new Set(),
          scores: [],
        })
      }

      const dateStats = statsByDate.get(date)!
      dateStats.submissions += 1
      if (row.high_risk_flag) dateStats.high_risk_count += 1
      dateStats.unique_patients.add(row.patient_id)
      if (row.total_score !== null) dateStats.scores.push(row.total_score)
    }

    // Convert aggregated data to response format
    const aggregatedStats: DashboardStatRow[] = Array.from(statsByDate.entries())
      .map(([date, stats]) => ({
        stat_date: date,
        submissions: stats.submissions,
        high_risk_count: stats.high_risk_count,
        unique_patients: stats.unique_patients.size,
        avg_score: stats.scores.length > 0
          ? Math.round((stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length) * 100) / 100
          : 0,
      }))
      .sort((a, b) => new Date(b.stat_date).getTime() - new Date(a.stat_date).getTime())

    return Response.json({
      success: true,
      stats: aggregatedStats,
      period_days: days,
      cached_at: new Date().toISOString(),
      source: 'fallback_live_query',
      warning: 'Using live query instead of cached materialized view',
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    Sentry.captureException(error, {
      tags: { endpoint: 'admin_dashboard_stats' },
    })
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
