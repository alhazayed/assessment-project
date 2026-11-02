import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { hashGiftCode, normalizeGiftCode } from '@/lib/billing/gift-codes'

/**
 * POST /api/packages/redeem  { code }
 *
 * Redeem a one-time gift code on the signed-in account. Works whether or not
 * packages are on sale, so a code someone paid for always opens. Rate limited
 * per user so codes cannot be guessed.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'User must be authenticated' }, { status: 401 })

  const rl = await checkRateLimit(`gift-redeem:${user.id}`, { limit: 10, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.', reason: 'rate_limited' }, { status: 429, headers: { 'Retry-After': '3600' } })
  }

  const body = await request.json().catch(() => ({}))
  const code = normalizeGiftCode(body?.code)
  if (!code) return NextResponse.json({ error: 'That code is not valid', reason: 'invalid' }, { status: 400 })

  const db = createAdminClient()
  const { data, error } = await db.rpc('redeem_package_gift_code', { p_code_hash: hashGiftCode(code), p_user_id: user.id })
  if (error) {
    console.error('[redeem] rpc error:', error.message)
    return NextResponse.json({ error: 'Could not redeem the code. Please try again.' }, { status: 500 })
  }

  const result = data as { ok: boolean; reason?: string; package_id?: string }
  if (result.ok) return NextResponse.json({ ok: true, packageId: result.package_id })

  const status = result.reason === 'invalid' ? 400 : 409
  // Never reveal which package an unknown code belongs to.
  return NextResponse.json(
    { ok: false, reason: result.reason, packageId: result.reason === 'invalid' || result.reason === 'used' ? undefined : result.package_id },
    { status }
  )
}
