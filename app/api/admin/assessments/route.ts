import { NextResponse } from 'next/server'
import { requireAdmin, adminRouteError } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeAdminAudit } from '@/lib/admin/audit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET() {
  try {
    await requireAdmin()
    const db = createAdminClient()
    const { data: defs, error } = await db.from('assessment_definitions').select('id, code, name_en, name_ar, total_questions, is_active').order('name_en')
    if (error) throw new Error(error.message)

    // One exact head count per definition: a plain select of every submission
    // is truncated at PostgREST's 1,000-row max_rows cap.
    const counts = await Promise.all((defs || []).map(async (d: any) => {
      const { count, error: countErr } = await db
        .from('assessment_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('definition_id', d.id)
      if (countErr) throw new Error(countErr.message)
      return count ?? 0
    }))

    const assessments = (defs || []).map((d: any, i: number) => ({ ...d, submission_count: counts[i] }))
      .sort((a: any, b: any) => b.submission_count - a.submission_count)

    return NextResponse.json({ assessments })
  } catch (error) {
    return adminRouteError(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await requireAdmin()
    const body = await request.json().catch(() => null)
    const id = body?.id
    const isActive = body?.is_active
    if (typeof id !== 'string' || !UUID_RE.test(id) || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Expected { id: uuid, is_active: boolean }' }, { status: 400 })
    }
    const db = createAdminClient()
    const { data: updated, error } = await db
      .from('assessment_definitions')
      .update({ is_active: isActive })
      .eq('id', id)
      .select('id')
    if (error) throw new Error(error.message)
    if (!updated || updated.length === 0) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })

    await writeAdminAudit({
      actorId: user.id,
      action: 'assessment_definition_update',
      targetType: 'assessment_definition',
      targetId: id,
      details: { is_active: isActive },
    }, db)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return adminRouteError(error)
  }
}
