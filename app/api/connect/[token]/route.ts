import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

interface RouteContext {
  params: { token: string }
}

// GET — public, no auth required
// Returns safe, non-identifying invitation details for the invite page
export async function GET(request: Request, { params }: RouteContext) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await checkRateLimit(`connect-invite:${ip}`, { limit: 30, windowMs: 15 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { token } = params

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: invitation, error } = await admin
    .from('clinician_invitations')
    .select('id, clinician_id, message, requested_permissions, expires_at, status')
    .eq('token', token)
    .eq('status', 'pending')
    .maybeSingle()

  if (error) {
    console.error('[GET /api/connect/[token]] query error:', error)
    return NextResponse.json({ error: 'Failed to fetch invitation' }, { status: 500 })
  }

  if (!invitation) {
    return NextResponse.json({ error: 'Invitation not found or already used' }, { status: 404 })
  }

  // Check expiry
  if (new Date(invitation.expires_at) <= new Date()) {
    // Mark as expired
    await admin
      .from('clinician_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id)

    return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 })
  }

  // Fetch clinician's public profile (name only — no user ID returned)
  const { data: clinicianProfile } = await admin
    .from('profiles')
    .select('full_name_en, full_name_ar')
    .eq('id', invitation.clinician_id)
    .maybeSingle()

  // Fetch clinician verification for specialty and organization
  const { data: clinicianVerification } = await admin
    .from('clinician_verifications')
    .select('specialty, organization')
    .eq('clinician_id', invitation.clinician_id)
    .eq('status', 'verified')
    .maybeSingle()

  return NextResponse.json({
    invitation: {
      clinician_name: clinicianProfile?.full_name_en ?? null,
      clinician_name_ar: clinicianProfile?.full_name_ar ?? null,
      specialty: clinicianVerification?.specialty ?? null,
      organization: clinicianVerification?.organization ?? null,
      message: invitation.message,
      requested_permissions: invitation.requested_permissions,
      expires_at: invitation.expires_at,
    },
  })
}

// POST — authenticated patient accepts invitation
export async function POST(request: Request, { params }: RouteContext) {
  const { token } = params

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify role = 'patient'
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'patient') {
    return NextResponse.json({ error: 'Forbidden: patient role required' }, { status: 403 })
  }

  let body: Record<string, unknown> = {}
  try {
    const text = await request.text()
    if (text) body = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch the pending invitation
  const { data: invitation, error: inviteError } = await admin
    .from('clinician_invitations')
    .select('id, clinician_id, requested_permissions, expires_at, status')
    .eq('token', token)
    .eq('status', 'pending')
    .maybeSingle()

  if (inviteError) {
    console.error('[POST /api/connect/[token]] fetch invitation error:', inviteError)
    return NextResponse.json({ error: 'Failed to fetch invitation' }, { status: 500 })
  }

  if (!invitation) {
    return NextResponse.json({ error: 'Invitation not found or already used' }, { status: 404 })
  }

  // Check expiry
  if (new Date(invitation.expires_at) <= new Date()) {
    await admin
      .from('clinician_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id)

    return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 })
  }

  // Prevent a clinician from accepting their own invitation
  if (invitation.clinician_id === user.id) {
    return NextResponse.json({ error: 'You cannot accept your own invitation' }, { status: 400 })
  }

  // Check for existing active relationship between patient and clinician
  const { data: existingRelationship } = await admin
    .from('clinician_patient_relationships')
    .select('id, status')
    .eq('clinician_id', invitation.clinician_id)
    .eq('patient_id', user.id)
    .in('status', ['pending', 'active'])
    .maybeSingle()

  if (existingRelationship) {
    const message =
      existingRelationship.status === 'pending'
        ? 'An access request is already pending with this clinician'
        : 'An active relationship already exists with this clinician'
    return NextResponse.json({ error: message }, { status: 409 })
  }

  // Determine granted permissions — patient can grant a subset of requested_permissions
  const requestedPermissions: string[] = Array.isArray(invitation.requested_permissions)
    ? invitation.requested_permissions
    : []

  const grantedPermissions: string[] =
    Array.isArray(body.granted_permissions) && body.granted_permissions.length > 0
      ? (body.granted_permissions as string[]).filter((p) => requestedPermissions.includes(p))
      : requestedPermissions

  const now = new Date().toISOString()

  // 1. Update invitation: status='accepted', patient_id, accepted_at
  const { error: inviteUpdateError } = await admin
    .from('clinician_invitations')
    .update({
      status: 'accepted',
      patient_id: user.id,
      accepted_at: now,
    })
    .eq('id', invitation.id)

  if (inviteUpdateError) {
    console.error('[POST /api/connect/[token]] invitation update error:', inviteUpdateError)
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
  }

  // 2. Insert clinician_patient_relationship
  const { data: newRelationship, error: relationshipError } = await admin
    .from('clinician_patient_relationships')
    .insert({
      clinician_id: invitation.clinician_id,
      patient_id: user.id,
      status: 'active',
      initiated_by: 'clinician',
      invitation_id: invitation.id,
      requested_permissions: requestedPermissions,
      responded_at: now,
    })
    .select()
    .single()

  if (relationshipError || !newRelationship) {
    console.error('[POST /api/connect/[token]] relationship insert error:', relationshipError)
    // Attempt to roll back the invitation status update
    await admin
      .from('clinician_invitations')
      .update({ status: 'pending', patient_id: null, accepted_at: null })
      .eq('id', invitation.id)
    return NextResponse.json({ error: 'Failed to create relationship' }, { status: 500 })
  }

  // 3. Insert relationship_permissions for each granted permission
  if (grantedPermissions.length > 0) {
    const permissionRows = grantedPermissions.map((permission_key) => ({
      relationship_id: newRelationship.id,
      permission_key,
      granted: true,
      granted_at: now,
      modified_by: user.id,
    }))

    const { error: permissionsError } = await admin
      .from('relationship_permissions')
      .insert(permissionRows)

    if (permissionsError) {
      console.error('[POST /api/connect/[token]] permissions insert error:', permissionsError)
      // Non-fatal: relationship is created, log and continue
    }
  }

  // 4. Notify clinician
  const { error: notifError } = await admin.from('notification_events').insert({
    recipient_id: invitation.clinician_id,
    sender_id: user.id,
    event_type: 'invitation_accepted',
    related_id: newRelationship.id,
    related_type: 'clinician_patient_relationship',
    title_en: 'Invitation Accepted',
    title_ar: 'تم قبول الدعوة',
    body_en: 'A patient has accepted your invitation and connected with you.',
    body_ar: 'قبل مريض دعوتك وتواصل معك.',
    link: '/clinician/patients',
  })

  if (notifError) {
    console.error('[POST /api/connect/[token]] notification insert error:', notifError)
  }

  // Write audit log
  const { error: auditError } = await admin.from('audit_log').insert({
    action: 'invitation_accepted',
    actor_id: user.id,
    target_type: 'clinician_invitation',
    target_id: invitation.id,
    reason: `relationship_id:${newRelationship.id}`,
  })

  if (auditError) {
    console.error('[POST /api/connect/[token]] audit log error:', auditError)
  }

  return NextResponse.json({ relationship: newRelationship }, { status: 201 })
}
