import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { buildContentDisposition, getMimeTypeForFormat } from '@/lib/security/file-export'

function csvSafe(value: string): string {
  if (/^[=+\-@|%\t\r]/.test(String(value))) return `'${value}`
  return String(value)
}

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

function computeStats(values: number[]) {
  if (!values.length) return { avg: 0, median: 0, stddev: 0, min: 0, max: 0, count: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const n = values.length
  const avg = values.reduce((s, v) => s + v, 0) / n
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]
  const variance = values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / n
  return { count: n, avg: +avg.toFixed(2), median: +median.toFixed(2), stddev: +Math.sqrt(variance).toFixed(2), min: sorted[0], max: sorted[n - 1] }
}

function rowsToCsv(headers: string[], rows: (string | number | boolean)[][]): string {
  const esc = (v: any) => {
    // Apply the formula-injection guard FIRST so a value that also needs quoting
    // (e.g. "=cmd(),x") still gets the leading apostrophe. Otherwise the
    // quote-wrap branch returned "=cmd(),x" and Excel parses the leading = as a
    // formula once it strips the CSV quotes on import.
    const s = csvSafe(String(v ?? ''))
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  return [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
}

export async function GET(request: Request) {
  try {
    const { user: adminUser } = await requireAdmin()
    const rl = await checkRateLimit(`admin-export:${adminUser.id}`, { limit: 10, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Export rate limit reached. Please wait before exporting again.' }, { status: 429, headers: { 'Retry-After': '3600' } })
    }

    const { searchParams } = new URL(request.url)
    const assessment = searchParams.get('assessment') || ''
    const severity = searchParams.get('severity') || ''
    const from = searchParams.get('from') || ''
    const to = searchParams.get('to') || ''
    const format = searchParams.get('format') || 'csv'

    const db = createAdminClient()
    let query = db.from('assessment_submissions')
      .select(`
        id, total_score, severity_band, high_risk_flag, submitted_at,
        patient_id, definition_id,
        guest_dob, guest_gender, guest_education, guest_country,
        assessment_definitions(name_en, code),
        profiles(gender, date_of_birth, country_of_residence, educational_status,
          patient_profiles(employment_status, has_psychiatric_medications))
      `)
      .order('submitted_at', { ascending: false })
      .limit(10000)

    if (from) query = query.gte('submitted_at', from)
    if (to) query = query.lte('submitted_at', to + 'T23:59:59')
    if (severity === 'high_risk') query = query.eq('high_risk_flag', true)

    const { data: subs } = await query

    let rows = (subs || []).map((s: any) => {
      const p = s.profiles
      const pp = Array.isArray(p?.patient_profiles) ? p.patient_profiles[0] : p?.patient_profiles
      const dob = p?.date_of_birth || s.guest_dob || null
      const medVal = pp?.has_psychiatric_medications
      return {
        id: s.id,
        code: s.assessment_definitions?.code || '',
        assessment: s.assessment_definitions?.name_en || '',
        score: s.total_score ?? 0,
        severity: s.severity_band || '',
        highRisk: s.high_risk_flag ? 'Yes' : 'No',
        submittedAt: s.submitted_at,
        gender: (p?.gender || s.guest_gender || 'Unknown').replace(/^./, (c: string) => c.toUpperCase()),
        ageGroup: getAgeGroup(dob, s.submitted_at),
        country: p?.country_of_residence || s.guest_country || 'Unknown',
        education: p?.educational_status || s.guest_education || 'Unknown',
        employment: pp?.employment_status || 'Unknown',
        medication: medVal === true ? 'Yes' : medVal === false ? 'No' : 'Unknown',
      }
    })

    if (assessment) rows = rows.filter((r: any) => r.code === assessment)
    if (severity && severity !== 'high_risk') rows = rows.filter((r: any) => (r.severity || '').toLowerCase().includes(severity.toLowerCase()))

    // Audit log — record who exported what and how many rows
    try {
      await db.from('audit_log').insert({
        actor_id: adminUser.id,
        action: 'data_export',
        target_type: 'assessment_submissions',
        target_id: adminUser.id,
        details: { format, row_count: rows.length, filters: { assessment, severity, from, to } },
      })
    } catch (auditErr) {
      console.error('[admin/export] audit log failed (non-fatal):', auditErr instanceof Error ? auditErr.message : 'unknown')
    }

    const dateStr = new Date().toISOString().split('T')[0]

    // --- CSV export (anonymized, with demographics) ---
    if (format === 'csv' || format === 'detailed') {
      const headers = ['Record ID', 'Assessment Type', 'Code', 'Date', 'Age Group', 'Gender', 'Country', 'Education', 'Employment', 'Medication Use', 'Score', 'Severity', 'High Risk']
      const dataRows = rows.map(r => [r.id, r.assessment, r.code, new Date(r.submittedAt).toISOString().split('T')[0], r.ageGroup, r.gender, r.country, r.education, r.employment, r.medication, r.score, r.severity, r.highRisk])
      const csv = rowsToCsv(headers, dataRows)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': getMimeTypeForFormat('csv'),
          'Content-Disposition': buildContentDisposition(`anonymized-dataset-${dateStr}.csv`),
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
        },
      })
    }

    // --- Stats CSV ---
    if (format === 'stats') {
      const assessMap: Record<string, { name: string; scores: number[]; highRisk: number; bands: Record<string, number> }> = {}
      for (const r of rows) {
        if (!assessMap[r.code]) assessMap[r.code] = { name: r.assessment, scores: [], highRisk: 0, bands: {} }
        assessMap[r.code].scores.push(r.score)
        if (r.highRisk === 'Yes') assessMap[r.code].highRisk++
        assessMap[r.code].bands[r.severity] = (assessMap[r.code].bands[r.severity] || 0) + 1
      }
      const headers = ['Code', 'Assessment', 'Count', 'Mean Score', 'Median Score', 'Std Dev', 'Min', 'Max', 'High Risk Count', 'High Risk %', 'Top Severity Band']
      const dataRows = Object.entries(assessMap).map(([code, d]) => {
        const st = computeStats(d.scores)
        const topBand = Object.entries(d.bands).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
        const hrPct = st.count ? +((d.highRisk / st.count) * 100).toFixed(1) : 0
        return [code, d.name, st.count, st.avg, st.median, st.stddev, st.min, st.max, d.highRisk, hrPct, topBand]
      }).sort((a, b) => (b[2] as number) - (a[2] as number))
      const csv = rowsToCsv(headers, dataRows)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': getMimeTypeForFormat('csv'),
          'Content-Disposition': buildContentDisposition(`stats-summary-${dateStr}.csv`),
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
        },
      })
    }

    // --- Risk CSV ---
    if (format === 'risk') {
      const riskRows = rows.filter(r => r.highRisk === 'Yes')
      const headers = ['Record ID', 'Assessment', 'Code', 'Date', 'Score', 'Severity', 'Age Group', 'Gender', 'Country']
      const dataRows = riskRows.map(r => [r.id, r.assessment, r.code, new Date(r.submittedAt).toISOString().split('T')[0], r.score, r.severity, r.ageGroup, r.gender, r.country])
      const csv = rowsToCsv(headers, dataRows)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': getMimeTypeForFormat('csv'),
          'Content-Disposition': buildContentDisposition(`high-risk-report-${dateStr}.csv`),
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
        },
      })
    }

    // --- Demographics CSV ---
    if (format === 'demographics') {
      // Build demographic breakdown by assessment
      const byCode: Record<string, typeof rows> = {}
      for (const r of rows) {
        if (!byCode[r.code]) byCode[r.code] = []
        byCode[r.code].push(r)
      }
      const csvSections: string[] = [`"Demographic Analysis Report — Generated ${new Date().toLocaleString()}"`, `"Total Records: ${rows.length}"`, '']
      for (const [code, items] of Object.entries(byCode)) {
        csvSections.push(`"${code} — ${items[0].assessment} (n=${items.length})"`)
        // Gender breakdown
        const genderMap: Record<string, number[]> = {}
        for (const r of items) {
          if (!genderMap[r.gender]) genderMap[r.gender] = []
          genderMap[r.gender].push(r.score)
        }
        csvSections.push('"Gender,Count,Mean Score"')
        for (const [g, scores] of Object.entries(genderMap)) {
          const mean = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
          csvSections.push(`"${g}",${scores.length},${mean}`)
        }
        csvSections.push('')
      }
      const csv = csvSections.join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': getMimeTypeForFormat('csv'),
          'Content-Disposition': buildContentDisposition(`demographic-analysis-${dateStr}.csv`),
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
        },
      })
    }

    // --- PDF export (HTML print-ready) ---
    if (format === 'pdf') {
      const assessMap: Record<string, { name: string; scores: number[]; highRisk: number }> = {}
      for (const r of rows) {
        if (!assessMap[r.code]) assessMap[r.code] = { name: r.assessment, scores: [], highRisk: 0 }
        assessMap[r.code].scores.push(r.score)
        if (r.highRisk === 'Yes') assessMap[r.code].highRisk++
      }
      const summaryRows = Object.entries(assessMap).map(([code, d]) => {
        const st = computeStats(d.scores)
        const hrPct = st.count ? ((d.highRisk / st.count) * 100).toFixed(1) : '0'
        return `<tr><td>${code}</td><td>${d.name}</td><td>${st.count}</td><td>${st.avg}</td><td>${st.median}</td><td>${st.stddev}</td><td>${d.highRisk} (${hrPct}%)</td></tr>`
      }).join('')

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>V Welfare Analytics Report</title>
<style>
body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#1a1a1a}
h1{color:#12273C;font-size:18px;margin-bottom:4px}
h2{color:#1D6296;font-size:13px;margin-top:20px;border-bottom:1px solid #ddd;padding-bottom:4px}
table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11px}
th{background:#12273C;color:white;padding:5px 8px;text-align:left}
td{padding:4px 8px;border-bottom:1px solid #eee}
tr:nth-child(even) td{background:#f9f9f9}
.meta{color:#666;font-size:11px;margin-bottom:16px}
.stat-grid{display:flex;gap:16px;flex-wrap:wrap;margin-top:8px}
.stat-card{border:1px solid #ddd;border-radius:6px;padding:10px 16px;min-width:120px}
.stat-val{font-size:22px;font-weight:bold;color:#12273C}
.stat-lbl{font-size:10px;color:#666;margin-top:2px}
@media print{@page{margin:15mm}}
</style></head><body>
<h1>V Welfare — Analytics Report</h1>
<p class="meta">Generated: ${new Date().toLocaleString()} | Total Records: ${rows.length} | Filter: ${assessment || 'All'}</p>
<div class="stat-grid">
  <div class="stat-card"><div class="stat-val">${rows.length}</div><div class="stat-lbl">Total Assessments</div></div>
  <div class="stat-card"><div class="stat-val">${rows.filter(r => r.highRisk === 'Yes').length}</div><div class="stat-lbl">High-Risk Flags</div></div>
  <div class="stat-card"><div class="stat-val">${rows.length ? (rows.reduce((a, r) => a + r.score, 0) / rows.length).toFixed(1) : 0}</div><div class="stat-lbl">Mean Score</div></div>
</div>
<h2>Assessment Summary Statistics</h2>
<table><thead><tr><th>Code</th><th>Assessment</th><th>Count</th><th>Mean</th><th>Median</th><th>Std Dev</th><th>High Risk</th></tr></thead><tbody>${summaryRows}</tbody></table>
<h2>Anonymized Records (first 200)</h2>
<table><thead><tr><th>Record ID</th><th>Assessment</th><th>Date</th><th>Age Group</th><th>Gender</th><th>Country</th><th>Score</th><th>Severity</th><th>High Risk</th></tr></thead><tbody>
${rows.slice(0, 200).map(r => `<tr><td>${r.id.slice(0, 8)}…</td><td>${r.assessment}</td><td>${new Date(r.submittedAt).toLocaleDateString()}</td><td>${r.ageGroup}</td><td>${r.gender}</td><td>${r.country}</td><td>${r.score}</td><td>${r.severity}</td><td>${r.highRisk}</td></tr>`).join('')}
</tbody></table>
<p class="meta" style="margin-top:20px;font-style:italic">This report contains anonymized data only. No personally identifiable information (PII) is included. Compliant with GDPR and HIPAA-inspired privacy practices.</p>
<script>window.onload=()=>window.print()</script>
</body></html>`

      return new NextResponse(html, {
        headers: {
          'Content-Type': getMimeTypeForFormat('html'),
          'Content-Disposition': buildContentDisposition(`analytics-report-${dateStr}.html`, true),
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
        },
      })
    }

    return NextResponse.json({ error: 'Unknown format' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
