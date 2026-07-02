import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    await requireAdmin()
    const db = createAdminClient()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

    const [recent30Res, defsRes, allUsersRes, recentUsersRes, prevPeriodRes,
      allTimeTotalsRes, severityDistRes, assessStatsRes,
      totalCountRes, highRiskCountRes] = await Promise.all([
      // Last 30 days for daily chart only — small window
      db.from('assessment_submissions')
        .select('id, definition_id, high_risk_flag, submitted_at')
        .gte('submitted_at', thirtyDaysAgo)
        .order('submitted_at', { ascending: true }),
      db.from('assessment_definitions')
        .select('id, code, name_en, is_active'),
      db.from('profiles').select('id, created_at, role'),
      db.from('profiles').select('id, created_at').gte('created_at', thirtyDaysAgo),
      db.from('assessment_submissions')
        .select('id', { count: 'exact', head: true })
        .gte('submitted_at', sixtyDaysAgo)
        .lt('submitted_at', thirtyDaysAgo),
      // All-time aggregate stats via DB — no full table scan in Lambda
      db.from('assessment_submissions')
        .select('total_score, high_risk_flag', { count: 'exact' })
        .not('total_score', 'is', null)
        .limit(5000), // cap for score stats; sufficient for stddev
      db.from('assessment_submissions')
        .select('severity_band')
        .not('severity_band', 'is', null)
        .limit(5000),
      db.from('assessment_submissions')
        .select('definition_id, total_score, high_risk_flag, severity_band')
        .limit(5000),
      // True totals (not derived from the capped score sample).
      db.from('assessment_submissions').select('id', { count: 'exact', head: true }),
      db.from('assessment_submissions').select('id', { count: 'exact', head: true }).eq('high_risk_flag', true),
    ])

    const subs30 = recent30Res.data || []
    const defs = defsRes.data || []
    const allUsers = allUsersRes.data || []
    const recentUsers = recentUsersRes.data || []
    const allTimeSubs = allTimeTotalsRes.data || []
    const severitySubs = severityDistRes.data || []
    const assessRaw = assessStatsRes.data || []

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

    // Severity distribution
    const severityMap: Record<string, number> = {}
    for (const s of severitySubs) {
      const band = s.severity_band || 'Unknown'
      severityMap[band] = (severityMap[band] || 0) + 1
    }
    const totalForSeverity = severitySubs.length
    const severityDistribution = Object.entries(severityMap)
      .map(([band, count]) => ({ band, count, percent: totalForSeverity ? +((count / totalForSeverity) * 100).toFixed(1) : 0 }))
      .sort((a, b) => b.count - a.count)

    // Per-assessment stats
    const assessMap: Record<string, { scores: number[]; highRisk: number; bands: Record<string, number> }> = {}
    for (const s of assessRaw) {
      if (!assessMap[s.definition_id]) assessMap[s.definition_id] = { scores: [], highRisk: 0, bands: {} }
      assessMap[s.definition_id].scores.push(s.total_score ?? 0)
      if (s.high_risk_flag) assessMap[s.definition_id].highRisk++
      const b = s.severity_band || 'Unknown'
      assessMap[s.definition_id].bands[b] = (assessMap[s.definition_id].bands[b] || 0) + 1
    }
    const assessmentStats = defs.map(def => {
      const d = assessMap[def.id] || { scores: [], highRisk: 0, bands: {} }
      const scores = d.scores
      const n = scores.length
      if (n === 0) return null
      const sorted = [...scores].sort((a, b) => a - b)
      const avg = scores.reduce((s, v) => s + v, 0) / n
      const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]
      const variance = scores.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / n
      return {
        id: def.id,
        code: def.code,
        name_en: def.name_en,
        is_active: def.is_active,
        count: n,
        highRiskCount: d.highRisk,
        highRiskPct: n ? +((d.highRisk / n) * 100).toFixed(1) : 0,
        severityBands: d.bands,
        avg: +avg.toFixed(2),
        median: +median.toFixed(2),
        stddev: +Math.sqrt(variance).toFixed(2),
        min: sorted[0],
        max: sorted[n - 1],
      }
    }).filter(Boolean).sort((a, b) => b!.count - a!.count)

    // User growth
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

    // Overall stats from capped sample
    const allScores = allTimeSubs.map(s => s.total_score ?? 0)
    const n = allScores.length
    // True counts across all submissions, independent of the capped score sample.
    const totalSubmissions = totalCountRes.count ?? n
    const highRiskTotal = highRiskCountRes.count ?? allTimeSubs.filter(s => s.high_risk_flag).length
    const sorted = [...allScores].sort((a, b) => a - b)
    const avg = n ? allScores.reduce((s, v) => s + v, 0) / n : 0
    const median = n === 0 ? 0 : n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]
    const variance = n ? allScores.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / n : 0
    const prevPeriodCount = (prevPeriodRes as any)?.count ?? 0
    const currentPeriodCount = subs30.length
    const periodChange = prevPeriodCount > 0
      ? +((currentPeriodCount - prevPeriodCount) / prevPeriodCount * 100).toFixed(1)
      : null

    const overallStats = {
      avg: +avg.toFixed(2),
      median: +median.toFixed(2),
      stddev: +Math.sqrt(variance).toFixed(2),
      min: n ? sorted[0] : 0,
      max: n ? sorted[n - 1] : 0,
      total: totalSubmissions,
      highRisk: highRiskTotal,
      highRiskPct: totalSubmissions ? +((highRiskTotal / totalSubmissions) * 100).toFixed(1) : 0,
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
