import { createHmac, timingSafeEqual } from 'crypto'

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Server-only HMAC secret for guest claim tokens.
 * Never fall back to NEXT_PUBLIC_* keys — those are browser-visible and
 * would let anyone forge claim tokens for orphan guest submissions.
 */
function getSecret(): string {
  const secret = process.env.GUEST_CLAIM_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error('Missing GUEST_CLAIM_SECRET (or SUPABASE_SERVICE_ROLE_KEY) for guest claim tokens')
  }
  if (secret === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Guest claim secret must not be the public anon key')
  }
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

/** Create a signed claim token for a guest submission. Server-only. */
export function createGuestClaimToken(submissionId: string): string {
  const exp = Date.now() + TOKEN_TTL_MS
  const payload = `${submissionId}.${exp}`
  return `${payload}.${sign(payload)}`
}

export function verifyGuestClaimToken(token: string): { submissionId: string } | null {
  if (typeof token !== 'string' || token.length > 200) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [submissionId, expStr, sig] = parts
  if (!submissionId || !expStr || !sig) return null
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || Date.now() > exp) return null

  const payload = `${submissionId}.${expStr}`
  let expected: string
  try {
    expected = sign(payload)
  } catch {
    return null
  }
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }

  // UUID shape check
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)) {
    return null
  }

  return { submissionId }
}
