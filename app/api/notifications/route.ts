import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    console.error('notifications GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
  return NextResponse.json({ notifications: data })
}

export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit: 100 mark-read requests/hour per user
  const rl = await checkRateLimit(`notifications:${user.id}`, { limit: 100, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    )
  }

  const { ids } = await request.json()

  const query = ids?.length
    ? supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids).eq('user_id', user.id)
    : supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null)

  const { error } = await query
  if (error) {
    console.error('notifications PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
