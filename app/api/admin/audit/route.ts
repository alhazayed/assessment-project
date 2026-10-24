import { NextResponse } from 'next/server'
import { requireAdmin, adminRouteError } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

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

    const { data: logs, count, error } = await query.range(offset, offset + PAGE_SIZE - 1)
    if (error) throw error

    // Distinct action / target-type values for the filter dropdowns, sampled
    // from the most recent 1,000 entries (PostgREST's max_rows cap; a larger
    // .limit() would be silently truncated to this anyway).
    const { data: distinctRows } = await db
      .from('audit_log')
      .select('action, target_type')
      .order('created_at', { ascending: false })
      .limit(1000)

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
  } catch (error) {
    return adminRouteError(error)
  }
}

/** Audit entries younger than this can never be purged (enforced in SQL too). */
const RETENTION_DAYS = 365

/**
 * DELETE /api/admin/audit
 *
 * Superadmin-only retention purge. The audit log is append-only: single-entry
 * deletion is not supported, and a database trigger blocks every UPDATE and
 * DELETE except through purge_audit_log_before(), which refuses any cutoff
 * newer than 365 days ago and writes its own 'audit_log_purged' audit row.
 *
 * Body: { before: string } — purge entries with created_at < before (ISO date),
 * where before must be at least 365 days in the past.
 */
export async function DELETE(request: Request) {
  try {
    const { user: callerUser, role } = await requireAdmin()
    if (role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmin can purge audit log entries' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { id, before } = (body ?? {}) as { id?: unknown; before?: unknown }

    if (id !== undefined) {
      return NextResponse.json(
        { error: 'Audit log entries cannot be deleted individually; the log is append-only.' },
        { status: 405 }
      )
    }
    if (typeof before !== 'string' || !before) {
      return NextResponse.json({ error: 'Provide before (purge entries older than this date)' }, { status: 400 })
    }

    const cutoff = new Date(before)
    if (isNaN(cutoff.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }
    const latestAllowed = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
    if (cutoff > latestAllowed) {
      return NextResponse.json(
        { error: `Only entries older than ${RETENTION_DAYS} days can be purged (cutoff must be on or before ${latestAllowed.toISOString().slice(0, 10)}).` },
        { status: 400 }
      )
    }

    // The SQL function enforces the retention window again and writes the
    // 'audit_log_purged' row itself, so no separate audit insert here.
    const db = createAdminClient()
    const { data: deletedCount, error } = await db.rpc('purge_audit_log_before', {
      p_before: cutoff.toISOString(),
      p_actor: callerUser.id,
    })
    if (error) {
      console.error('Audit purge failed:', error.message)
      return NextResponse.json({ error: 'Audit purge failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, deletedCount: typeof deletedCount === 'number' ? deletedCount : 0 })
  } catch (error) {
    console.error('Audit purge error:', error)
    return adminRouteError(error)
  }
}
