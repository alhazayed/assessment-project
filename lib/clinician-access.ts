import type { SupabaseClient } from '@supabase/supabase-js'

/** True when the clinician has an approved verification record. */
export async function isVerifiedClinician(
  supabase: SupabaseClient,
  clinicianId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('clinician_verifications')
    .select('id')
    .eq('clinician_id', clinicianId)
    .eq('status', 'verified')
    .maybeSingle()
  return !!data
}

/**
 * Clinician may access a patient when an active relationship exists
 * or the patient is legacy-assigned via profiles.assigned_clinician_id.
 */
export async function clinicianCanAccessPatient(
  supabase: SupabaseClient,
  clinicianId: string,
  patientId: string
): Promise<boolean> {
  const { data: relationship } = await supabase
    .from('clinician_patient_relationships')
    .select('id')
    .eq('clinician_id', clinicianId)
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .maybeSingle()
  if (relationship) return true

  const { data: profile } = await supabase
    .from('profiles')
    .select('assigned_clinician_id')
    .eq('id', patientId)
    .single()
  return profile?.assigned_clinician_id === clinicianId
}
