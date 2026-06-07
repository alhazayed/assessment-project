import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const assessment = searchParams.get('assessment') || ''
    const severity = searchParams.get('severity') || ''
    const from = searchParams.get('from') || ''
    const to = searchParams.get('to') || ''

    const db = createAdminClient()
    let query = db.from('assessment_submissions')
      .select('id, total_score, severity_band, high_risk_flag, submitted_at, patient_id, assessment_definitions(name_en, code), profiles(full_name_en)')
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
      score: s.total_score,
      severity: s.severity_band,
      high_risk: s.high_risk_flag ? 'YES' : 'NO',
      submitted_at: s.submitted_at,
    }))

    if (assessment) rows = rows.filter((r: any) => r.code === assessment)
    if (severity && severity !== 'high_risk') {
      rows = rows.filter((r: any) => (r.severity || '').toLowerCase().includes(severity))
    }

    const headers = ['ID', 'Patient', 'Assessment', 'Code', 'Score', 'Severity', 'High Risk', 'Submitted At']
    const csvRows = [
      headers.join(','),
      ...rows.map((r: any) => [
        r.id, `"${r.patient}"`, `"${r.assessment}"`, r.code,
        r.score, `"${r.severity}"`, r.high_risk,
        new Date(r.submitted_at).toISOString(),
      ].join(','))
    ]
    const csv = csvRows.join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="results-${new Date().toISOString().split('T')[0]}.csv"`,
      }
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
