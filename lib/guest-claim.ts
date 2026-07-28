import { createHmac, timingSafeEqual } from 'crypto'

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getSecret(): string {
  const secret =
    process.env.GUEST_CLAIM_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!secret) throw new Error('Missing guest claim secret')
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

/** Create a signed claim token for a guest submission. */
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
  const expected = sign(payload)
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }

  // UUID v4 shape check
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)) {
    return null
  }

  return { submissionId }
}

export const GUEST_CLAIM_STORAGE_KEY = 'vw_guest_claim_tokens'
