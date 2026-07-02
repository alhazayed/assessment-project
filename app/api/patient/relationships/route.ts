import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      clinician:profiles!clinician_patient_relationships_clinician_id_fkey (
        full_name_en,
        full_name_ar,
        avatar_url
      ),
      clinician_verification:clinician_verifications!clinician_verifications_clinician_id_fkey (
        specialty,
        organization,
        professional_title
      ),
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

  // Reshape into the documented response schema
  const shaped = (relationships ?? []).map((rel) => {
    // Supabase infers joined foreign-key rows as arrays in its generic types,
    // but at runtime a to-one join returns a single object or null.
    // We cast through `unknown` to bridge the type mismatch safely.
    const clinicianProfile = rel.clinician as unknown as {
      full_name_en: string | null
      full_name_ar: string | null
      avatar_url: string | null
    } | null

    const verification = rel.clinician_verification as unknown as {
      specialty: string | null
      organization: string | null
      professional_title: string | null
    } | null

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
