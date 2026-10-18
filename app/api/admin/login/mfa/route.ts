import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeHmac } from '@/lib/admin-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/security/client-ip'
import { cookies } from 'next/headers'

// Second step of the admin login. /api/admin/login has already checked the
// PIN and password and left an aal1 Supabase session; this verifies the
// authenticator-app code (which raises the session to aal2) and only then
// issues the admin_session cookie.
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Session expired. Sign in again.', restart: true }, { status: 401 })

    // A 6-digit code has 1M values: cap guesses per account and per IP.
    const userRl = await checkRateLimit(`admin-mfa:${user.id}`, { limit: 5, windowMs: 15 * 60 * 1000 })
    const ipRl = await checkRateLimit(`admin-mfa:ip:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 })
    if (!userRl.allowed || !ipRl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    const { data: profile } = await supabase.from('profiles').select('role, is_active').eq('id', user.id).single()
    if (!profile || profile.is_active === false || !['admin', 'superadmin'].includes(profile.role)) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'Invalid credentials', restart: true }, { status: 401 })
    }

    const { factorId, code } = await request.json()
    if (typeof factorId !== 'string' || typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
      return NextResponse.json({ error: 'Enter the 6-digit code from your authenticator app.' }, { status: 400 })
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() })
    if (error) {
      try {
        await createAdminClient().from('audit_log').insert({
          actor_id: user.id,
          action: 'admin_login_failed',
          target_type: 'admin_session',
          details: { ip, reason: 'mfa' },
        })
      } catch { /* non-fatal */ }
      return NextResponse.json({ error: 'That code did not match. Try the current code.' }, { status: 401 })
    }

    const token = await computeHmac(user.id, profile.role)
    const store = await cookies()
    store.set('admin_session', token, {
      httpOnly: true, secure: true,
      sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8,
    })

    try {
      await createAdminClient().from('audit_log').insert({
        actor_id: user.id,
        action: 'admin_login',
        target_type: 'admin_session',
        details: { ip },
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/login/mfa] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
