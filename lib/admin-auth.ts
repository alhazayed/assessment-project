import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function computeHmac(userId: string): Promise<string> {
  const pin = process.env.ADMIN_PIN || 'changeme'
  const enc = new TextEncoder()
  const keyMaterial = enc.encode(pin + '_vwelfare_admin')
  const key = await crypto.subtle.importKey('raw', keyMaterial, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(userId))
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
  const expected = await computeHmac(user.id)
  if (cookie !== expected) redirect('/x/control/login')

  return { user, role: profile.role as 'admin' | 'superadmin' }
}
