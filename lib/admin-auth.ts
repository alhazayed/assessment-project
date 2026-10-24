import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'

// Constant-time comparison of the admin_session cookie against the expected
// HMAC. Both sides are re-HMAC'd with a per-call random key so the comparison
// is fixed-length and leaks neither timing nor length information (and tolerates
// a missing/undefined cookie without throwing).
function timingSafeStrEqual(a: string | undefined | null, b: string | undefined | null): boolean {
  const key = crypto.randomBytes(32)
  const ah = crypto.createHmac('sha256', key).update(String(a ?? '')).digest()
  const bh = crypto.createHmac('sha256', key).update(String(b ?? '')).digest()
  return crypto.timingSafeEqual(ah, bh)
}

// requireAdmin() denies access via Next.js redirect(), which throws a
// NEXT_REDIRECT control error. Inside an API route handler that surfaces as a
// 500 that echoes the internal "NEXT_REDIRECT" token unless it is caught and
// translated. Use adminRouteError() in admin API catch blocks so an auth
// denial returns a clean 401 and any genuine error returns a generic 500
// (never leaking an internal error message/stack). See SEC-3 in SECURITY_AUDIT.md.
export function isAuthRedirectError(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest
  return digest != null && String(digest).startsWith('NEXT_REDIRECT')
}

export function adminRouteError(error: unknown): NextResponse {
  if (isAuthRedirectError(error)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

// Role is bound into the HMAC so that revoking admin access invalidates the existing cookie.
export async function computeHmac(userId: string, role: string): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) throw new Error('ADMIN_SESSION_SECRET environment variable is not configured')
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(userId + ':' + role))
  return Buffer.from(sig).toString('base64url')
}

// Shared admin gate: authenticated user + active admin/superadmin profile +
// an MFA-verified (aal2) Supabase session + a valid HMAC admin_session cookie.
// aal2 is required because the database admin rules only apply to aal2
// sessions (migration 20261018120000), so a password-only session must never
// look like an admin session here either.
async function resolveAdminSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role, is_active').eq('id', user.id).single()
  if (!profile || profile.is_active === false || !['admin', 'superadmin'].includes(profile.role)) return null

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.currentLevel !== 'aal2') return null

  const store = await cookies()
  const cookie = store.get('admin_session')?.value
  // HMAC includes current role — if role was revoked, stored cookie will not match
  const expected = await computeHmac(user.id, profile.role)
  if (!timingSafeStrEqual(cookie, expected)) return null

  return { user, role: profile.role as 'admin' | 'superadmin' }
}

export async function requireAdmin() {
  const session = await resolveAdminSession()
  if (!session) redirect('/x/control/login')
  return session
}

// Non-throwing admin gate for mixed-role routes (e.g. patient-OR-admin
// endpoints) that cannot call requireAdmin() because a legitimate non-admin
// caller must not be redirected. Applies the SAME requirements as
// requireAdmin() and returns the admin identity, or null when the caller is
// not an authenticated admin with a valid admin session.
export async function verifyAdminSession() {
  return resolveAdminSession()
}
