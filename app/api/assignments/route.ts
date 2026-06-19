import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get('patient_id')

  // Determine the caller's role so we can apply the correct default filter
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? 'patient'
  const isClinician = ['clinician', 'admin', 'superadmin'].includes(role)

  let query = supabase
    .from('assessment_assignments')
    .select('*, assessment_definitions(id, code, name_en, name_ar)')
    .order('assigned_at', { ascending: false })

  if (patientId) {
    // Clinicians/admins may query any patient; patients may only query themselves
    if (!isClinician && patientId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    query = query.eq('patient_id', patientId)
  } else if (isClinician) {
    query = query.eq('clinician_id', user.id)
  } else {
    // Patients with no patient_id param → return their own assignments
    query = query.eq('patient_id', user.id)
  }

  const { data, error } = await query
  if (error) {
    console.error('assignments GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
  }
  return NextResponse.json({ assignments: data })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only clinicians and admins may create assignments
  const { data: callerProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const callerRole = callerProfile?.role ?? ''
  if (!['clinician', 'admin', 'superadmin'].includes(callerRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { patient_id, definition_id, due_date, note_en, note_ar } = await request.json()
  if (!patient_id || !definition_id) {
    return NextResponse.json({ error: 'patient_id and definition_id are required' }, { status: 400 })
  }

  // Clinicians may only assign to their own patients; admins/superadmins may assign to anyone
  if (callerRole === 'clinician') {
    const { data: patientProfile } = await supabase
      .from('profiles')
      .select('assigned_clinician_id')
      .eq('id', patient_id)
      .single()
    if (patientProfile?.assigned_clinician_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden — patient is not assigned to you' }, { status: 403 })
    }
  }

  // Fetch assessment name for notification
  const { data: def } = await supabase
    .from('assessment_definitions')
    .select('name_en, name_ar')
    .eq('id', definition_id)
    .single()

  const { data, error } = await supabase
    .from('assessment_assignments')
    .insert({
      patient_id,
      clinician_id: user.id,
      definition_id,
      due_date: due_date || null,
      note_to_patient_en: note_en || null,
      note_to_patient_ar: note_ar || null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('assignment insert error:', error)
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 })
  }

  // Fire notification to patient
  await supabase.from('notifications').insert({
    user_id: patient_id,
    type: 'assignment',
    title_en: 'New assessment assigned',
    title_ar: 'تم تعيين تقييم جديد',
    body_en: `You have been assigned: ${def?.name_en ?? 'an assessment'}`,
    body_ar: `تم تعيينك لإجراء: ${def?.name_ar ?? 'تقييم'}`,
    link: '/assessments',
  })

  return NextResponse.json({ assignment: data })
}

const ALLOWED_STATUSES = ['pending', 'completed', 'expired'] as const

export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await request.json()
  if (!id || !status) return NextResponse.json({ error: 'id and status are required' }, { status: 400 })
  if (!ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const isClinician = profile && ['clinician', 'admin', 'superadmin'].includes(profile.role)

  // Clinicians update via clinician_id; patients update via patient_id (e.g., completing assignment)
  const filter = isClinician
    ? supabase.from('assessment_assignments').update({ status }).eq('id', id).eq('clinician_id', user.id)
    : supabase.from('assessment_assignments').update({ status }).eq('id', id).eq('patient_id', user.id)

  const { data, error } = await filter.select().single()
  if (error) return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 })
  return NextResponse.json({ assignment: data })
}
