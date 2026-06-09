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

    // Count submissions per user efficiently via a filtered aggregate query
    const userIds = (users || []).map((u: any) => u.id)
    const countMap: Record<string, number> = {}
    if (userIds.length > 0) {
      const { data: subCounts } = await db
        .from('assessment_submissions')
        .select('patient_id')
        .in('patient_id', userIds)
      ;(subCounts || []).forEach((s: any) => { countMap[s.patient_id] = (countMap[s.patient_id] || 0) + 1 })
    }

    const enriched = (users || []).map((u: any) => ({ ...u, submission_count: countMap[u.id] || 0 }))

    return NextResponse.json({ users: enriched })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

const ALLOWED_ROLES = ['patient', 'clinician', 'admin', 'superadmin'] as const

export async function PATCH(request: Request) {
  try {
    const { role: callerRole } = await requireAdmin()
    const body = await request.json()
    const { id, is_active, role } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const db = createAdminClient()
    const update: Record<string, unknown> = {}

    if (is_active !== undefined) {
      update.is_active = Boolean(is_active)
    }

    if (role !== undefined) {
      if (!ALLOWED_ROLES.includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      // Only superadmin may grant admin/superadmin roles
      if (['admin', 'superadmin'].includes(role) && callerRole !== 'superadmin') {
        return NextResponse.json({ error: 'Insufficient permissions to assign this role' }, { status: 403 })
      }
      update.role = role
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    await db.from('profiles').update(update).eq('id', id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
