import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_ROLES = ['patient', 'clinician', 'admin', 'superadmin'] as const

export async function GET(request: Request) {
  try {
    const { role: callerRole } = await requireAdmin()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''

    const db = createAdminClient()

    let query = db.from('profiles').select('id, full_name_en, full_name_ar, role, is_active, created_at, language_preference')

    if (role && (ALLOWED_ROLES as readonly string[]).includes(role)) query = query.eq('role', role)
    if (search && typeof search === 'string' && search.length <= 100) {
      // Search both English and Arabic names (the platform is bilingual; an
      // English-only match silently returned nothing for Arabic queries).
      // Strip characters that are structural in PostgREST's or() filter so a
      // name fragment can't break or inject into the filter expression.
      const term = search.trim().replace(/[,()*]/g, ' ').trim()
      if (term) query = query.or(`full_name_en.ilike.%${term}%,full_name_ar.ilike.%${term}%`)
    }

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

    // Email lives in auth.users, not profiles. Build an id -> email map via the
    // service-role admin API. Use a perPage the GoTrue admin endpoint reliably
    // honors (50) so the "short page = last page" termination is correct even
    // if the server caps larger page sizes; cap total pages as a safety bound.
    const emailMap: Record<string, string> = {}
    try {
      const perPage = 50
      for (let pageNum = 1; pageNum <= 200; pageNum++) {
        const { data: authData, error } = await db.auth.admin.listUsers({ page: pageNum, perPage })
        const authUsers = authData?.users || []
        if (error || authUsers.length === 0) break
        for (const au of authUsers) {
          if (au.email) emailMap[au.id] = au.email
        }
        if (authUsers.length < perPage) break
      }
    } catch (e) {
      console.error('Failed to load user emails:', e)
    }

    const enriched = (users || []).map((u: any) => ({
      ...u,
      email: emailMap[u.id] || null,
      submission_count: countMap[u.id] || 0,
    }))

    return NextResponse.json({ users: enriched, callerRole })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

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

    // Audit log — use caller's server client so actor_id = caller
    const supabase = createClient()
    const { data: { user: callerUser } } = await supabase.auth.getUser()
    if (callerUser) {
      const reason = Object.entries(update)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')
      await db.from('audit_log').insert({
        actor_id: callerUser.id,
        action: 'admin_user_update',
        target_type: 'profile',
        target_id: id,
        reason,
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
