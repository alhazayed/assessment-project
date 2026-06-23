-- Add missing foreign-key indexes identified in the go-live audit.
-- These indexes speed up RLS policy evaluation on patient-scoped tables
-- and prevent full-table scans when joining on FK columns.

CREATE INDEX IF NOT EXISTS idx_assessment_submissions_patient_id
  ON public.assessment_submissions (patient_id);

CREATE INDEX IF NOT EXISTS idx_assessment_submissions_assignment_id
  ON public.assessment_submissions (assignment_id);

CREATE INDEX IF NOT EXISTS idx_assessment_responses_submission_id
  ON public.assessment_responses (submission_id);

CREATE INDEX IF NOT EXISTS idx_ai_insights_patient_id
  ON public.ai_insights (patient_id);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient_id
  ON public.clinical_notes (patient_id);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_clinician_id
  ON public.clinical_notes (clinician_id);

CREATE INDEX IF NOT EXISTS idx_medications_patient_id
  ON public.medications (patient_id);

CREATE INDEX IF NOT EXISTS idx_mood_logs_patient_id
  ON public.mood_logs (patient_id);

CREATE INDEX IF NOT EXISTS idx_messages_clinician_id
  ON public.messages (clinician_id);

CREATE INDEX IF NOT EXISTS idx_journal_entries_patient_id
  ON public.journal_entries (patient_id);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_id
  ON public.user_consents (user_id);

CREATE INDEX IF NOT EXISTS idx_wellness_plans_patient_id
  ON public.wellness_plans (patient_id);

CREATE INDEX IF NOT EXISTS idx_pdf_reports_patient_id
  ON public.pdf_reports (patient_id);

CREATE INDEX IF NOT EXISTS idx_assessment_assignments_definition_id
  ON public.assessment_assignments (definition_id);
