import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1 deletion request per hour — prevents spam
  const rl = await checkRateLimit(`delete-request:${user.id}`, { limit: 1, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const db = createAdminClient()
  // Log deletion request in audit log
  await db.from('audit_log').insert({
    actor_id: user.id,
    action: 'account_deletion_requested',
    target_type: 'user',
    target_id: user.id,
    details: { requested_at: new Date().toISOString() },
  })

  return NextResponse.json({ ok: true, message: 'Account deletion scheduled within 30 days' })
}
