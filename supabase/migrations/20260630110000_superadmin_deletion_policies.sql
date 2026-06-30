-- Migration: Superadmin-Only Deletion Privileges
-- Date: 2026-06-30
-- Purpose: Allow superadmin users to delete user profiles and assessment results
--          via explicitly controlled API endpoints with audit logging

-- =============================================================================
-- PATIENT PROFILES: Superadmin Delete Policy
-- =============================================================================

-- Allow superadmin to delete patient profiles
CREATE POLICY "superadmin_can_delete_any_patient_profile"
  ON public.patient_profiles
  FOR DELETE
  TO authenticated
  USING (
    -- Only superadmin can delete
    (
      SELECT role FROM public.profiles
      WHERE id = auth.uid()
    ) = 'superadmin'
  );

-- =============================================================================
-- ASSESSMENT SUBMISSIONS: Superadmin Delete Policy
-- =============================================================================

-- Allow superadmin to delete assessment submissions
CREATE POLICY "superadmin_can_delete_any_assessment_submission"
  ON public.assessment_submissions
  FOR DELETE
  TO authenticated
  USING (
    -- Only superadmin can delete
    (
      SELECT role FROM public.profiles
      WHERE id = auth.uid()
    ) = 'superadmin'
  );

-- =============================================================================
-- ASSESSMENT ANSWERS: Superadmin Delete Policy
-- =============================================================================

-- Allow superadmin to delete assessment answers (cascade cleanup)
CREATE POLICY "superadmin_can_delete_any_assessment_answer"
  ON public.assessment_answers
  FOR DELETE
  TO authenticated
  USING (
    -- Only superadmin can delete
    (
      SELECT role FROM public.profiles
      WHERE id = auth.uid()
    ) = 'superadmin'
  );

-- =============================================================================
-- ASSESSMENT RESULTS: Superadmin Delete Policy
-- =============================================================================

-- Allow superadmin to delete assessment results
CREATE POLICY "superadmin_can_delete_any_assessment_result"
  ON public.assessment_results
  FOR DELETE
  TO authenticated
  USING (
    -- Only superadmin can delete
    (
      SELECT role FROM public.profiles
      WHERE id = auth.uid()
    ) = 'superadmin'
  );

-- =============================================================================
-- DRAFT ASSESSMENTS: Superadmin Delete Policy
-- =============================================================================

-- Allow superadmin to delete draft assessments
CREATE POLICY "superadmin_can_delete_any_draft_assessment"
  ON public.draft_assessments
  FOR DELETE
  TO authenticated
  USING (
    -- Only superadmin can delete
    (
      SELECT role FROM public.profiles
      WHERE id = auth.uid()
    ) = 'superadmin'
  );

-- =============================================================================
-- MESSAGES: Superadmin Delete Policy (related to patient)
-- =============================================================================

-- Allow superadmin to delete patient messages
CREATE POLICY "superadmin_can_delete_any_message"
  ON public.messages
  FOR DELETE
  TO authenticated
  USING (
    -- Only superadmin can delete
    (
      SELECT role FROM public.profiles
      WHERE id = auth.uid()
    ) = 'superadmin'
  );

-- =============================================================================
-- NOTIFICATIONS: Superadmin Delete Policy
-- =============================================================================

-- Allow superadmin to delete notifications
CREATE POLICY "superadmin_can_delete_any_notification"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (
    -- Only superadmin can delete
    (
      SELECT role FROM public.profiles
      WHERE id = auth.uid()
    ) = 'superadmin'
  );

-- =============================================================================
-- CLINICAL NOTES: Superadmin Delete Policy
-- =============================================================================

-- Allow superadmin to delete clinical notes
CREATE POLICY "superadmin_can_delete_any_clinical_note"
  ON public.clinical_notes
  FOR DELETE
  TO authenticated
  USING (
    -- Only superadmin can delete
    (
      SELECT role FROM public.profiles
      WHERE id = auth.uid()
    ) = 'superadmin'
  );

-- =============================================================================
-- PROFILE DELETION
-- =============================================================================

-- Allow superadmin to delete user profiles
-- WARNING: This is a sensitive operation that removes the auth.users record
-- should only be called via explicit API endpoint with confirmation

CREATE POLICY "superadmin_can_delete_any_profile"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (
    -- Only superadmin can delete
    (
      SELECT role FROM public.profiles
      WHERE id = auth.uid()
    ) = 'superadmin'
    -- Cannot delete self (prevent accidental self-deletion)
    AND id != auth.uid()
  );

-- =============================================================================
-- INDEXES FOR DELETION OPERATIONS
-- =============================================================================

-- Index to support fast lookup when deleting by patient_id
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_for_deletion
  ON public.assessment_submissions(patient_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_for_deletion
  ON public.messages(patient_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_for_deletion
  ON public.notifications(user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clinical_notes_for_deletion
  ON public.clinical_notes(patient_id)
  WHERE deleted_at IS NULL;
