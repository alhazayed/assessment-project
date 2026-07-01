import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 100

/**
 * GET /api/admin/audit
 *
 * Filtered, paginated audit log for the admin panel.
 * Filters: search (action/reason), action, targetType, from, to, page.
 */
export async function GET(request: Request) {
  try {
    const { role: callerRole } = await requireAdmin()
    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim()
    const action = searchParams.get('action') || ''
    const targetType = searchParams.get('targetType') || ''
    const from = searchParams.get('from') || ''
    const to = searchParams.get('to') || ''
    const page = Math.max(1, Math.min(parseInt(searchParams.get('page') || '1', 10), 10000))
    const offset = (page - 1) * PAGE_SIZE

    const db = createAdminClient()

    let query = db
      .from('audit_log')
      .select('*, profiles(full_name_en, role)', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (action) query = query.eq('action', action)
    if (targetType) query = query.eq('target_type', targetType)
    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to + 'T23:59:59')
    if (search) {
      // Escape PostgREST or() structural characters in the user term.
      const term = search.replace(/[,()*]/g, ' ').trim()
      if (term) query = query.or(`action.ilike.%${term}%,reason.ilike.%${term}%`)
    }

    const { data: logs, count } = await query.range(offset, offset + PAGE_SIZE - 1)

    // Distinct action / target-type values for the filter dropdowns (sampled).
    const { data: distinctRows } = await db
      .from('audit_log')
      .select('action, target_type')
      .order('created_at', { ascending: false })
      .limit(2000)

    const actions = Array.from(new Set((distinctRows || []).map((r: any) => r.action).filter(Boolean))).sort()
    const targetTypes = Array.from(new Set((distinctRows || []).map((r: any) => r.target_type).filter(Boolean))).sort()

    return NextResponse.json({
      logs: logs || [],
      callerRole,
      filters: { actions, targetTypes },
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

/**
 * DELETE /api/admin/audit
 *
 * Superadmin-only. Delete a single audit entry by id, or purge all entries
 * older than a given date. A meta audit entry records the purge.
 *
 * Body (one of):
 *   { id: string }      — delete a single entry
 *   { before: string }  — delete all entries with created_at < before (ISO date)
 */
export async function DELETE(request: Request) {
  try {
    const { user: callerUser, role } = await requireAdmin()
    if (role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmin can delete audit log entries' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { id, before } = body

    if (!id && !before) {
      return NextResponse.json(
        { error: 'Provide either id (single delete) or before (purge older than date)' },
        { status: 400 }
      )
    }

    const db = createAdminClient()
    let deletedCount = 0

    if (id) {
      const { error, count } = await db
        .from('audit_log')
        .delete({ count: 'exact' })
        .eq('id', id)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      deletedCount = count ?? 0
    } else {
      // Purge older than `before`. Guard against an invalid date.
      const cutoff = new Date(before)
      if (isNaN(cutoff.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
      }
      const { error, count } = await db
        .from('audit_log')
        .delete({ count: 'exact' })
        .lt('created_at', cutoff.toISOString())
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      deletedCount = count ?? 0
    }

    // Record a meta audit entry so the purge itself leaves a trace.
    // Use the caller's server client so actor_id resolves to the caller.
    const supabase = createClient()
    const { data: { user: actor } } = await supabase.auth.getUser()
    if (actor) {
      await db.from('audit_log').insert({
        actor_id: actor.id,
        action: 'audit_log_deleted',
        target_type: 'audit_log',
        target_id: id || null,
        reason: id
          ? `Deleted audit entry ${id}`
          : `Purged ${deletedCount} audit entr${deletedCount === 1 ? 'y' : 'ies'} older than ${before}`,
        details: { deleted_count: deletedCount, method: id ? 'single' : 'purge', before: before || null },
      })
    }

    return NextResponse.json({ ok: true, deletedCount })
  } catch (error) {
    console.error('Audit delete error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
