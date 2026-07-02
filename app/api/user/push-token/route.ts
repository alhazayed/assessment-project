import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getUser(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7)
    const admin = createAdminClient()
    const { data: { user }, error } = await admin.auth.getUser(token)
    if (!error && user) return user
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { token?: string; platform?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { token, platform } = body
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'token is required' }, { status: 400 })
  }
  if (!platform || !['ios', 'android', 'web'].includes(platform)) {
    return NextResponse.json({ error: 'platform must be ios, android, or web' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db.from('push_tokens').upsert(
    { user_id: user.id, token, platform, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,token' },
  )

  if (error) {
    console.error('push-token upsert:', error.message)
    return NextResponse.json({ error: 'Failed to register token' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { token?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { token } = body
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'token is required' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db
    .from('push_tokens')
    .delete()
    .eq('user_id', user.id)
    .eq('token', token)

  if (error) {
    console.error('push-token delete:', error.message)
    return NextResponse.json({ error: 'Failed to remove token' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
