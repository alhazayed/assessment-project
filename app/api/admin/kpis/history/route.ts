import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// Real daily series for the executive trend charts, sourced from the
// Phase 1 `admin_daily_stats` materialized view (columns that actually exist
// in the live DB: stat_date, total_submissions, high_risk_count,
// unique_patients, avg_score).
export const dynamic = 'force-dynamic'

type SeriesPoint = {
  date: string // ISO yyyy-mm-dd
  label: string // short display label
  submissions: number
  highRisk: number
  patients: number
  avgScore: number
}

export async function GET(request: NextRequest) {
  try {
    // Auth: admin or superadmin (HMAC admin session). Using the shared gate
    // instead of an inline `role === 'admin'` check, which wrongly excluded
    // superadmin — the only admin-tier role in the live DB — and 403'd the
    // trend charts.
    await requireAdmin()
    const db = createAdminClient()

    const { searchParams } = new URL(request.url)
    const requestedDays = parseInt(searchParams.get('days') || '30', 10)
    const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30

    // Window start (inclusive), normalized to UTC midnight
    const start = new Date()
    start.setUTCHours(0, 0, 0, 0)
    start.setUTCDate(start.getUTCDate() - (days - 1))
    const startIso = start.toISOString().slice(0, 10)

    const { data: rows, error } = await db
      .from('admin_daily_stats')
      .select('stat_date, total_submissions, high_risk_count, unique_patients, avg_score')
      .gte('stat_date', startIso)
      .order('stat_date', { ascending: true })

    if (error) {
      console.error('admin_daily_stats query failed:', error.message)
      return NextResponse.json(
        { error: 'Failed to load trend data', detail: error.message },
        { status: 500 }
      )
    }

    // Index real rows by date so we can fill gaps with zeroes — a continuous
    // axis reads far better than a chart with holes in it.
    const byDate = new Map<string, NonNullable<typeof rows>[number]>()
    for (const r of rows || []) {
      byDate.set(String(r.stat_date), r)
    }

    const series: SeriesPoint[] = []
    for (let i = 0; i < days; i++) {
      const d = new Date(start)
      d.setUTCDate(start.getUTCDate() + i)
      const iso = d.toISOString().slice(0, 10)
      const row = byDate.get(iso)
      series.push({
        date: iso,
        label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
        submissions: Number(row?.total_submissions ?? 0),
        highRisk: Number(row?.high_risk_count ?? 0),
        patients: Number(row?.unique_patients ?? 0),
        avgScore: row?.avg_score != null ? Number(row.avg_score) : 0,
      })
    }

    return NextResponse.json({
      days,
      source: 'admin_daily_stats',
      hasData: (rows?.length ?? 0) > 0,
      series,
    })
  } catch (err: any) {
    if (err?.digest?.toString().startsWith('NEXT_REDIRECT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('KPI history fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
