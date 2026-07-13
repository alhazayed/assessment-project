import type { SupabaseClient } from '@supabase/supabase-js'

/** Verify a clinician has a legitimate relationship with a patient. */
export async function clinicianCanAccessPatient(
  supabase: SupabaseClient,
  clinicianId: string,
  patientId: string,
): Promise<boolean> {
  const { data: patientProfile } = await supabase
    .from('profiles')
    .select('assigned_clinician_id')
    .eq('id', patientId)
    .maybeSingle()

  if (patientProfile?.assigned_clinician_id === clinicianId) return true

  const { data: relationship } = await supabase
    .from('clinician_patient_relationships')
    .select('id')
    .eq('clinician_id', clinicianId)
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .maybeSingle()

  if (relationship) return true

  const { data: assignment } = await supabase
    .from('assessment_assignments')
    .select('id')
    .eq('clinician_id', clinicianId)
    .eq('patient_id', patientId)
    .limit(1)
    .maybeSingle()

  return Boolean(assignment)
}
