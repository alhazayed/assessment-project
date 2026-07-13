/**
 * Checks whether a clinician may access a patient's clinical notes.
 * Supports legacy assigned_clinician_id and consent-based relationships.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export async function clinicianCanAccessPatientNotes(
  supabase: SupabaseClient,
  clinicianId: string,
  patientId: string,
  role: string,
): Promise<boolean> {
  if (['admin', 'superadmin'].includes(role)) return true

  const { data: patientProfile } = await supabase
    .from('profiles')
    .select('assigned_clinician_id')
    .eq('id', patientId)
    .single()

  if (patientProfile?.assigned_clinician_id === clinicianId) return true

  const { data: relationship } = await supabase
    .from('clinician_patient_relationships')
    .select(`
      id,
      relationship_permissions!inner (
        permission_key,
        granted
      )
    `)
    .eq('clinician_id', clinicianId)
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .eq('relationship_permissions.permission_key', 'generate_clinical_notes')
    .eq('relationship_permissions.granted', true)
    .maybeSingle()

  return !!relationship
}
