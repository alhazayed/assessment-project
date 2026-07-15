import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Single source of truth for "may this clinician act on this patient?" at the
 * API layer. Delegates to the `has_clinician_access` SQL primitive, which is the
 * SAME function the RLS policies use — so the API and the database agree on one
 * authorization model instead of each re-implementing ownership logic.
 *
 * `has_clinician_access` returns true when the clinician has an active consent
 * relationship granting `permission`, OR — for backward compatibility — the
 * patient is still linked by the legacy `profiles.assigned_clinician_id`. Legacy
 * patients therefore keep working with no manual migration.
 *
 * `permission` must be one of the relationship_permissions keys, e.g.
 * 'view_assessment_results', 'view_assessment_history', 'view_mood_tracking',
 * 'message_patient', 'generate_clinical_notes'.
 */
export async function clinicianHasPatientAccess(
  supabase: SupabaseClient,
  clinicianId: string,
  patientId: string,
  permission: string,
): Promise<boolean> {
  const { data } = await supabase.rpc('has_clinician_access', {
    p_clinician_id: clinicianId,
    p_patient_id: patientId,
    p_permission: permission,
  })
  return data === true
}
