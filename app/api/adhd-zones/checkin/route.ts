import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const VALID_ZONES = ['green', 'yellow', 'red', 'black']
const MAX_BODY_BYTES = 4 * 1024
const MAX_ANSWERS = 20
const ANSWER_KEY_RE = /^[a-z][a-z0-9_]{0,31}$/

/** answers must be a flat { questionId: zone } map; anything else is rejected. */
function sanitizeAnswers(answers: unknown): Record<string, string> | null {
  if (answers === undefined || answers === null) return {}
  if (typeof answers !== 'object' || Array.isArray(answers)) return null
  const entries = Object.entries(answers as Record<string, unknown>)
  if (entries.length > MAX_ANSWERS) return null
  const out: Record<string, string> = {}
  for (const [key, value] of entries) {
    if (!ANSWER_KEY_RE.test(key) || typeof value !== 'string' || !VALID_ZONES.includes(value)) return null
    out[key] = value
  }
  return out
}

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

    // Rate limit: 30 check-ins per hour per user
    const rl = await checkRateLimit(`adhd-checkin:${user.id}`, { limit: 30, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many check-ins. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      )
    }

    const raw = await request.text()
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }
    let body: { zone?: unknown; answers?: unknown }
    try {
      body = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const zone = body.zone

    if (typeof zone !== 'string' || !VALID_ZONES.includes(zone)) {
      return NextResponse.json({ error: 'Invalid zone' }, { status: 400 })
    }

    const answers = sanitizeAnswers(body.answers)
    if (!answers) {
      return NextResponse.json({ error: 'Invalid answers' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('adhd_zone_checkins')
      .insert({
        user_id: user.id,
        zone,
        answers,
      })
      .select('id, zone, created_at')
      .single()

    if (error) {
      console.error('ADHD check-in save error:', error.message)
      return NextResponse.json({ error: 'Failed to save check-in' }, { status: 500 })
    }

    return NextResponse.json({ success: true, checkin: data })
  } catch (error) {
    console.error('ADHD check-in error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
