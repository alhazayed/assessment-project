import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''

    const db = createAdminClient()

    let query = db.from('profiles').select('id, full_name_en, full_name_ar, role, is_active, created_at, language_preference')

    if (role) query = query.eq('role', role)
    if (search) query = query.ilike('full_name_en', `%${search}%`)

    const { data: users } = await query.order('created_at', { ascending: false }).limit(200)

    // Get submission counts
    const { data: subCounts } = await db.from('assessment_submissions').select('patient_id')
    const countMap: Record<string, number> = {}
    ;(subCounts || []).forEach((s: any) => { countMap[s.patient_id] = (countMap[s.patient_id] || 0) + 1 })

    const enriched = (users || []).map((u: any) => ({ ...u, submission_count: countMap[u.id] || 0 }))

    return NextResponse.json({ users: enriched })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const { id, is_active, role } = body

    const db = createAdminClient()
    const update: Record<string, unknown> = {}
    if (is_active !== undefined) update.is_active = is_active
    if (role !== undefined) update.role = role

    await db.from('profiles').update(update).eq('id', id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
