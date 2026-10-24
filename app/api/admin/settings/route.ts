import { NextResponse } from 'next/server'
import { requireAdmin, adminRouteError } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { writeAdminAudit } from '@/lib/admin/audit'

const KEY_RE = /^[A-Za-z0-9_.:-]{1,128}$/
const MAX_VALUE_LENGTH = 10000
const SENSITIVE_KEY_RE = /secret|token|password|api[_-]?key|private/i

export async function GET() {
  try {
    await requireAdmin()
    const db = createAdminClient()
    const { data: settings, error } = await db.from('platform_settings').select('*').order('key')
    if (error) throw error
    return NextResponse.json({ settings: settings || [] })
  } catch (error) {
    return adminRouteError(error)
  }
}

// Only existing keys may be updated — no new arbitrary keys can be inserted via API
export async function PATCH(request: Request) {
  try {
    const { user } = await requireAdmin()
    const rl = await checkRateLimit(`admin-mut:${user.id}`, { limit: 30, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
    }
    const body = await request.json().catch(() => null)
    const key = body?.key
    const rawValue = body?.value

    if (typeof key !== 'string' || !KEY_RE.test(key)) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
    }
    // platform_settings.value is a text column: accept strings, numbers and booleans only.
    if (!['string', 'number', 'boolean'].includes(typeof rawValue)) {
      return NextResponse.json({ error: 'Value must be a string, number or boolean' }, { status: 400 })
    }
    const value = String(rawValue)
    if (value.length > MAX_VALUE_LENGTH) {
      return NextResponse.json({ error: `Value must be at most ${MAX_VALUE_LENGTH} characters` }, { status: 400 })
    }

    const db = createAdminClient()

    // Ensure the key already exists — prevents injection of arbitrary config keys
    const { data: existing, error: readErr } = await db.from('platform_settings').select('key, value').eq('key', key).maybeSingle()
    if (readErr) throw readErr
    if (!existing) return NextResponse.json({ error: 'Setting not found' }, { status: 404 })

    const { error } = await db.from('platform_settings').update({
      value,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }).eq('key', key)
    if (error) throw error

    await writeAdminAudit({
      actorId: user.id,
      action: 'platform_setting_update',
      targetType: 'platform_setting',
      targetId: key,
      // Values are logged for ordinary settings; anything that looks like a
      // credential is recorded as changed without its value.
      details: SENSITIVE_KEY_RE.test(key)
        ? { key, value_redacted: true }
        : { key, previous_value: existing.value, new_value: value },
    }, db)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return adminRouteError(error)
  }
}
