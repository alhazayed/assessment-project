import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status')

  if (profile.role === 'clinician') {
    let query = supabase
      .from('clinician_patient_relationships')
      .select(`
        *,
        relationship_permissions (*),
        patient:profiles!clinician_patient_relationships_patient_id_fkey (
          full_name_en,
          full_name_ar
        )
      `)
      .eq('clinician_id', user.id)

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: requests, error } = await query

    if (error) {
      console.error('[GET /api/access-requests] clinician query error:', error)
      return NextResponse.json({ error: 'Failed to fetch access requests' }, { status: 500 })
    }

    return NextResponse.json({ requests: requests ?? [] })
  }

  if (profile.role === 'patient') {
    let query = supabase
      .from('clinician_patient_relationships')
      .select(`
        *,
        clinician:profiles!clinician_patient_relationships_clinician_id_fkey (
          full_name_en,
          full_name_ar,
          role
        ),
        clinician_verification:clinician_verifications!clinician_verifications_clinician_id_fkey (
          specialty,
          organization
        )
      `)
      .eq('patient_id', user.id)

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    } else {
      query = query.eq('status', 'pending')
    }

    const { data: requests, error } = await query

    if (error) {
      console.error('[GET /api/access-requests] patient query error:', error)
      return NextResponse.json({ error: 'Failed to fetch access requests' }, { status: 500 })
    }

    return NextResponse.json({ requests: requests ?? [] })
  }

  return NextResponse.json({ error: 'Forbidden: unsupported role' }, { status: 403 })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'clinician') {
    return NextResponse.json({ error: 'Forbidden: clinician role required' }, { status: 403 })
  }

  const rateLimit = await checkRateLimit(`access_request:${user.id}`, {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  })
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { patient_code, request_message, requested_permissions } = body as {
    patient_code?: string
    request_message?: string
    requested_permissions?: string[]
  }

  if (!patient_code || typeof patient_code !== 'string' || !patient_code.trim()) {
    return NextResponse.json({ error: 'patient_code is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify the clinician is verified
  const { data: verification } = await supabase
    .from('clinician_verifications')
    .select('id, status')
    .eq('clinician_id', user.id)
    .eq('status', 'verified')
    .maybeSingle()

  if (!verification) {
    return NextResponse.json(
      { error: 'Clinician account not verified' },
      { status: 403 }
    )
  }

  // Look up the patient by code
  const { data: accessCode } = await supabase
    .from('patient_access_codes')
    .select('id, patient_id, code')
    .eq('code', patient_code.trim())
    .eq('is_active', true)
    .maybeSingle()

  if (!accessCode) {
    return NextResponse.json(
      { error: 'Invalid or inactive patient code' },
      { status: 404 }
    )
  }

  // Update last_used_at on the access code
  const { error: codeUpdateError } = await admin
    .from('patient_access_codes')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', accessCode.id)

  if (codeUpdateError) {
    console.error('[POST /api/access-requests] failed to update access code:', codeUpdateError)
  }

  // Check for an existing relationship
  const { data: existingRelationship } = await supabase
    .from('clinician_patient_relationships')
    .select('id, status')
    .eq('clinician_id', user.id)
    .eq('patient_id', accessCode.patient_id)
    .in('status', ['pending', 'active'])
    .maybeSingle()

  if (existingRelationship) {
    const message =
      existingRelationship.status === 'pending'
        ? 'An access request is already pending for this patient'
        : 'An active relationship already exists with this patient'
    return NextResponse.json({ error: message }, { status: 409 })
  }

  const defaultPermissions = [
    'view_profile',
    'view_assessment_results',
    'view_assessment_history',
    'message_patient',
  ]

  const permissionsToUse =
    Array.isArray(requested_permissions) && requested_permissions.length > 0
      ? requested_permissions
      : defaultPermissions

  // Insert the relationship
  const { data: newRelationship, error: insertError } = await admin
    .from('clinician_patient_relationships')
    .insert({
      clinician_id: user.id,
      patient_id: accessCode.patient_id,
      status: 'pending',
      initiated_by: 'clinician',
      patient_code_used: patient_code.trim(),
      request_message: request_message ?? null,
      requested_permissions: permissionsToUse,
    })
    .select()
    .single()

  if (insertError || !newRelationship) {
    console.error('[POST /api/access-requests] insert relationship error:', insertError)
    return NextResponse.json({ error: 'Failed to create access request' }, { status: 500 })
  }

  // Insert notification event for the patient
  const { error: notifError } = await admin.from('notification_events').insert({
    recipient_id: accessCode.patient_id,
    sender_id: user.id,
    event_type: 'access_request',
    related_id: newRelationship.id,
    related_type: 'clinician_patient_relationship',
    title_en: 'New Access Request',
    title_ar: 'طلب وصول جديد',
    body_en: 'A clinician is requesting access to your health data',
    body_ar: 'يطلب طبيب نفسي الوصول إلى بياناتك الصحية',
    link: '/patient/clinicians',
  })

  if (notifError) {
    console.error('[POST /api/access-requests] notification insert error:', notifError)
  }

  // Write audit log
  const { error: auditError } = await admin.from('audit_log').insert({
    action: 'access_request_sent',
    actor_id: user.id,
    target_type: 'clinician_patient_relationship',
    target_id: newRelationship.id,
  })

  if (auditError) {
    console.error('[POST /api/access-requests] audit log error:', auditError)
  }

  return NextResponse.json({ relationship: newRelationship }, { status: 201 })
}
