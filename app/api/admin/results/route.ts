import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const PAGE_SIZE = 100

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const assessment = searchParams.get('assessment') || ''
    const severity = searchParams.get('severity') || ''
    const from = searchParams.get('from') || ''
    const to = searchParams.get('to') || ''
    const page = Math.max(1, Math.min(parseInt(searchParams.get('page') || '1', 10), 10000))
    const offset = (page - 1) * PAGE_SIZE

    const db = createAdminClient()

    let query = db.from('assessment_submissions')
      .select('id, total_score, severity_band, high_risk_flag, submitted_at, patient_id, definition_id, assessment_definitions(name_en, code), profiles(full_name_en)', { count: 'exact' })
      .order('submitted_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (from) query = query.gte('submitted_at', from)
    if (to) query = query.lte('submitted_at', to + 'T23:59:59')
    if (severity === 'high_risk') query = query.eq('high_risk_flag', true)

    const { data: subs, count } = await query

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

    // In-memory filters for joined columns (PostgREST limitation on relation filters)
    if (assessment) results = results.filter((r: any) => r.code === assessment)
    if (severity && severity !== 'high_risk') {
      results = results.filter((r: any) => (r.severity_band || '').toLowerCase().includes(severity))
    }

    const { data: defs } = await db.from('assessment_definitions').select('code, name_en').order('name_en')
    const assessments = (defs || []).map((d: any) => ({ code: d.code, name: d.name_en }))

    return NextResponse.json({
      results,
      assessments,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
