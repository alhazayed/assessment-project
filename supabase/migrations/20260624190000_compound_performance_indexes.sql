-- Compound performance indexes identified in go-live audit.
-- Single-column FK indexes already exist; these cover ORDER BY and multi-column filters.

-- Assessment submissions: patient history page (patient_id + date sort)
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_patient_submitted
  ON public.assessment_submissions(patient_id, submitted_at DESC);

-- Assessment submissions: admin results filtering by definition + date
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_definition_submitted
  ON public.assessment_submissions(definition_id, submitted_at DESC);

-- Notifications: unread count badge (hot path — user_id + read_at + date)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON public.notifications(user_id, read_at, created_at DESC);

-- Messages: conversation load (patient + clinician + date)
CREATE INDEX IF NOT EXISTS idx_messages_patient_clinician_created
  ON public.messages(patient_id, clinician_id, created_at);

-- Mood logs: dashboard + insights (patient + date sort)
CREATE INDEX IF NOT EXISTS idx_mood_logs_patient_date
  ON public.mood_logs(patient_id, log_date DESC);

-- Journal entries: list page (patient + date sort)
CREATE INDEX IF NOT EXISTS idx_journal_entries_patient_created
  ON public.journal_entries(patient_id, created_at DESC);

-- Audit log: admin audit page filter by actor
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_created
  ON public.audit_log(actor_id, created_at DESC);

-- Rate limit: window scan (key + created_at) — supports atomic function
CREATE INDEX IF NOT EXISTS idx_rate_limit_key_created
  ON public.rate_limit_log(key, created_at DESC);
