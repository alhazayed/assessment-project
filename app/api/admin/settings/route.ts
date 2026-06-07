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

export async function PATCH(request: Request) {
  try {
    const { user } = await requireAdmin()
    const { key, value } = await request.json()
    const db = createAdminClient()
    await db.from('platform_settings').upsert({ key, value, updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: 'key' })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
