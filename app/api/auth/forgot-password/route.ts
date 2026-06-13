import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    // 3 reset requests per 15 minutes per IP — prevents email bombing
    const cfIp = request.headers.get('cf-connecting-ip')?.trim()
    const xff = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const ip = (cfIp && /^[\d.:a-fA-F]{2,45}$/.test(cfIp) ? cfIp : xff) ?? 'unknown'

    const rl = await checkRateLimit(`forgot-password:${ip}`, { limit: 3, windowMs: 15 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many reset requests. Please wait 15 minutes before trying again.' },
        { status: 429, headers: { 'Retry-After': '900' } }
      )
    }

    const { email, redirectTo } = await request.json()
    if (!email || typeof email !== 'string' || email.length > 254) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const supabase = createClient()
    // Always return success to prevent user enumeration (whether email exists or not)
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: typeof redirectTo === 'string' ? redirectTo : undefined,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('forgot-password error:', err)
    // Return success even on error — don't reveal backend state
    return NextResponse.json({ ok: true })
  }
}
