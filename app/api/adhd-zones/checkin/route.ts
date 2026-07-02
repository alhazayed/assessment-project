import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const VALID_ZONES = ['green', 'yellow', 'red', 'black']

/**
 * POST /api/adhd-zones/checkin
 *
 * Persist an ADHD regulation zone check-in for the authenticated user.
 * Body: { zone: 'green'|'yellow'|'red'|'black', answers: Record<string,string> }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { zone, answers } = body

    if (!zone || !VALID_ZONES.includes(zone)) {
      return NextResponse.json({ error: 'Invalid zone' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('adhd_zone_checkins')
      .insert({
        user_id: user.id,
        zone,
        answers: answers && typeof answers === 'object' ? answers : {},
      })
      .select('id, zone, created_at')
      .single()

    if (error) {
      console.error('ADHD check-in save error:', error)
      return NextResponse.json({ error: 'Failed to save check-in' }, { status: 500 })
    }

    return NextResponse.json({ success: true, checkin: data })
  } catch (error) {
    console.error('ADHD check-in error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/adhd-zones/checkin
 *
 * Return the authenticated user's recent zone check-ins (most recent first).
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('adhd_zone_checkins')
      .select('id, zone, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(14)

    if (error) {
      console.error('ADHD check-in fetch error:', error)
      return NextResponse.json({ error: 'Failed to load check-ins' }, { status: 500 })
    }

    return NextResponse.json({ checkins: data || [] })
  } catch (error) {
    console.error('ADHD check-in fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
