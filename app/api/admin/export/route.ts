import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// Prevent CSV formula injection (DDE attack) — prefix cells starting with formula chars
function csvSafe(value: string): string {
  if (/^[=+\-@|%\t\r]/.test(value)) return `'${value}`
  return value
}

function computeStats(values: number[]) {
  if (!values.length) return { avg: 0, median: 0, stddev: 0, min: 0, max: 0, count: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const n = values.length
  const avg = values.reduce((s, v) => s + v, 0) / n
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]
  const variance = values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / n
  return {
    count: n,
    avg: +avg.toFixed(2),
    median: +median.toFixed(2),
    stddev: +Math.sqrt(variance).toFixed(2),
    min: sorted[0],
    max: sorted[n - 1],
  }
}

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const assessment = searchParams.get('assessment') || ''
    const severity = searchParams.get('severity') || ''
    const from = searchParams.get('from') || ''
    const to = searchParams.get('to') || ''
    const format = searchParams.get('format') || 'detailed'

    const db = createAdminClient()
    let query = db.from('assessment_submissions')
      .select('id, total_score, severity_band, high_risk_flag, submitted_at, patient_id, definition_id, assessment_definitions(name_en, code), profiles(full_name_en)')
      .order('submitted_at', { ascending: false })
      .limit(10000)

    if (from) query = query.gte('submitted_at', from)
    if (to) query = query.lte('submitted_at', to + 'T23:59:59')
    if (severity === 'high_risk') query = query.eq('high_risk_flag', true)

    const { data: subs } = await query

    let rows = (subs || []).map((s: any) => ({
      id: s.id,
      patient: s.profiles?.full_name_en || 'Anonymous',
      assessment: s.assessment_definitions?.name_en || '',
      code: s.assessment_definitions?.code || '',
      score: s.total_score ?? 0,
      severity: s.severity_band || '',
      high_risk: s.high_risk_flag ? 'YES' : 'NO',
      submitted_at: s.submitted_at,
      definition_id: s.definition_id,
    }))

    if (assessment) rows = rows.filter((r: any) => r.code === assessment)
    if (severity && severity !== 'high_risk') {
      rows = rows.filter((r: any) => (r.severity || '').toLowerCase().includes(severity))
    }

    const dateStr = new Date().toISOString().split('T')[0]
    let csv: string
    let filename: string

    if (format === 'stats') {
      // Aggregate statistics grouped by assessment
      const assessMap: Record<string, { name: string; scores: number[]; highRisk: number; bands: Record<string, number> }> = {}
      for (const r of rows) {
        if (!assessMap[r.code]) assessMap[r.code] = { name: r.assessment, scores: [], highRisk: 0, bands: {} }
        assessMap[r.code].scores.push(r.score)
        if (r.high_risk === 'YES') assessMap[r.code].highRisk++
        assessMap[r.code].bands[r.severity] = (assessMap[r.code].bands[r.severity] || 0) + 1
      }

      const headers = ['Code', 'Assessment', 'Count', 'Mean Score', 'Median Score', 'Std Dev', 'Min Score', 'Max Score', 'High Risk Count', 'High Risk %', 'Top Severity Band']
      const dataRows = Object.entries(assessMap).map(([code, d]) => {
        const st = computeStats(d.scores)
        const topBand = Object.entries(d.bands).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
        const hrPct = st.count ? +((d.highRisk / st.count) * 100).toFixed(1) : 0
        return [
          csvSafe(code), `"${csvSafe(d.name)}"`, st.count, st.avg, st.median, st.stddev, st.min, st.max,
          d.highRisk, hrPct, `"${csvSafe(topBand)}"`,
        ].join(',')
      }).sort()

      csv = [
        `"Assessment Summary Statistics — Generated ${new Date().toLocaleString()}"`,
        '',
        headers.join(','),
        ...dataRows,
      ].join('\n')
      filename = `stats-summary-${dateStr}.csv`

    } else if (format === 'risk') {
      // High-risk only with patient contact info context
      const riskRows = rows.filter(r => r.high_risk === 'YES')
      const headers = ['Submission ID', 'Patient', 'Assessment', 'Code', 'Score', 'Severity', 'Submitted At']
      const dataRows = riskRows.map(r => [
        r.id, `"${csvSafe(r.patient)}"`, `"${csvSafe(r.assessment)}"`, csvSafe(r.code),
        r.score, `"${csvSafe(r.severity)}"`, new Date(r.submitted_at).toISOString(),
      ].join(','))

      csv = [
        `"High-Risk Assessment Report — Generated ${new Date().toLocaleString()}"`,
        `"Total high-risk flags: ${riskRows.length}"`,
        '',
        headers.join(','),
        ...dataRows,
      ].join('\n')
      filename = `high-risk-report-${dateStr}.csv`

    } else {
      // Detailed row-by-row export
      const headers = ['ID', 'Patient', 'Assessment', 'Code', 'Score', 'Severity', 'High Risk', 'Submitted At']
      const dataRows = rows.map(r => [
        r.id, `"${csvSafe(r.patient)}"`, `"${csvSafe(r.assessment)}"`, csvSafe(r.code),
        r.score, `"${csvSafe(r.severity)}"`, r.high_risk, new Date(r.submitted_at).toISOString(),
      ].join(','))

      csv = [headers.join(','), ...dataRows].join('\n')
      filename = `results-${dateStr}.csv`
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
