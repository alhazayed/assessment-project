import { NextResponse } from 'next/server'
import { requireAdmin, adminRouteError } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { writeAdminAudit } from '@/lib/admin/audit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET() {
  try {
    await requireAdmin()
    const db = createAdminClient()
    const { data: flags, error } = await db.from('feature_flags').select('*').order('display_name')
    if (error) throw error
    return NextResponse.json({ flags: flags || [] })
  } catch (error) {
    return adminRouteError(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await requireAdmin()
    const rl = await checkRateLimit(`admin-mut:${user.id}`, { limit: 30, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
    }
    const body = await request.json().catch(() => null)
    const id = body?.id
    const isEnabled = body?.is_enabled
    if (typeof id !== 'string' || !UUID_RE.test(id) || typeof isEnabled !== 'boolean') {
      return NextResponse.json({ error: 'Expected { id: uuid, is_enabled: boolean }' }, { status: 400 })
    }

    const db = createAdminClient()
    const { data: updated, error } = await db
      .from('feature_flags')
      .update({ is_enabled: isEnabled, updated_at: new Date().toISOString(), updated_by: user.id })
      .eq('id', id)
      .select('id, flag_key')
    if (error) throw error
    if (!updated || updated.length === 0) return NextResponse.json({ error: 'Flag not found' }, { status: 404 })

    await writeAdminAudit({
      actorId: user.id,
      action: 'feature_flag_update',
      targetType: 'feature_flag',
      targetId: id,
      details: { flag_key: updated[0].flag_key, is_enabled: isEnabled },
    }, db)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return adminRouteError(error)
  }
}
