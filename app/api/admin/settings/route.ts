import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    await requireAdmin()
    const db = createAdminClient()
    const { data: settings } = await db.from('platform_settings').select('*').order('key')
    return NextResponse.json({ settings: settings || [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// Only existing keys may be updated — no new arbitrary keys can be inserted via API
export async function PATCH(request: Request) {
  try {
    const { user } = await requireAdmin()
    const { key, value } = await request.json()

    if (!key || typeof key !== 'string' || key.length > 128) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
    }
    if (value === undefined || value === null) {
      return NextResponse.json({ error: 'Value is required' }, { status: 400 })
    }

    const db = createAdminClient()

    // Ensure the key already exists — prevents injection of arbitrary config keys
    const { data: existing } = await db.from('platform_settings').select('key').eq('key', key).single()
    if (!existing) return NextResponse.json({ error: 'Setting not found' }, { status: 404 })

    await db.from('platform_settings').update({
      value,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }).eq('key', key)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
