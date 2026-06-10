import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { recipient_id, title_en, title_ar, body_en, body_ar } = await request.json()
    if (!recipient_id) return NextResponse.json({ error: 'recipient_id required' }, { status: 400 })

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
      title_en,
      title_ar,
      body_en,
      body_ar,
      link: '/messages',
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('notify-message error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
