import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/security/client-ip'
import { cookies } from 'next/headers'

// Constant-time comparison for the admin PIN. HMAC-wrapping both sides with a
// per-call random key yields fixed-length digests, so neither the comparison
// nor a length difference leaks timing information about the secret.
function timingSafeStrEqual(a: unknown, b: unknown): boolean {
  const key = crypto.randomBytes(32)
  const ah = crypto.createHmac('sha256', key).update(String(a ?? '')).digest()
  const bh = crypto.createHmac('sha256', key).update(String(b ?? '')).digest()
  return crypto.timingSafeEqual(ah, bh)
}

export async function POST(request: Request) {
  try {
    // Rate-limit: 5 attempts per 15 minutes per IP
    const ip = getClientIp(request)
    const rl = await checkRateLimit(`admin-login:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many login attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    const { email, password, pin } = await request.json()
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Per-account lockout as well, so rotating IPs cannot keep guessing one
    // admin's password and PIN.
    const accountRl = await checkRateLimit(`admin-login:email:${email.trim().toLowerCase()}`, { limit: 5, windowMs: 15 * 60 * 1000 })
    if (!accountRl.allowed) {
      return NextResponse.json({ error: 'Too many login attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    const expectedPin = process.env.ADMIN_PIN
    if (!expectedPin) return NextResponse.json({ error: 'Admin PIN not configured on server' }, { status: 503 })
    // Validate PIN and credentials with a unified error to prevent factor enumeration
    if (!timingSafeStrEqual(pin, expectedPin)) {
      try {
        const logDb = createAdminClient()
        await logDb.from('audit_log').insert({
          action: 'admin_login_failed',
          target_type: 'admin_session',
          details: { ip },
        })
      } catch { /* non-fatal */ }
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      try {
        const logDb = createAdminClient()
        await logDb.from('audit_log').insert({
          action: 'admin_login_failed',
          target_type: 'admin_session',
          details: { ip },
        })
      } catch { /* non-fatal */ }
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('profiles').select('role, is_active').eq('id', data.user.id).single()
    if (!profile || profile.is_active === false || !['admin', 'superadmin'].includes(profile.role)) {
      // Sign out and return the SAME generic 401 as a bad PIN/password so a valid
      // non-admin credential pair cannot be distinguished (no factor enumeration).
      await supabase.auth.signOut()
      try {
        const logDb = createAdminClient()
        await logDb.from('audit_log').insert({ action: 'admin_login_failed', target_type: 'admin_session', details: { ip, reason: 'non_admin' } })
      } catch { /* non-fatal */ }
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Password and PIN are only the first step. The admin_session cookie is
    // issued by /api/admin/login/mfa once an authenticator-app code has
    // raised this Supabase session to aal2, which is also what the database
    // admin rules require.
    const store = await cookies()
    store.set('admin_session', '', { maxAge: 0, path: '/' })

    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
    if (factorsError) throw factorsError

    const verified = factors.totp.find(f => f.status === 'verified')
    if (verified) {
      return NextResponse.json({ mfa: 'verify', factorId: verified.id })
    }

    // First admin login since MFA became mandatory: drop any half-finished
    // enrolment and start a fresh one.
    for (const factor of factors.all) {
      if (factor.factor_type === 'totp' && factor.status !== 'verified') {
        await supabase.auth.mfa.unenroll({ factorId: factor.id })
      }
    }
    const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'V Welfare admin',
    })
    if (enrollError || !enrolled) throw enrollError ?? new Error('MFA enrolment failed')

    return NextResponse.json({
      mfa: 'enroll',
      factorId: enrolled.id,
      qrCode: enrolled.totp.qr_code,
      secret: enrolled.totp.secret,
    })
  } catch (err) {
    console.error('[admin/login] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE() {
  const store = await cookies()
  store.set('admin_session', '', { maxAge: 0, path: '/' })
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
