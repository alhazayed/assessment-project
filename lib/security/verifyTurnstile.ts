/**
 * Cloudflare Turnstile server-side token verification.
 *
 * Required environment variables:
 *   TURNSTILE_SECRET_KEY   — from Cloudflare dashboard (Turnstile > site > secret key)
 *
 * When TURNSTILE_SECRET_KEY is not set, verification is skipped in development
 * (NODE_ENV !== 'production') and fails closed in production.
 */

export interface TurnstileResult {
  success: boolean
  errorCode?: string
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteip?: string,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY

  // Fail closed in production if secret is missing
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[verifyTurnstile] TURNSTILE_SECRET_KEY is not set — failing closed')
      return { success: false, errorCode: 'missing-secret' }
    }
    // Development bypass: allow when key is not configured
    return { success: true }
  }

  if (!token || typeof token !== 'string' || token.length > 4096) {
    return { success: false, errorCode: 'missing-token' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)

  let res: Response
  try {
    const body = new URLSearchParams({ secret, response: token })
    if (remoteip) body.append('remoteip', remoteip)

    try {
      res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) {
      console.error('[verifyTurnstile] siteverify HTTP error:', res.status)
      return { success: false, errorCode: 'http-error' }
    }

    const data: { success: boolean; 'error-codes'?: string[] } = await res.json()
    if (!data.success) {
      return { success: false, errorCode: data['error-codes']?.[0] ?? 'verification-failed' }
    }

    return { success: true }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[verifyTurnstile] request timed out')
      return { success: false, errorCode: 'timeout' }
    }
    console.error('[verifyTurnstile] error:', err)
    return { success: false, errorCode: 'exception' }
  }
}
