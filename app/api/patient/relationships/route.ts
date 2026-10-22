import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchDisplayProfiles } from '@/lib/authz/counterparty'

// GET /api/patient/relationships
// Returns all clinician relationships for the authenticated patient,
// including clinician profile, verification details, and permission rows.
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify the caller holds the patient role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (profile.role !== 'patient') {
    return NextResponse.json({ error: 'Forbidden: patient role required' }, { status: 403 })
  }

  // Fetch all relationships where this user is the patient.
  // RLS on clinician_patient_relationships must permit the patient to read
  // their own rows; the joined tables are read through the same query so
  // their policies also apply.
  //
  // NOTE: clinician_verifications is fetched SEPARATELY (below) rather than as an
  // embedded resource. There is no foreign key between
  // clinician_patient_relationships and clinician_verifications — both only
  // reference profiles(id) via clinician_id — so PostgREST cannot resolve an
  // embed of clinician_verifications here and returns an error, which surfaced
  // to patients as a "Failed to load data" banner.
  const { data: relationships, error: relError } = await supabase
    .from('clinician_patient_relationships')
    .select(`
      id,
      status,
      initiated_by,
      requested_at,
      responded_at,
      revoked_at,
      last_access_at,
      clinician_id,
      relationship_permissions (
        permission_key,
        granted,
        granted_at,
        revoked_at
      )
    `)
    .eq('patient_id', user.id)
    .order('requested_at', { ascending: false })

  if (relError) {
    console.error('[GET /api/patient/relationships] query error:', relError)
    return NextResponse.json({ error: 'Failed to fetch relationships' }, { status: 500 })
  }

  // Fetch verification details for the involved clinicians in one query and
  // index by clinician_id for merge. Missing rows are fine (null fields).
  const clinicianIds = Array.from(
    new Set((relationships ?? []).map((r) => r.clinician_id).filter(Boolean))
  ) as string[]

  // Patients can't read clinician profiles or verification rows through RLS,
  // so both come from the service role, limited to clinicians already on this
  // patient's own relationships. Without this the patient approved requests
  // without seeing who was asking.
  const admin = createAdminClient()
  const profilesById = await fetchDisplayProfiles(admin, clinicianIds)

  const verificationByClinician = new Map<
    string,
    {
      specialty: string | null
      organization: string | null
      professional_title: string | null
      verified: boolean
    }
  >()
  if (clinicianIds.length > 0) {
    const { data: verifications, error: verErr } = await admin
      .from('clinician_verifications')
      .select('clinician_id, specialty, organization, professional_title, status')
      .in('clinician_id', clinicianIds)
    if (verErr) {
      // Non-fatal: relationships still render without verification metadata.
      console.error('[GET /api/patient/relationships] verification query error:', verErr)
    } else {
      for (const v of verifications ?? []) {
        verificationByClinician.set(v.clinician_id as string, {
          specialty: v.specialty ?? null,
          organization: v.organization ?? null,
          professional_title: v.professional_title ?? null,
          verified: v.status === 'verified',
        })
      }
    }
  }

  // Reshape into the documented response schema
  const shaped = (relationships ?? []).map((rel) => {
    const clinicianProfile = rel.clinician_id
      ? profilesById.get(rel.clinician_id as string) ?? null
      : null

    const verification = rel.clinician_id
      ? verificationByClinician.get(rel.clinician_id as string) ?? null
      : null

    const permissions = (
      rel.relationship_permissions as Array<{
        permission_key: string
        granted: boolean
        granted_at: string | null
        revoked_at: string | null
      }>
    ) ?? []

    return {
      id: rel.id,
      status: rel.status,
      initiated_by: rel.initiated_by,
      requested_at: rel.requested_at,
      responded_at: rel.responded_at,
      revoked_at: rel.revoked_at,
      last_access_at: rel.last_access_at,
      clinician: {
        id: rel.clinician_id,
        full_name_en: clinicianProfile?.full_name_en ?? null,
        full_name_ar: clinicianProfile?.full_name_ar ?? null,
        avatar_url: clinicianProfile?.avatar_url ?? null,
        specialty: verification?.specialty ?? null,
        organization: verification?.organization ?? null,
        professional_title: verification?.professional_title ?? null,
        verified: verification?.verified ?? false,
      },
      permissions: permissions.map((p) => ({
        permission_key: p.permission_key,
        granted: p.granted,
        granted_at: p.granted_at,
        revoked_at: p.revoked_at,
      })),
    }
  })

  return NextResponse.json({ relationships: shaped })
}
