import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const cfIp = request.headers.get('cf-connecting-ip')?.trim()
    const xff = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const ip = (cfIp && /^[\d.:a-fA-F]{2,45}$/.test(cfIp) ? cfIp : xff) ?? 'unknown'

    // Rate limit: 5 login attempts per 15 minutes per IP
    const ipLimit = await checkRateLimit(`login:ip:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 })
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait 15 minutes before trying again.' },
        { status: 429, headers: { 'Retry-After': '900' } }
      )
    }

    // Rate limit: 5 login attempts per 15 minutes per email (accounts for enumeration)
    const emailLimit = await checkRateLimit(`login:email:${email.toLowerCase()}`, {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    })
    if (!emailLimit.allowed) {
      // Return generic message to not reveal if account exists
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait 15 minutes before trying again.' },
        { status: 429, headers: { 'Retry-After': '900' } }
      )
    }

    return NextResponse.json({ allowed: true })
  } catch (err) {
    console.error('[check-login-limit] error:', err)
    return NextResponse.json({ error: 'Rate limit check failed' }, { status: 500 })
  }
}
