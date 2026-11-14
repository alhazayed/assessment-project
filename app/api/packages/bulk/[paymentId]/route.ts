import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { replaceBulkCode } from '@/lib/billing/bulk'
import { loadBulkOrder } from '@/lib/billing/bulk-order'

/**
 * GET  /api/packages/bulk/:paymentId          the buyer's bulk order: code statuses + group report
 * POST /api/packages/bulk/:paymentId {codeId} replace one unused code; the new code is returned once
 *
 * Only the buyer of the order can read it. Code statuses never say who used a code.
 */
export async function GET(_request: Request, props: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'User must be authenticated' }, { status: 401 })

  const order = await loadBulkOrder(createAdminClient(), user.id, paymentId)
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(order)
}

export async function POST(request: Request, props: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'User must be authenticated' }, { status: 401 })

  const rl = await checkRateLimit(`bulk-replace:${user.id}`, { limit: 20, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429, headers: { 'Retry-After': '3600' } })
  }

  const body = await request.json().catch(() => ({}))
  const codeId = typeof body?.codeId === 'string' ? body.codeId : null
  if (!codeId) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

  const db = createAdminClient()
  const order = await loadBulkOrder(db, user.id, paymentId)
  if (!order || order.status !== 'succeeded') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const target = order.codes.find(c => c.id === codeId)
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (target.status !== 'unused') return NextResponse.json({ error: 'This code has already been used', reason: 'used' }, { status: 409 })

  try {
    const code = await replaceBulkCode(db, codeId)
    if (!code) return NextResponse.json({ error: 'This code has already been used', reason: 'used' }, { status: 409 })
    return NextResponse.json({ ok: true, code }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[bulk-replace]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not replace the code.' }, { status: 500 })
  }
}
