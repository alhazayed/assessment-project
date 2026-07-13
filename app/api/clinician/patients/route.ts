import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/clinician/patients
export async function GET() {
  const supabase = createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
  const patientIds = rows.map((r) => r.patient_id as string).filter(Boolean)

  let latestSubmissionsByPatient: Record<
    string,
    { submitted_at: string; severity_band: string | null }
  > = {}

  if (patientIds.length > 0) {
    const admin = createAdminClient()
    const { data: submissions, error: subError } = await admin.rpc(
      'get_latest_submissions_for_patients',
      { p_patient_ids: patientIds }
    )

    if (subError) {
      console.error('[GET /api/clinician/patients] submissions RPC error:', subError)
    } else {
      for (const sub of submissions ?? []) {
        const pid = sub.patient_id as string
        if (pid) {
          latestSubmissionsByPatient[pid] = {
            submitted_at: sub.submitted_at,
            severity_band: sub.severity_band ?? null,
          }
        }
      }
    }
  }

  // Update last_access_at only for relationships returned (not all active rows)
  if (rows.length > 0) {
    const admin = createAdminClient()
    const relationshipIds = rows.map((r) => r.id as string)
    const { error: updateError } = await admin
      .from('clinician_patient_relationships')
      .update({ last_access_at: new Date().toISOString() })
      .in('id', relationshipIds)

    if (updateError) {
      console.error('[GET /api/clinician/patients] last_access_at update error:', updateError)
    }
  }

  const patients = rows.map((rel) => {
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
