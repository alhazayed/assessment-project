import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1 deletion request per hour — prevents spam
  const rl = await checkRateLimit(`delete-request:${user.id}`, { limit: 1, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const db = createAdminClient()
  const requestedAt = new Date().toISOString()

  // Record the request on the profile so admins can action it and the user's own
  // profile reflects the pending state. Idempotent: re-requesting keeps the
  // earliest timestamp so the 30-day clock is not reset by repeat clicks.
  const { data: existing } = await db
    .from('profiles')
    .select('deletion_requested_at')
    .eq('id', user.id)
    .single()

  if (!existing?.deletion_requested_at) {
    const { error: updErr } = await db
      .from('profiles')
      .update({ deletion_requested_at: requestedAt })
      .eq('id', user.id)
    if (updErr) {
      console.error('[user/delete-request] failed to record deletion request:', updErr.message)
      return NextResponse.json({ error: 'Could not record your request. Please try again.' }, { status: 500 })
    }
  }

  // Audit trail of the deletion request (best-effort; the profile flag above is
  // the source of truth for the admin/erasure workflow).
  await db.from('audit_log').insert({
    actor_id: user.id,
    action: 'account_deletion_requested',
    target_type: 'user',
    target_id: user.id,
    details: { email: user.email, requested_at: existing?.deletion_requested_at ?? requestedAt },
  })

  return NextResponse.json({ ok: true, message: 'Account deletion scheduled within 30 days' })
}
