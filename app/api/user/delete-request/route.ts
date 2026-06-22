import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  // Log deletion request in audit log
  await db.from('audit_log').insert({
    actor_id: user.id,
    action: 'account_deletion_requested',
    target_type: 'user',
    target_id: user.id,
    details: { email: user.email, requested_at: new Date().toISOString() },
  })

  return NextResponse.json({ ok: true, message: 'Account deletion scheduled within 30 days' })
}
