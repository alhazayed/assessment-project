import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/clinician/patients
// Returns all active patients for the authenticated clinician, with
// permission rows and the most recent assessment submission for each patient.
// Also updates last_access_at on every returned relationship so the clinician's
// most recent portal visit is recorded.
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify the caller holds the clinician role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (profile.role !== 'clinician') {
    return NextResponse.json({ error: 'Forbidden: clinician role required' }, { status: 403 })
  }

  // Fetch all active relationships where this user is the clinician.
  // Patient PII (email, phone, etc.) is intentionally excluded; only
  // display-safe profile fields are returned.
  const { data: relationships, error: relError } = await supabase
    .from('clinician_patient_relationships')
    .select(`
      id,
      last_access_at,
      patient_id,
      patient:profiles!clinician_patient_relationships_patient_id_fkey (
        full_name_en,
        full_name_ar,
        avatar_url
      ),
      relationship_permissions (
        permission_key,
        granted
      )
    `)
    .eq('clinician_id', user.id)
    .eq('status', 'active')
    .order('last_access_at', { ascending: false, nullsFirst: false })

  if (relError) {
    console.error('[GET /api/clinician/patients] relationships query error:', relError)
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 })
  }

  const rows = relationships ?? []

  // Collect all patient IDs so we can fetch the most recent submission for
  // each patient in a single query rather than N individual round-trips.
  const patientIds = rows.map((r) => r.patient_id as string).filter(Boolean)

  let latestSubmissionsByPatient: Record<
    string,
    { submitted_at: string; severity_band: string | null }
  > = {}

  if (patientIds.length > 0) {
    // Fetch the single most-recent submission per patient using a window
    // function exposed through a Supabase RPC, or fall back to fetching all
    // recent submissions and reducing client-side.
    // We use a straightforward approach: fetch the latest submission_id per
    // patient by ordering desc and deduplicating in-memory (avoids a stored
    // procedure dependency).
    const { data: submissions, error: subError } = await supabase
      .from('assessment_submissions')
      .select('user_id, submitted_at, severity_band')
      .in('user_id', patientIds)
      .order('submitted_at', { ascending: false })

    if (subError) {
      // Non-fatal: log and continue without last assessment data
      console.error('[GET /api/clinician/patients] submissions query error:', subError)
    } else {
      // Keep only the first (most recent) submission seen for each patient
      for (const sub of submissions ?? []) {
        const uid = sub.user_id as string
        if (uid && !latestSubmissionsByPatient[uid]) {
          latestSubmissionsByPatient[uid] = {
            submitted_at: sub.submitted_at,
            severity_band: sub.severity_band ?? null,
          }
        }
      }
    }
  }

  // Update last_access_at on all active relationships for this clinician.
  // Use the admin client so this write is not blocked by RLS policies that
  // restrict patient-owned rows.
  if (rows.length > 0) {
    const admin = createAdminClient()
    const { error: updateError } = await admin
      .from('clinician_patient_relationships')
      .update({ last_access_at: new Date().toISOString() })
      .eq('clinician_id', user.id)
      .eq('status', 'active')

    if (updateError) {
      // Non-fatal: the read response is still valid; log for monitoring.
      console.error('[GET /api/clinician/patients] last_access_at update error:', updateError)
    }
  }

  // Reshape into the documented response schema
  const patients = rows.map((rel) => {
    // Supabase infers joined foreign-key rows as arrays in its generic types,
    // but at runtime a to-one join returns a single object or null.
    // We cast through `unknown` to bridge the type mismatch safely.
    const patientProfile = rel.patient as unknown as {
      full_name_en: string | null
      full_name_ar: string | null
      avatar_url: string | null
    } | null

    const permissions = (
      rel.relationship_permissions as Array<{
        permission_key: string
        granted: boolean
      }>
    ) ?? []

    const patientId = rel.patient_id as string
    const lastSubmission = latestSubmissionsByPatient[patientId] ?? null

    return {
      relationship_id: rel.id,
      last_access_at: rel.last_access_at,
      patient: {
        id: patientId,
        full_name_en: patientProfile?.full_name_en ?? null,
        full_name_ar: patientProfile?.full_name_ar ?? null,
        avatar_url: patientProfile?.avatar_url ?? null,
      },
      permissions: permissions.map((p) => ({
        permission_key: p.permission_key,
        granted: p.granted,
      })),
      last_assessment: lastSubmission
        ? {
            submitted_at: lastSubmission.submitted_at,
            severity_band: lastSubmission.severity_band,
          }
        : null,
    }
  })

  return NextResponse.json({ patients })
}
