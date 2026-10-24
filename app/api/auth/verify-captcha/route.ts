import { NextResponse } from 'next/server'
import { verifyTurnstileToken } from '@/lib/security/verifyTurnstile'
import { checkRateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/security/client-ip'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    const ip = getClientIp(request)

    // Rate limit CAPTCHA verification attempts: 10 per minute per IP
    const rl = await checkRateLimit(`captcha:${ip}`, { limit: 10, windowMs: 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please wait before trying again.' },
        { status: 429 }
      )
    }

    const result = await verifyTurnstileToken(token, ip !== 'unknown' ? ip : undefined)

    if (!result.success) {
      return NextResponse.json(
        { error: 'CAPTCHA verification failed', code: result.errorCode },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[verify-captcha] error:', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
