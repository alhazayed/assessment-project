import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    await requireAdmin()
    const db = createAdminClient()
    const { data: defs } = await db.from('assessment_definitions').select('id, code, name_en, name_ar, total_questions, is_active').order('name_en')
    const { data: subs } = await db.from('assessment_submissions').select('definition_id')

    const countMap: Record<string, number> = {}
    ;(subs || []).forEach((s: any) => { countMap[s.definition_id] = (countMap[s.definition_id] || 0) + 1 })

    const assessments = (defs || []).map((d: any) => ({ ...d, submission_count: countMap[d.id] || 0 }))
      .sort((a: any, b: any) => b.submission_count - a.submission_count)

    return NextResponse.json({ assessments })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin()
    const { id, is_active } = await request.json()
    const db = createAdminClient()
    await db.from('assessment_definitions').update({ is_active }).eq('id', id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
