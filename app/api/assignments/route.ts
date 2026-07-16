import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { verifyAdminSession } from '@/lib/admin-auth'
import { clinicianHasPatientAccess } from '@/lib/authz/clinician-access'
import { logClinicianPhiAccess } from '@/lib/audit/phi-access'
import type { SupabaseClient } from '@supabase/supabase-js'

// A clinician may only reach another user's assignments when they have a
// treating relationship with that patient. Authorization goes through the
// centralized has_clinician_access primitive (active consent granting
// `view_assessment_history` OR the legacy assigned_clinician_id link), plus the
// assignment-specific arm of assign_read: a clinician may also read assignments
// they authored themselves. This mirrors the RLS policy so the API returns a
// clean 403 instead of leaking that the patient exists via an empty result set.
async function clinicianCanAccessPatient(
  supabase: SupabaseClient,
  clinicianId: string,
  patientId: string,
): Promise<boolean> {
  if (await clinicianHasPatientAccess(supabase, clinicianId, patientId, 'view_assessment_history')) {
    return true
  }

  // Mirror the `clinician_id = auth.uid()` arm of the assign_read RLS policy:
  // a clinician may read assignments they authored for this patient (e.g. ones
  // created before a re-assignment changed the treating relationship). Without
  // this the API gate would 403 a request that RLS would permit.
  const { count } = await supabase
    .from('assessment_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', patientId)
    .eq('clinician_id', clinicianId)
  return (count ?? 0) > 0
}

export async function GET(request: Request) {
  const supabase = await createClient()
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
    if (patientId !== user.id) {
      // Admins/superadmins may query any patient, but that privileged read must
      // be backed by a valid HMAC admin_session — an admin role on the Supabase
      // session alone is not sufficient. Clinicians may only query a patient
      // they have a treating relationship with — never an arbitrary one (IDOR).
      // Patients may only query themselves.
      if (role === 'admin' || role === 'superadmin') {
        const admin = await verifyAdminSession()
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      } else if (role === 'clinician') {
        const allowed = await clinicianCanAccessPatient(supabase, user.id, patientId)
        if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        // Access accountability (F-3): a clinician read another patient's
        // assignments. Fire-and-forget; never blocks the response.
        logClinicianPhiAccess(createAdminClient(), { actorId: user.id, patientId, resource: 'assessment_assignments' })
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only clinicians and admins may create assignments
  const { data: callerProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const callerRole = callerProfile?.role ?? ''
  if (!['clinician', 'admin', 'superadmin'].includes(callerRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Admin/superadmin create operations are a privileged path and must be backed
  // by a valid HMAC admin_session, not merely an admin role on the Supabase
  // session. The clinician path (below) is unchanged and keeps its own
  // assigned-patient relationship validation.
  if (callerRole === 'admin' || callerRole === 'superadmin') {
    const admin = await verifyAdminSession()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 20 assignments/hour per clinician
  const rl = await checkRateLimit(`assignments:${user.id}`, { limit: 20, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    )
  }

  const { patient_id, definition_id, due_date, note_en, note_ar } = await request.json()
  if (!patient_id || !definition_id) {
    return NextResponse.json({ error: 'patient_id and definition_id are required' }, { status: 400 })
  }

  // Clinicians may only assign to patients they have a treating relationship
  // with; admins/superadmins may assign to anyone. Authorization goes through
  // the centralized primitive (active consent granting 'view_assessment_history'
  // OR the legacy assigned_clinician_id link) so legacy patients keep working.
  if (callerRole === 'clinician') {
    const allowed = await clinicianHasPatientAccess(supabase, user.id, patient_id, 'view_assessment_history')
    if (!allowed) {
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
  const supabase = await createClient()
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
