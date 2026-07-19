-- Migration: Superadmin-Only Deletion Privileges
-- Date: 2026-06-30
-- Purpose: Allow superadmin users to delete user profiles and assessment results
--          via explicitly controlled API endpoints with audit logging

-- =============================================================================
-- PATIENT PROFILES: Superadmin Delete Policy
-- =============================================================================

CREATE POLICY "superadmin_can_delete_any_patient_profile"
  ON public.patient_profiles
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  );

-- =============================================================================
-- ASSESSMENT SUBMISSIONS: Superadmin Delete Policy
-- =============================================================================

CREATE POLICY "superadmin_can_delete_any_assessment_submission"
  ON public.assessment_submissions
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  );

-- =============================================================================
-- ASSESSMENT RESPONSES: Superadmin Delete Policy
-- =============================================================================

CREATE POLICY "superadmin_can_delete_any_assessment_response"
  ON public.assessment_responses
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  );

-- =============================================================================
-- MESSAGES: Superadmin Delete Policy
-- =============================================================================

CREATE POLICY "superadmin_can_delete_any_message"
  ON public.messages
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  );

-- =============================================================================
-- NOTIFICATIONS: Superadmin Delete Policy
-- =============================================================================

CREATE POLICY "superadmin_can_delete_any_notification"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  );

-- =============================================================================
-- CLINICAL NOTES: Superadmin Delete Policy
-- =============================================================================

CREATE POLICY "superadmin_can_delete_any_clinical_note"
  ON public.clinical_notes
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  );

-- =============================================================================
-- PROFILE DELETION: Superadmin Delete Policy
-- =============================================================================

CREATE POLICY "superadmin_can_delete_any_profile"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
    AND id != auth.uid()
  );

-- =============================================================================
-- PERFORMANCE INDEXES FOR DELETION OPERATIONS
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_assessment_submissions_for_deletion
  ON public.assessment_submissions(patient_id);

CREATE INDEX IF NOT EXISTS idx_assessment_responses_for_deletion
  ON public.assessment_responses(submission_id);

CREATE INDEX IF NOT EXISTS idx_messages_for_deletion
  ON public.messages(patient_id);

CREATE INDEX IF NOT EXISTS idx_notifications_for_deletion
  ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_for_deletion
  ON public.clinical_notes(patient_id);