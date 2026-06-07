import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    await requireAdmin()
    const db = createAdminClient()
    const { data } = await db.from('platform_announcements').select('*').order('created_at', { ascending: false })
    return NextResponse.json({ announcements: data || [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAdmin()
    const body = await request.json()
    const db = createAdminClient()
    await db.from('platform_announcements').insert({
      title_en: body.title_en,
      title_ar: body.title_ar || null,
      body_en: body.body_en,
      body_ar: body.body_ar || null,
      type: body.type || 'info',
      target_roles: body.target_roles?.length > 0 ? body.target_roles : null,
      is_active: true,
      is_dismissible: body.is_dismissible ?? true,
      starts_at: body.starts_at || null,
      ends_at: body.ends_at || null,
      created_by: user.id,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin()
    const { id, is_active } = await request.json()
    const db = createAdminClient()
    await db.from('platform_announcements').update({ is_active, updated_at: new Date().toISOString() }).eq('id', id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin()
    const { id } = await request.json()
    const db = createAdminClient()
    await db.from('platform_announcements').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
