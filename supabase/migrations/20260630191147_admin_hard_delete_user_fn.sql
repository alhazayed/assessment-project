-- Migration: Atomic hard-delete for a user (superadmin erasure)
-- Date: 2026-06-30
-- Purpose: The previous hard-delete logic only cleared 5 child tables and
--          queried a non-existent assessment_responses.patient_id column, so
--          deleting any real user failed on foreign-key constraints (many
--          child tables are NO ACTION / RESTRICT). This function removes all
--          user-owned data in a single transaction (all-or-nothing) before
--          deleting the profile, so a blocked delete rolls back cleanly.

CREATE OR REPLACE FUNCTION admin_hard_delete_user(target uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
begin
  -- Assessment data: responses are keyed by submission_id, not patient_id.
  delete from assessment_responses where submission_id in (
    select id from assessment_submissions where patient_id = target
  );
  delete from assessment_submissions where patient_id = target;
  delete from assessment_assignments where patient_id = target or clinician_id = target;

  -- Patient self-tracked data.
  delete from mood_logs where patient_id = target;
  delete from journal_entries where patient_id = target;
  delete from gratitude_entries where patient_id = target;
  update medication_alerts set acknowledged_by = null where acknowledged_by = target;
  delete from medication_alerts where patient_id = target;
  delete from medications where patient_id = target;
  delete from ai_insights where patient_id = target;
  delete from chat_sessions where patient_id = target;
  delete from session_notes where patient_id = target;
  delete from personality_results where patient_id = target;
  delete from wellness_plans where patient_id = target;
  delete from pdf_reports where patient_id = target or generated_by = target;

  -- Communications & notifications.
  delete from messages where sender_id = target or patient_id = target or clinician_id = target;
  delete from clinical_notes where patient_id = target or clinician_id = target;
  delete from notification_log where recipient_id = target;
  delete from notifications where user_id = target;
  update notification_events set sender_id = null where sender_id = target;
  delete from notification_events where recipient_id = target;
  delete from dismissed_announcements where user_id = target;
  delete from push_tokens where user_id = target;

  -- Clinician relationships / verification.
  update clinician_verifications set reviewed_by = null where reviewed_by = target;
  delete from clinician_verifications where clinician_id = target;
  delete from patient_access_codes where patient_id = target;
  update clinician_invitations set patient_id = null where patient_id = target;
  delete from clinician_invitations where clinician_id = target;
  update clinician_patient_relationships set revoked_by = null where revoked_by = target;
  delete from clinician_patient_relationships where clinician_id = target or patient_id = target;
  update relationship_permissions set modified_by = null where modified_by = target;

  -- Consent ledger (immutable while the user exists; removed on full erasure).
  update user_consents set recorded_by = null where recorded_by = target;
  delete from user_consents where user_id = target;

  -- Payments & packages (child → parent order).
  delete from purchased_package_results where user_id = target;
  delete from package_purchases where user_id = target;
  delete from package_results where user_id = target;
  delete from promo_code_usage where user_id = target;
  delete from payments where user_id = target;

  -- ADHD check-ins.
  delete from adhd_zone_checkins where user_id = target;

  -- Audit entries authored by the user.
  delete from audit_log where actor_id = target;

  -- patient_profiles / clinician_profiles cascade from profiles; delete profile.
  delete from profiles where id = target;
end;
$$;

REVOKE EXECUTE ON FUNCTION admin_hard_delete_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_hard_delete_user(uuid) TO service_role;
