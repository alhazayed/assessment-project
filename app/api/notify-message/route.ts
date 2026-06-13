import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

const MAX_TITLE_LEN = 200
const MAX_BODY_LEN  = 1000

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 30 notifications per hour per sender — prevents inbox flooding
    const rl = await checkRateLimit(`notify-message:${user.id}`, { limit: 30, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many message notifications. Please wait before sending more.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      )
    }

    const { recipient_id, title_en, title_ar, body_en, body_ar } = await request.json()
    if (!recipient_id || typeof recipient_id !== 'string') {
      return NextResponse.json({ error: 'recipient_id required' }, { status: 400 })
    }

    // Length caps — prevent large-payload DB writes
    if (title_en && (typeof title_en !== 'string' || title_en.length > MAX_TITLE_LEN)) {
      return NextResponse.json({ error: `title_en must be a string ≤${MAX_TITLE_LEN} chars` }, { status: 400 })
    }
    if (body_en && (typeof body_en !== 'string' || body_en.length > MAX_BODY_LEN)) {
      return NextResponse.json({ error: `body_en must be a string ≤${MAX_BODY_LEN} chars` }, { status: 400 })
    }
    if (title_ar && (typeof title_ar !== 'string' || title_ar.length > MAX_TITLE_LEN)) {
      return NextResponse.json({ error: `title_ar must be a string ≤${MAX_TITLE_LEN} chars` }, { status: 400 })
    }
    if (body_ar && (typeof body_ar !== 'string' || body_ar.length > MAX_BODY_LEN)) {
      return NextResponse.json({ error: `body_ar must be a string ≤${MAX_BODY_LEN} chars` }, { status: 400 })
    }

    // Verify the caller is either the patient or the clinician in the relevant conversation
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('id, role, assigned_clinician_id')
      .eq('id', user.id)
      .single()

    if (!callerProfile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Patient can notify their assigned clinician; clinician can notify any of their patients
    let allowed = false
    if (callerProfile.role === 'patient' && callerProfile.assigned_clinician_id === recipient_id) {
      allowed = true
    } else if (callerProfile.role === 'clinician') {
      const { data: patientProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', recipient_id)
        .eq('assigned_clinician_id', user.id)
        .single()
      if (patientProfile) allowed = true
    }

    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const db = createAdminClient()
    await db.from('notifications').insert({
      user_id: recipient_id,
      type: 'message',
      title_en: title_en?.trim() ?? null,
      title_ar: title_ar?.trim() ?? null,
      body_en: body_en?.trim() ?? null,
      body_ar: body_ar?.trim() ?? null,
      link: '/messages',
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('notify-message error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
