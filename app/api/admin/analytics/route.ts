import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

function computeStats(values: number[]) {
  if (!values.length) return { avg: 0, median: 0, stddev: 0, min: 0, max: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const n = values.length
  const avg = values.reduce((s, v) => s + v, 0) / n
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]
  const variance = values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / n
  return {
    avg: +avg.toFixed(2),
    median: +median.toFixed(2),
    stddev: +Math.sqrt(variance).toFixed(2),
    min: sorted[0],
    max: sorted[n - 1],
  }
}

export async function GET() {
  try {
    await requireAdmin()
    const db = createAdminClient()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

    const [recent30Res, allSubsRes, defsRes, allUsersRes, recentUsersRes, prevPeriodRes] = await Promise.all([
      db.from('assessment_submissions')
        .select('id, definition_id, total_score, severity_band, high_risk_flag, submitted_at')
        .gte('submitted_at', thirtyDaysAgo)
        .order('submitted_at', { ascending: true }),
      db.from('assessment_submissions')
        .select('definition_id, total_score, high_risk_flag, severity_band')
        .limit(10000),
      db.from('assessment_definitions')
        .select('id, code, name_en, is_active'),
      db.from('profiles')
        .select('id, created_at, role'),
      db.from('profiles')
        .select('id, created_at')
        .gte('created_at', thirtyDaysAgo),
      db.from('assessment_submissions')
        .select('id', { count: 'exact', head: true })
        .gte('submitted_at', sixtyDaysAgo)
        .lt('submitted_at', thirtyDaysAgo),
    ])

    const subs30 = recent30Res.data || []
    const allSubs = allSubsRes.data || []
    const defs = defsRes.data || []
    const allUsers = allUsersRes.data || []
    const recentUsers = recentUsersRes.data || []

    // 30-day daily breakdown
    const dailySubMap: Record<string, { count: number; highRisk: number }> = {}
    for (const s of subs30) {
      const date = s.submitted_at.slice(0, 10)
      if (!dailySubMap[date]) dailySubMap[date] = { count: 0, highRisk: 0 }
      dailySubMap[date].count++
      if (s.high_risk_flag) dailySubMap[date].highRisk++
    }
    const dailySubmissions = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.now() - (29 - i) * 86400000)
      const date = d.toISOString().slice(0, 10)
      return {
        date,
        label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        submissions: dailySubMap[date]?.count || 0,
        highRisk: dailySubMap[date]?.highRisk || 0,
      }
    })

    // Severity distribution (all time)
    const severityMap: Record<string, number> = {}
    for (const s of allSubs) {
      const band = s.severity_band || 'Unknown'
      severityMap[band] = (severityMap[band] || 0) + 1
    }
    const totalSubs = allSubs.length
    const severityDistribution = Object.entries(severityMap)
      .map(([band, count]) => ({ band, count, percent: totalSubs ? +((count / totalSubs) * 100).toFixed(1) : 0 }))
      .sort((a, b) => b.count - a.count)

    // Per-assessment stats (all time)
    const assessMap: Record<string, { scores: number[]; highRisk: number; bands: Record<string, number> }> = {}
    for (const s of allSubs) {
      if (!assessMap[s.definition_id]) assessMap[s.definition_id] = { scores: [], highRisk: 0, bands: {} }
      assessMap[s.definition_id].scores.push(s.total_score ?? 0)
      if (s.high_risk_flag) assessMap[s.definition_id].highRisk++
      const b = s.severity_band || 'Unknown'
      assessMap[s.definition_id].bands[b] = (assessMap[s.definition_id].bands[b] || 0) + 1
    }
    const assessmentStats = defs.map(def => {
      const d = assessMap[def.id] || { scores: [], highRisk: 0, bands: {} }
      const st = computeStats(d.scores)
      return {
        id: def.id,
        code: def.code,
        name_en: def.name_en,
        is_active: def.is_active,
        count: d.scores.length,
        highRiskCount: d.highRisk,
        highRiskPct: d.scores.length ? +((d.highRisk / d.scores.length) * 100).toFixed(1) : 0,
        severityBands: d.bands,
        ...st,
      }
    }).filter(a => a.count > 0).sort((a, b) => b.count - a.count)

    // User growth (last 30 days)
    const userDailyMap: Record<string, number> = {}
    for (const u of recentUsers) {
      const date = u.created_at.slice(0, 10)
      userDailyMap[date] = (userDailyMap[date] || 0) + 1
    }
    const userGrowth = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.now() - (29 - i) * 86400000)
      const date = d.toISOString().slice(0, 10)
      return { date, label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), count: userDailyMap[date] || 0 }
    })

    // Role distribution
    const roleMap: Record<string, number> = {}
    for (const u of allUsers) roleMap[u.role] = (roleMap[u.role] || 0) + 1

    // Overall stats
    const allScores = allSubs.map(s => s.total_score ?? 0)
    const highRiskTotal = allSubs.filter(s => s.high_risk_flag).length
    const prevPeriodCount = (prevPeriodRes as any)?.count ?? 0
    const currentPeriodCount = subs30.length
    const periodChange = prevPeriodCount > 0
      ? +((currentPeriodCount - prevPeriodCount) / prevPeriodCount * 100).toFixed(1)
      : null

    const overallStats = {
      ...computeStats(allScores),
      total: allSubs.length,
      highRisk: highRiskTotal,
      highRiskPct: allSubs.length ? +((highRiskTotal / allSubs.length) * 100).toFixed(1) : 0,
      totalUsers: allUsers.length,
      newUsersThisMonth: recentUsers.length,
      last30DaySubmissions: currentPeriodCount,
      periodChange,
      roleDistribution: roleMap,
    }

    return NextResponse.json({ dailySubmissions, severityDistribution, assessmentStats, userGrowth, overallStats })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
