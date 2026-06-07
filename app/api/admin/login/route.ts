import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeHmac } from '@/lib/admin-auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { email, password, pin } = await request.json()

    const expectedPin = process.env.ADMIN_PIN
    if (!expectedPin) return NextResponse.json({ error: 'Admin PIN not configured on server' }, { status: 503 })
    if (pin !== expectedPin) return NextResponse.json({ error: 'Invalid admin PIN' }, { status: 401 })

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const token = await computeHmac(data.user.id)
    const store = cookies()
    store.set('admin_session', token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
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
