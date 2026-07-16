import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Records that a clinician accessed a specific patient's PHI through a
 * server-mediated endpoint (F-3, access accountability).
 *
 * Fire-and-forget and fully defensive: it never throws and never blocks the
 * response — an audit-log failure must not break a legitimate read. Writes go
 * through the admin client so the row lands regardless of the caller's RLS.
 *
 * NOTE (residual): this covers server-mediated reads only. PHI that a clinician
 * reads directly via the browser Supabase client (governed by RLS) is not
 * captured here; comprehensive coverage would require DB-level logging and is
 * tracked as a later (Phase 3) hardening item.
 */
export function logClinicianPhiAccess(
  admin: SupabaseClient,
  params: { actorId: string; patientId: string; resource: string },
): void {
  const { actorId, patientId, resource } = params
  void admin
    .from('audit_log')
    .insert({
      actor_id: actorId,
      action: 'clinician_view_phi',
      target_type: 'profile',
      target_id: patientId,
      details: { resource },
    })
    .then(
      () => {},
      () => {}, // swallow — auditing must never block or fail the read
    )
}
