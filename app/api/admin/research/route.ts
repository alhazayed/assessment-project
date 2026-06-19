import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const AGE_GROUP_ORDER = ['Under 18', '18–24', '25–34', '35–44', '45–54', '55+', 'Unknown']

function getAgeGroup(dob: string | null, referenceDate: string): string {
  if (!dob) return 'Unknown'
  const birth = new Date(dob)
  const ref = new Date(referenceDate)
  if (isNaN(birth.getTime())) return 'Unknown'
  let age = ref.getFullYear() - birth.getFullYear()
  const m = ref.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--
  if (age < 0) return 'Unknown'
  if (age < 18) return 'Under 18'
  if (age <= 24) return '18–24'
  if (age <= 34) return '25–34'
  if (age <= 44) return '35–44'
  if (age <= 54) return '45–54'
  return '55+'
}

function calcStats(values: number[]) {
  if (!values.length) return { mean: 0, median: 0, n: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const n = values.length
  const mean = values.reduce((s, v) => s + v, 0) / n
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]
  return { mean: +mean.toFixed(2), median: +median.toFixed(2), n }
}

function groupByField(
  items: EnrichedSub[],
  field: keyof EnrichedSub,
  topN?: number,
) {
  const map: Record<string, number[]> = {}
  for (const s of items) {
    const key = String(s[field] ?? 'Unknown') || 'Unknown'
    if (!map[key]) map[key] = []
    map[key].push(s.score)
  }
  let result = Object.entries(map).map(([label, scores]) => {
    const st = calcStats(scores)
    return { label, meanScore: st.mean, median: st.median, sampleSize: st.n }
  }).sort((a, b) => b.sampleSize - a.sampleSize)
  if (topN) result = result.slice(0, topN)
  return result
}

function crossTab(items: EnrichedSub[], field: keyof EnrichedSub) {
  const map: Record<string, Record<string, number>> = {}
  const totals: Record<string, number> = {}
  for (const s of items) {
    const group = String(s[field] ?? 'Unknown') || 'Unknown'
    const sev = s.severity || 'Unknown'
    if (!map[group]) map[group] = {}
    map[group][sev] = (map[group][sev] || 0) + 1
    totals[group] = (totals[group] || 0) + 1
  }
  return Object.entries(map).map(([group, severities]) => ({
    group,
    total: totals[group],
    severities: Object.entries(severities).map(([sev, count]) => ({
      severity: sev,
      count,
      pct: +((count / totals[group]) * 100).toFixed(1),
    })).sort((a, b) => b.count - a.count),
  })).sort((a, b) => b.total - a.total)
}

interface EnrichedSub {
  id: string
  code: string
  name: string
  score: number
  severity: string
  highRisk: boolean
  submittedAt: string
  gender: string
  ageGroup: string
  education: string
  country: string
  employment: string
  medication: string
}

export async function GET() {
  try {
    await requireAdmin()
    const db = createAdminClient()

    const { data: rawSubs } = await db
      .from('assessment_submissions')
      .select(`
        id, total_score, severity_band, high_risk_flag, submitted_at,
        patient_id, definition_id,
        guest_dob, guest_gender, guest_education, guest_country,
        assessment_definitions(code, name_en),
        profiles(gender, date_of_birth, country_of_residence, educational_status,
          patient_profiles(employment_status, has_psychiatric_medications))
      `)
      .not('total_score', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(5000)

    const subs: EnrichedSub[] = (rawSubs || []).map((s: any) => {
      const p = s.profiles
      const pp = Array.isArray(p?.patient_profiles) ? p.patient_profiles[0] : p?.patient_profiles
      const dob = p?.date_of_birth || s.guest_dob || null
      const medVal = pp?.has_psychiatric_medications
      return {
        id: s.id,
        code: s.assessment_definitions?.code || 'Unknown',
        name: s.assessment_definitions?.name_en || 'Unknown',
        score: s.total_score ?? 0,
        severity: s.severity_band || 'Unknown',
        highRisk: !!s.high_risk_flag,
        submittedAt: s.submitted_at,
        gender: (p?.gender || s.guest_gender || 'Unknown').replace(/^./, (c: string) => c.toUpperCase()),
        ageGroup: getAgeGroup(dob, s.submitted_at),
        education: (p?.educational_status || s.guest_education || 'Unknown'),
        country: p?.country_of_residence || s.guest_country || 'Unknown',
        employment: pp?.employment_status || 'Unknown',
        medication: medVal === true ? 'Yes' : medVal === false ? 'No' : 'Unknown',
      }
    })

    // --- Per-assessment grouping ---
    const byCode: Record<string, EnrichedSub[]> = {}
    for (const s of subs) {
      if (!byCode[s.code]) byCode[s.code] = []
      byCode[s.code].push(s)
    }

    const demographicAnalysis: Record<string, any> = {}
    for (const [code, items] of Object.entries(byCode)) {
      demographicAnalysis[code] = {
        name: items[0]?.name || code,
        total: items.length,
        gender: groupByField(items, 'gender'),
        ageGroup: groupByField(items, 'ageGroup').sort(
          (a, b) => AGE_GROUP_ORDER.indexOf(a.label) - AGE_GROUP_ORDER.indexOf(b.label)
        ),
        education: groupByField(items, 'education'),
        employment: groupByField(items, 'employment'),
        country: groupByField(items, 'country', 10),
        medication: groupByField(items, 'medication'),
      }
    }

    // --- Cross-tab analysis (all assessments combined) ---
    const crossTabAnalysis = {
      genderBySeverity: crossTab(subs, 'gender'),
      ageGroupBySeverity: crossTab(subs, 'ageGroup').sort(
        (a, b) => AGE_GROUP_ORDER.indexOf(a.group) - AGE_GROUP_ORDER.indexOf(b.group)
      ),
      countryBySeverity: crossTab(subs, 'country').slice(0, 10),
      medicationBySeverity: crossTab(subs, 'medication'),
      employmentBySeverity: crossTab(subs, 'employment'),
    }

    // --- Trends ---
    const buildTrends = (period: 'weekly' | 'monthly' | 'quarterly') => {
      const buckets: Record<string, { scores: number[]; highRisk: number }> = {}
      const order: string[] = []
      for (const s of [...subs].reverse()) { // ascending time
        const d = new Date(s.submittedAt)
        let label = ''
        if (period === 'weekly') {
          const weekNum = Math.ceil(d.getDate() / 7)
          label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-W${weekNum}`
        } else if (period === 'monthly') {
          label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        } else {
          label = `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`
        }
        if (!buckets[label]) { buckets[label] = { scores: [], highRisk: 0 }; order.push(label) }
        buckets[label].scores.push(s.score)
        if (s.highRisk) buckets[label].highRisk++
      }
      return order.map(label => {
        const d = buckets[label]
        const mean = d.scores.length ? +(d.scores.reduce((a, b) => a + b, 0) / d.scores.length).toFixed(2) : 0
        return { label, count: d.scores.length, mean, highRisk: d.highRisk }
      }).slice(-24)
    }

    const trends = {
      weekly: buildTrends('weekly'),
      monthly: buildTrends('monthly'),
      quarterly: buildTrends('quarterly'),
    }

    // --- Clinical Insights ---
    const insights: { type: 'info' | 'warning' | 'success'; text: string }[] = []

    // Most active assessment
    const topAssessEntry = Object.entries(byCode).sort((a, b) => b[1].length - a[1].length)[0]
    if (topAssessEntry) {
      const [code, items] = topAssessEntry
      const hrPct = ((items.filter(s => s.highRisk).length / items.length) * 100).toFixed(1)
      insights.push({ type: 'info', text: `${code} is the most frequently completed assessment (n=${items.length}), with a ${hrPct}% high-risk rate.` })
    }

    // Severity distribution insight
    const severityMap: Record<string, number> = {}
    for (const s of subs) { severityMap[s.severity] = (severityMap[s.severity] || 0) + 1 }
    const topSeverity = Object.entries(severityMap).sort((a, b) => b[1] - a[1])[0]
    if (topSeverity && subs.length > 0) {
      const pct = ((topSeverity[1] / subs.length) * 100).toFixed(1)
      const isHigh = ['Severe', 'Moderately Severe', 'High', 'Crisis'].some(k => topSeverity[0].includes(k))
      insights.push({
        type: isHigh ? 'warning' : 'info',
        text: `"${topSeverity[0]}" is the most common severity category, representing ${pct}% of all assessment results.`
      })
    }

    // Gender score difference
    const genderMap: Record<string, number[]> = {}
    for (const s of subs) {
      if (s.gender !== 'Unknown') {
        if (!genderMap[s.gender]) genderMap[s.gender] = []
        genderMap[s.gender].push(s.score)
      }
    }
    const genderStats = Object.entries(genderMap)
      .filter(([, v]) => v.length >= 5)
      .map(([g, scores]) => ({ gender: g, mean: scores.reduce((a, b) => a + b, 0) / scores.length, n: scores.length }))
      .sort((a, b) => b.mean - a.mean)
    if (genderStats.length >= 2 && genderStats[0].mean - genderStats[genderStats.length - 1].mean >= 1.5) {
      insights.push({
        type: 'info',
        text: `${genderStats[0].gender} participants show higher average scores (${genderStats[0].mean.toFixed(1)}) compared to ${genderStats[genderStats.length - 1].gender} participants (${genderStats[genderStats.length - 1].mean.toFixed(1)}).`
      })
    }

    // Medication insight
    const medYes = subs.filter(s => s.medication === 'Yes')
    const medNo = subs.filter(s => s.medication === 'No')
    if (medYes.length >= 5 && medNo.length >= 5) {
      const meanYes = medYes.reduce((a, s) => a + s.score, 0) / medYes.length
      const meanNo = medNo.reduce((a, s) => a + s.score, 0) / medNo.length
      if (meanYes > meanNo + 1.5) {
        insights.push({
          type: 'warning',
          text: `Participants using psychiatric medication report higher average scores (${meanYes.toFixed(1)} vs ${meanNo.toFixed(1)}), indicating greater symptom burden in the medicated group (n=${medYes.length} vs n=${medNo.length}).`
        })
      }
    }

    // Age group insight
    const ageGroupMap: Record<string, number[]> = {}
    for (const s of subs) {
      if (s.ageGroup !== 'Unknown') {
        if (!ageGroupMap[s.ageGroup]) ageGroupMap[s.ageGroup] = []
        ageGroupMap[s.ageGroup].push(s.score)
      }
    }
    const ageMeans = Object.entries(ageGroupMap)
      .filter(([, v]) => v.length >= 5)
      .map(([g, scores]) => ({ group: g, mean: scores.reduce((a, b) => a + b, 0) / scores.length, n: scores.length }))
      .sort((a, b) => b.mean - a.mean)
    if (ageMeans.length >= 2) {
      insights.push({
        type: 'info',
        text: `The ${ageMeans[0].group} age group shows the highest average scores (${ageMeans[0].mean.toFixed(1)}, n=${ageMeans[0].n}), while ${ageMeans[ageMeans.length - 1].group} shows the lowest (${ageMeans[ageMeans.length - 1].mean.toFixed(1)}, n=${ageMeans[ageMeans.length - 1].n}).`
      })
    }

    // High-risk trend
    if (subs.length >= 20) {
      const half = Math.floor(subs.length / 2)
      const recent = subs.slice(0, half)
      const older = subs.slice(half)
      const recentRiskPct = (recent.filter(s => s.highRisk).length / recent.length) * 100
      const olderRiskPct = (older.filter(s => s.highRisk).length / older.length) * 100
      if (olderRiskPct > 0) {
        const change = ((recentRiskPct - olderRiskPct) / olderRiskPct) * 100
        if (Math.abs(change) >= 10) {
          insights.push({
            type: change > 0 ? 'warning' : 'success',
            text: `High-risk flags have ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(0)}% in the recent period compared to the earlier period (${recentRiskPct.toFixed(1)}% vs ${olderRiskPct.toFixed(1)}%).`
          })
        }
      }
    }

    // Employment insight (students vs employed)
    const empMap: Record<string, number[]> = {}
    for (const s of subs) {
      if (s.employment !== 'Unknown') {
        const key = s.employment.toLowerCase()
        if (!empMap[key]) empMap[key] = []
        empMap[key].push(s.score)
      }
    }
    const studentScores = empMap['student'] || []
    const employedScores = empMap['employed'] || []
    if (studentScores.length >= 3 && employedScores.length >= 3) {
      const studentMean = studentScores.reduce((a, b) => a + b, 0) / studentScores.length
      const employedMean = employedScores.reduce((a, b) => a + b, 0) / employedScores.length
      if (studentMean > employedMean + 1) {
        insights.push({
          type: 'info',
          text: `Students show elevated average scores (${studentMean.toFixed(1)}) compared to employed participants (${employedMean.toFixed(1)}), suggesting higher reported symptom burden.`
        })
      }
    }

    if (insights.length === 0) {
      insights.push({ type: 'info', text: 'Insufficient data to generate statistical insights. Complete more assessments to unlock pattern analysis.' })
    }

    // --- Assessment distribution ---
    const assessmentDistribution = Object.entries(byCode).map(([code, items]) => ({
      code,
      name: items[0]?.name || code,
      count: items.length,
      pct: subs.length ? +((items.length / subs.length) * 100).toFixed(1) : 0,
      highRiskCount: items.filter(s => s.highRisk).length,
      highRiskPct: +((items.filter(s => s.highRisk).length / items.length) * 100).toFixed(1),
    })).sort((a, b) => b.count - a.count)

    // --- Risk distribution ---
    const riskMap = { Low: 0, Moderate: 0, High: 0, Crisis: 0 }
    for (const s of subs) {
      if (s.highRisk) riskMap.High++
      else riskMap.Low++
    }
    const riskDistribution = Object.entries(riskMap).map(([level, count]) => ({
      level, count, pct: subs.length ? +((count / subs.length) * 100).toFixed(1) : 0
    })).filter(r => r.count > 0)

    // --- Overall executive stats ---
    const execStats = {
      totalUsers: new Set(subs.filter(s => s.id).map(s => s.id)).size,
      totalAssessments: subs.length,
      highRiskCount: subs.filter(s => s.highRisk).length,
      highRiskPct: subs.length ? +((subs.filter(s => s.highRisk).length / subs.length) * 100).toFixed(1) : 0,
      mostCommon: topAssessEntry?.[0] || '—',
      severityBreakdown: severityMap,
    }

    return NextResponse.json({
      demographicAnalysis,
      crossTabAnalysis,
      trends,
      insights,
      assessmentDistribution,
      riskDistribution,
      execStats,
      totalRecords: subs.length,
    })
  } catch (e) {
    console.error('Research API error:', e)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
