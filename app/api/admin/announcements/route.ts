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

const ALLOWED_TYPES = ['info', 'warning', 'success', 'error'] as const

export async function POST(request: Request) {
  try {
    const { user } = await requireAdmin()
    const body = await request.json()

    if (!body.title_en?.trim() || body.title_en.length > 200) {
      return NextResponse.json({ error: 'title_en is required and must be ≤200 characters' }, { status: 400 })
    }
    if (!body.body_en?.trim() || body.body_en.length > 2000) {
      return NextResponse.json({ error: 'body_en is required and must be ≤2000 characters' }, { status: 400 })
    }
    if (body.type && !ALLOWED_TYPES.includes(body.type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const db = createAdminClient()
    await db.from('platform_announcements').insert({
      title_en: body.title_en.trim(),
      title_ar: body.title_ar?.trim() || null,
      body_en: body.body_en.trim(),
      body_ar: body.body_ar?.trim() || null,
      type: body.type || 'info',
      target_roles: Array.isArray(body.target_roles) && body.target_roles.length > 0 ? body.target_roles : null,
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
    const { user, role } = await requireAdmin()
    const { id, is_active } = await request.json()
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const db = createAdminClient()

    // Superadmins may toggle any announcement; regular admins only their own
    if (role !== 'superadmin') {
      const { data: existing } = await db
        .from('platform_announcements')
        .select('created_by')
        .eq('id', id)
        .single()
      if (!existing || existing.created_by !== user.id) {
        return NextResponse.json({ error: 'Forbidden — you can only modify your own announcements' }, { status: 403 })
      }
    }

    await db.from('platform_announcements')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, role } = await requireAdmin()
    const { id } = await request.json()
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const db = createAdminClient()

    // Superadmins may delete any announcement; regular admins only their own
    if (role !== 'superadmin') {
      const { data: existing } = await db
        .from('platform_announcements')
        .select('created_by')
        .eq('id', id)
        .single()
      if (!existing || existing.created_by !== user.id) {
        return NextResponse.json({ error: 'Forbidden — you can only delete your own announcements' }, { status: 403 })
      }
    }

    await db.from('platform_announcements').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
