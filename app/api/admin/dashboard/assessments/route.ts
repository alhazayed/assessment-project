import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import * as Sentry from '@sentry/nextjs'

export const maxDuration = 60

interface TopAssessment {
  definition_id: string
  code: string
  name_en: string
  total_submissions: number
  avg_score: number
  pct_high_risk: number
}

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const url = new URL(request.url)
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '10', 10)))

    // First attempt: Get top assessments by submission volume from materialized view
    const { data: assessments, error: rpcError } = await supabase.rpc('get_top_assessments', {
      p_limit: limit,
    })

    // If RPC succeeds and returns data, use it
    if (!rpcError && assessments && Array.isArray(assessments) && assessments.length > 0) {
      return Response.json({
        success: true,
        assessments,
        count: assessments.length,
        source: 'materialized_view',
      })
    }

    // Fallback: If RPC fails or returns empty data, query directly from base tables
    console.warn('Top assessments RPC returned empty or error, using fallback query', { rpcError })
    Sentry.captureMessage('Admin dashboard top assessments RPC fallback triggered', {
      level: 'warning',
      extra: { rpcError, limit },
    })

    // Direct query: aggregate assessment submissions
    const { data: submissions, error: fallbackError } = await supabase
      .from('assessment_submissions')
      .select('definition_id, total_score, high_risk_flag')
      .not('definition_id', 'is', null)

    if (fallbackError || !submissions) {
      console.error('Top assessments fallback query failed:', fallbackError)
      Sentry.captureException(fallbackError || new Error('Fallback query returned no data'), {
        tags: { endpoint: 'admin_dashboard_assessments' },
        extra: { limit },
      })
      return Response.json(
        { error: 'Failed to fetch assessments', details: 'Both primary and fallback queries failed' },
        { status: 503 }
      )
    }

    // Get assessment definitions for names and codes
    const { data: definitions, error: defError } = await supabase
      .from('assessment_definitions')
      .select('id, code, name_en')

    if (defError || !definitions) {
      console.error('Failed to fetch assessment definitions:', defError)
      Sentry.captureException(defError || new Error('Failed to fetch definitions'), {
        tags: { endpoint: 'admin_dashboard_assessments' },
      })
      return Response.json(
        { error: 'Failed to fetch assessment definitions' },
        { status: 503 }
      )
    }

    // Build definition map for quick lookup
    const defMap = new Map(definitions.map(d => [d.id, { code: d.code, name: d.name_en }]))

    // Aggregate submissions by definition
    const assessmentMap = new Map<string, {
      definition_id: string
      code: string
      name_en: string
      submissions: number
      scores: number[]
      high_risk: number
    }>()

    for (const sub of submissions) {
      const def = defMap.get(sub.definition_id)
      if (!def) continue

      const key = sub.definition_id
      if (!assessmentMap.has(key)) {
        assessmentMap.set(key, {
          definition_id: sub.definition_id,
          code: def.code,
          name_en: def.name,
          submissions: 0,
          scores: [],
          high_risk: 0,
        })
      }

      const agg = assessmentMap.get(key)!
      agg.submissions += 1
      if (sub.total_score !== null) agg.scores.push(sub.total_score)
      if (sub.high_risk_flag) agg.high_risk += 1
    }

    // Convert to response format and sort by submission count
    const topAssessments: TopAssessment[] = Array.from(assessmentMap.values())
      .map(agg => ({
        definition_id: agg.definition_id,
        code: agg.code,
        name_en: agg.name_en,
        total_submissions: agg.submissions,
        avg_score: agg.scores.length > 0
          ? Math.round((agg.scores.reduce((a, b) => a + b, 0) / agg.scores.length) * 100) / 100
          : 0,
        pct_high_risk: agg.submissions > 0
          ? Math.round((agg.high_risk / agg.submissions) * 1000) / 10
          : 0,
      }))
      .sort((a, b) => b.total_submissions - a.total_submissions)
      .slice(0, limit)

    return Response.json({
      success: true,
      assessments: topAssessments,
      count: topAssessments.length,
      source: 'fallback_live_query',
      warning: 'Using live query instead of cached materialized view',
    })
  } catch (error) {
    console.error('Assessments API error:', error)
    Sentry.captureException(error, {
      tags: { endpoint: 'admin_dashboard_assessments' },
    })
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
