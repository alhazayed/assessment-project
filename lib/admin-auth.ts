import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export class AdminAuthError extends Error {
  constructor(
    readonly status: 401 | 403,
    message: string,
  ) {
    super(message)
    this.name = 'AdminAuthError'
  }
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

export async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/x/control/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'superadmin'].includes(profile.role)) redirect('/x/control/login')

  const store = cookies()
  const cookie = store.get('admin_session')?.value
  // HMAC includes current role — if role was revoked, stored cookie will not match
  const expected = await computeHmac(user.id, profile.role)
  if (cookie !== expected) redirect('/x/control/login')

  return { user, role: profile.role as 'admin' | 'superadmin' }
}

/** API-safe admin guard — returns JSON-friendly errors instead of redirects. */
export async function requireAdminApi() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new AdminAuthError(401, 'Unauthorized')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    throw new AdminAuthError(403, 'Forbidden')
  }

  const store = cookies()
  const cookie = store.get('admin_session')?.value
  const expected = await computeHmac(user.id, profile.role)
  if (cookie !== expected) throw new AdminAuthError(401, 'Admin session required')

  return { user, role: profile.role as 'admin' | 'superadmin' }
}
