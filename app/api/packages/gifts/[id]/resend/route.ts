import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { issueGiftCode } from '@/lib/billing/gift-codes'

/**
 * POST /api/packages/gifts/:id/resend
 *
 * The buyer of a gift sends the recipient a fresh code (the previous one stops
 * working). Only for the buyer's own gifts that have not been redeemed.
 */
export async function POST(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'User must be authenticated' }, { status: 401 })

  const rl = await checkRateLimit(`gift-resend:${user.id}`, { limit: 5, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429, headers: { 'Retry-After': '3600' } })
  }

  const db = createAdminClient()
  const { data: gift } = await db
    .from('package_gift_codes')
    .select('id, buyer_id, recipient_email, package_id, redeemed_at')
    .eq('id', id)
    .maybeSingle()
  if (!gift || gift.buyer_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (gift.redeemed_at) return NextResponse.json({ error: 'This gift has already been used', reason: 'used' }, { status: 409 })

  try {
    const sent = await issueGiftCode(db, gift)
    if (!sent) return NextResponse.json({ error: 'The email could not be sent. Please try again later.', reason: 'email_failed' }, { status: 502 })
  } catch (err) {
    console.error('[gift-resend]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not resend the code.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
