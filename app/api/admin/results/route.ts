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
      .select('id, total_score, severity_band, high_risk_flag, submitted_at, patient_id, definition_id, assessment_definitions(name_en, code), profiles(full_name_en)')
      .order('submitted_at', { ascending: false })
      .limit(500)

    if (assessment) query = query.eq('assessment_definitions.code', assessment)
    if (from) query = query.gte('submitted_at', from)
    if (to) query = query.lte('submitted_at', to + 'T23:59:59')
    if (severity === 'high_risk') query = query.eq('high_risk_flag', true)

    const { data: subs } = await query

    let results = (subs || []).map((s: any) => ({
      id: s.id,
      patient_name: s.profiles?.full_name_en || 'Anonymous',
      assessment_name: s.assessment_definitions?.name_en || '',
      code: s.assessment_definitions?.code || '',
      total_score: s.total_score,
      severity_band: s.severity_band,
      high_risk_flag: s.high_risk_flag,
      submitted_at: s.submitted_at,
      patient_id: s.patient_id,
    }))

    if (assessment) results = results.filter((r: any) => r.code === assessment)
    if (severity && severity !== 'high_risk') {
      results = results.filter((r: any) => (r.severity_band || '').toLowerCase().includes(severity))
    }

    const { data: defs } = await db.from('assessment_definitions').select('code, name_en').order('name_en')
    const assessments = (defs || []).map((d: any) => ({ code: d.code, name: d.name_en }))

    return NextResponse.json({ results, assessments })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
