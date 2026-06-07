import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    await requireAdmin()
    const db = createAdminClient()
    const { data: flags } = await db.from('feature_flags').select('*').order('display_name')
    return NextResponse.json({ flags: flags || [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await requireAdmin()
    const { id, is_enabled } = await request.json()
    const db = createAdminClient()
    await db.from('feature_flags').update({ is_enabled, updated_at: new Date().toISOString(), updated_by: user.id }).eq('id', id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
