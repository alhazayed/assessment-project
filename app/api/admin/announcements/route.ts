import { NextResponse } from 'next/server'
import { requireAdmin, adminRouteError } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { writeAdminAudit } from '@/lib/admin/audit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALLOWED_TYPES = ['info', 'warning', 'success', 'error'] as const
const ALLOWED_ROLES = ['patient', 'clinician', 'admin', 'superadmin'] as const

function optionalText(v: unknown, max: number): string | null | false {
  if (v === undefined || v === null || v === '') return null
  if (typeof v !== 'string' || v.length > max) return false
  return v.trim() || null
}

function optionalDate(v: unknown): string | null | false {
  if (v === undefined || v === null || v === '') return null
  if (typeof v !== 'string') return false
  const d = new Date(v)
  return isNaN(d.getTime()) ? false : d.toISOString()
}

async function rateLimited(userId: string) {
  const rl = await checkRateLimit(`admin-mut:${userId}`, { limit: 30, windowMs: 60 * 60 * 1000 })
  return !rl.allowed
}

/** Loads the announcement and enforces "regular admins may only change their own". */
async function loadOwned(
  db: ReturnType<typeof createAdminClient>,
  id: string,
  user: { id: string },
  role: 'admin' | 'superadmin',
  verb: string,
): Promise<NextResponse | { title_en: string }> {
  const { data: existing, error } = await db
    .from('platform_announcements')
    .select('created_by, title_en')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!existing) return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
  if (role !== 'superadmin' && existing.created_by !== user.id) {
    return NextResponse.json({ error: `Forbidden — you can only ${verb} your own announcements` }, { status: 403 })
  }
  return existing
}

export async function GET() {
  try {
    await requireAdmin()
    const db = createAdminClient()
    const { data, error } = await db.from('platform_announcements').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ announcements: data || [] })
  } catch (error) {
    return adminRouteError(error)
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAdmin()
    if (await rateLimited(user.id)) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
    }
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

    if (typeof body.title_en !== 'string' || !body.title_en.trim() || body.title_en.length > 200) {
      return NextResponse.json({ error: 'title_en is required and must be ≤200 characters' }, { status: 400 })
    }
    if (typeof body.body_en !== 'string' || !body.body_en.trim() || body.body_en.length > 2000) {
      return NextResponse.json({ error: 'body_en is required and must be ≤2000 characters' }, { status: 400 })
    }
    const titleAr = optionalText(body.title_ar, 200)
    const bodyAr = optionalText(body.body_ar, 2000)
    if (titleAr === false) return NextResponse.json({ error: 'title_ar must be ≤200 characters' }, { status: 400 })
    if (bodyAr === false) return NextResponse.json({ error: 'body_ar must be ≤2000 characters' }, { status: 400 })
    if (body.type !== undefined && !(ALLOWED_TYPES as readonly unknown[]).includes(body.type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
    if (body.target_roles !== undefined && body.target_roles !== null && (
      !Array.isArray(body.target_roles) ||
      !body.target_roles.every((r: unknown) => (ALLOWED_ROLES as readonly unknown[]).includes(r))
    )) {
      return NextResponse.json({ error: `target_roles must be a list of: ${ALLOWED_ROLES.join(', ')}` }, { status: 400 })
    }
    if (body.is_dismissible !== undefined && typeof body.is_dismissible !== 'boolean') {
      return NextResponse.json({ error: 'is_dismissible must be a boolean' }, { status: 400 })
    }
    const startsAt = optionalDate(body.starts_at)
    const endsAt = optionalDate(body.ends_at)
    if (startsAt === false || endsAt === false) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    if (startsAt && endsAt && endsAt <= startsAt) {
      return NextResponse.json({ error: 'ends_at must be after starts_at' }, { status: 400 })
    }

    const roles: string[] = Array.isArray(body.target_roles) && body.target_roles.length > 0
      ? Array.from(new Set(body.target_roles as string[]))
      : [...ALLOWED_ROLES] // no selection = everyone (target_roles is NOT NULL)

    const db = createAdminClient()
    const { data: created, error } = await db.from('platform_announcements').insert({
      title_en: body.title_en.trim(),
      // title_ar is NOT NULL; fall back to the English title when omitted.
      title_ar: titleAr ?? body.title_en.trim(),
      body_en: body.body_en.trim(),
      body_ar: bodyAr,
      type: body.type || 'info',
      target_roles: roles,
      is_active: true,
      is_dismissible: body.is_dismissible ?? true,
      ...(startsAt ? { starts_at: startsAt } : {}),
      ends_at: endsAt,
      created_by: user.id,
    }).select('id').single()
    if (error) throw error

    await writeAdminAudit({
      actorId: user.id,
      action: 'announcement_create',
      targetType: 'platform_announcement',
      targetId: created.id,
      details: { title_en: body.title_en.trim(), type: body.type || 'info', target_roles: roles },
    }, db)
    return NextResponse.json({ ok: true, id: created.id })
  } catch (error) {
    return adminRouteError(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, role } = await requireAdmin()
    if (await rateLimited(user.id)) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
    }
    const body = await request.json().catch(() => null)
    const id = body?.id
    const isActive = body?.is_active
    if (typeof id !== 'string' || !UUID_RE.test(id) || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Expected { id: uuid, is_active: boolean }' }, { status: 400 })
    }

    const db = createAdminClient()
    const existing = await loadOwned(db, id, user, role, 'modify')
    if (existing instanceof NextResponse) return existing

    const { error } = await db.from('platform_announcements')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error

    await writeAdminAudit({
      actorId: user.id,
      action: 'announcement_update',
      targetType: 'platform_announcement',
      targetId: id,
      details: { is_active: isActive, title_en: existing.title_en },
    }, db)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return adminRouteError(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, role } = await requireAdmin()
    if (await rateLimited(user.id)) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
    }
    const body = await request.json().catch(() => null)
    const id = body?.id
    if (typeof id !== 'string' || !UUID_RE.test(id)) {
      return NextResponse.json({ error: 'id must be a UUID' }, { status: 400 })
    }

    const db = createAdminClient()
    const existing = await loadOwned(db, id, user, role, 'delete')
    if (existing instanceof NextResponse) return existing

    // Dismissal rows reference the announcement; remove them first.
    const { error: dismissErr } = await db.from('dismissed_announcements').delete().eq('announcement_id', id)
    if (dismissErr) throw dismissErr
    const { error } = await db.from('platform_announcements').delete().eq('id', id)
    if (error) throw error

    await writeAdminAudit({
      actorId: user.id,
      action: 'announcement_delete',
      targetType: 'platform_announcement',
      targetId: id,
      details: { title_en: existing.title_en },
    }, db)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return adminRouteError(error)
  }
}
