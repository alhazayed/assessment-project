import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeHmac } from '@/lib/admin-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    // Rate-limit: 5 attempts per 15 minutes per IP
    const cfIp = request.headers.get('cf-connecting-ip')?.trim()
    const xff = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const ip = (cfIp && /^[\d.:a-fA-F]{2,45}$/.test(cfIp) ? cfIp : xff) ?? 'unknown'
    const rl = await checkRateLimit(`admin-login:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many login attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    const { email, password, pin } = await request.json()

    const expectedPin = process.env.ADMIN_PIN
    if (!expectedPin) return NextResponse.json({ error: 'Admin PIN not configured on server' }, { status: 503 })
    // Validate PIN and credentials with a unified error to prevent factor enumeration
    if (pin !== expectedPin) {
      try {
        const logDb = createAdminClient()
        await logDb.from('audit_log').insert({
          action: 'admin_login_failed',
          target_type: 'admin_session',
          details: { ip, email },
        })
      } catch { /* non-fatal */ }
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      try {
        const logDb = createAdminClient()
        await logDb.from('audit_log').insert({
          action: 'admin_login_failed',
          target_type: 'admin_session',
          details: { ip, email },
        })
      } catch { /* non-fatal */ }
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const token = await computeHmac(data.user.id, profile.role)
    const store = cookies()
    store.set('admin_session', token, {
      httpOnly: true, secure: true,
      sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE() {
  const store = cookies()
  store.set('admin_session', '', { maxAge: 0, path: '/' })
  const supabase = createClient()
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
