import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Role is bound into the HMAC so that revoking admin access invalidates the existing cookie.
// Uses ADMIN_SESSION_SECRET if set (recommended); falls back to ADMIN_PIN for backwards compat.
export async function computeHmac(userId: string, role: string): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET
    ?? (process.env.ADMIN_PIN ? process.env.ADMIN_PIN + '_vwelfare_admin' : null)
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
