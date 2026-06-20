import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    await requireAdmin()
    const db = createAdminClient()
    const { data: packages, error } = await db
      .from('packages')
      .select('*, package_assessments(id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)')
      .order('sort_order')
    if (error) throw error
    return NextResponse.json({ packages: packages || [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const db = createAdminClient()
    const body = await request.json()
    const { name_en, name_ar, description_en, description_ar, purpose_en, purpose_ar, category, status, color, index_name_en, index_name_ar } = body
    if (!name_en?.trim() || !name_ar?.trim()) {
      return NextResponse.json({ error: 'Name (EN and AR) required' }, { status: 400 })
    }
    const { data, error } = await db
      .from('packages')
      .insert({ name_en, name_ar, description_en, description_ar, purpose_en, purpose_ar, category: category || 'general', status: status || 'draft', color: color || '#1D6296', index_name_en, index_name_ar })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ package: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin()
    const db = createAdminClient()
    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await db.from('packages').update(updates).eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to update package' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin()
    const db = createAdminClient()
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await db.from('packages').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete package' }, { status: 500 })
  }
}
