import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { verifyGuestClaimToken } from '@/lib/guest-claim'

/**
 * Claim guest assessment submissions into the authenticated user's account.
 * Requires HMAC-signed claim tokens issued at guest submit time.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rl = await checkRateLimit(`claim-guest:${user.id}`, { limit: 10, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json().catch(() => null)
    const tokens = body?.tokens
    if (!Array.isArray(tokens) || tokens.length === 0 || tokens.length > 10) {
      return NextResponse.json({ error: 'tokens array required (max 10)' }, { status: 400 })
    }

    const submissionIds: string[] = []
    for (const token of tokens) {
      if (typeof token !== 'string') continue
      const verified = verifyGuestClaimToken(token)
      if (verified) submissionIds.push(verified.submissionId)
    }

    if (submissionIds.length === 0) {
      return NextResponse.json({ claimed: 0 })
    }

    const db = createAdminClient()
    let claimed = 0

    for (const id of submissionIds) {
      // Only claim orphan guest rows (patient_id IS NULL) — never reassign owned data
      const { data, error } = await db
        .from('assessment_submissions')
        .update({ patient_id: user.id })
        .eq('id', id)
        .is('patient_id', null)
        .select('id')
        .maybeSingle()

      if (!error && data) {
        claimed += 1
        await db.from('audit_log').insert({
          actor_id: user.id,
          action: 'guest_submission_claimed',
          target_type: 'assessment_submission',
          target_id: id,
          reason: 'Guest result claimed into authenticated account',
        })
      }
    }

    return NextResponse.json({ claimed })
  } catch (err) {
    console.error('claim-guest-results error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
