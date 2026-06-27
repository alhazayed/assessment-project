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

    // Rate limit: 3 signup attempts per hour per IP
    const ipLimit = await checkRateLimit(`signup:ip:${ip}`, { limit: 3, windowMs: 60 * 60 * 1000 })
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please wait 1 hour before trying again.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      )
    }

    // Rate limit: 3 signup attempts per hour per email
    const emailLimit = await checkRateLimit(`signup:email:${email.toLowerCase()}`, {
      limit: 3,
      windowMs: 60 * 60 * 1000,
    })
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many signup attempts from this email. Please wait 1 hour before trying again.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      )
    }

    return NextResponse.json({ allowed: true })
  } catch (err) {
    console.error('[check-signup-limit] error:', err)
    return NextResponse.json({ error: 'Rate limit check failed' }, { status: 500 })
  }
}
