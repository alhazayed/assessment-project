-- =============================================================================
-- PHASE 1 SECURITY REMEDIATION — Objective 5
-- Restrict clinician access to patient data via clinician_patient_relationships.
-- =============================================================================
--
-- PROBLEM (before this migration): clinician read access to patient PHI was
-- granted one of two over-broad ways in the baseline RLS:
--   (a) `assigned_clinician_id = auth.uid()` — the legacy single-assignment
--       pointer (submissions, responses, mood, assignments, session_notes); or
--   (b) a bare role check `get_my_role() IN ('clinician',...)` — which let ANY
--       clinician read EVERY patient's rows (ai_insights, gratitude, shared
--       journal entries, medications, medication_alerts, personality_results,
--       pdf_reports, chat_sessions, patient_profiles).
--
-- FIX: every clinician-facing policy below is rebuilt to require an ACTIVE
-- clinician_patient_relationship with the specific patient, via
-- public.relationship_active(). Admin/superadmin access and patient-owner access
-- are unchanged. The 20260718090100 backfill + sync trigger guarantee that
-- currently-assigned clinicians keep access, so functionality is preserved.
--
-- Every authorization decision here lives in PostgreSQL RLS.
-- =============================================================================

-- ── patient_profiles ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS patient_prof_clinician ON public.patient_profiles;
CREATE POLICY patient_prof_clinician ON public.patient_profiles
  FOR SELECT
  USING (
    public.is_admin()
    OR (public.get_my_role() = 'clinician' AND public.relationship_active((SELECT auth.uid()), id))
  );

-- ── assessment_submissions ───────────────────────────────────────────────────
DROP POLICY IF EXISTS submissions_clinician ON public.assessment_submissions;
CREATE POLICY submissions_clinician ON public.assessment_submissions
  FOR SELECT
  USING (
    public.is_admin()
    OR (public.get_my_role() = 'clinician' AND public.relationship_active((SELECT auth.uid()), patient_id))
  );

-- ── assessment_responses ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS responses_clinician ON public.assessment_responses;
CREATE POLICY responses_clinician ON public.assessment_responses
  FOR SELECT
  USING (
    public.is_admin()
    OR (
      public.get_my_role() = 'clinician'
      AND EXISTS (
        SELECT 1 FROM public.assessment_submissions s
        WHERE s.id = assessment_responses.submission_id
          AND public.relationship_active((SELECT auth.uid()), s.patient_id)
      )
    )
  );

-- ── mood_logs ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS mood_clinician ON public.mood_logs;
CREATE POLICY mood_clinician ON public.mood_logs
  FOR SELECT
  USING (
    public.is_admin()
    OR (public.get_my_role() = 'clinician' AND public.relationship_active((SELECT auth.uid()), patient_id))
  );

-- ── ai_insights ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS insights_clinician ON public.ai_insights;
CREATE POLICY insights_clinician ON public.ai_insights
  FOR SELECT
  USING (
    public.is_admin()
    OR (public.get_my_role() = 'clinician' AND public.relationship_active((SELECT auth.uid()), patient_id))
  );

-- ── gratitude_entries ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS gratitude_clinician ON public.gratitude_entries;
CREATE POLICY gratitude_clinician ON public.gratitude_entries
  FOR SELECT
  USING (
    public.is_admin()
    OR (public.get_my_role() = 'clinician' AND public.relationship_active((SELECT auth.uid()), patient_id))
  );

-- ── journal_entries (only shared entries, and only for related clinicians) ────
DROP POLICY IF EXISTS journal_clinician_shared ON public.journal_entries;
CREATE POLICY journal_clinician_shared ON public.journal_entries
  FOR SELECT
  USING (
    is_shared = true
    AND (
      public.is_admin()
      OR (public.get_my_role() = 'clinician' AND public.relationship_active((SELECT auth.uid()), patient_id))
    )
  );

-- ── medications ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS meds_clinician ON public.medications;
CREATE POLICY meds_clinician ON public.medications
  FOR SELECT
  USING (
    public.is_admin()
    OR (public.get_my_role() = 'clinician' AND public.relationship_active((SELECT auth.uid()), patient_id))
  );

-- ── medication_alerts ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS alerts_clinician ON public.medication_alerts;
CREATE POLICY alerts_clinician ON public.medication_alerts
  FOR SELECT
  USING (
    public.is_admin()
    OR (public.get_my_role() = 'clinician' AND public.relationship_active((SELECT auth.uid()), patient_id))
  );

-- ── personality_results ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS personality_clinician ON public.personality_results;
CREATE POLICY personality_clinician ON public.personality_results
  FOR SELECT
  USING (
    public.is_admin()
    OR (public.get_my_role() = 'clinician' AND public.relationship_active((SELECT auth.uid()), patient_id))
  );

-- ── pdf_reports ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS pdf_reports_clinician ON public.pdf_reports;
CREATE POLICY pdf_reports_clinician ON public.pdf_reports
  FOR SELECT
  USING (
    public.is_admin()
    OR (public.get_my_role() = 'clinician' AND public.relationship_active((SELECT auth.uid()), patient_id))
  );

-- ── chat_sessions ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS chat_clinician_read ON public.chat_sessions;
CREATE POLICY chat_clinician_read ON public.chat_sessions
  FOR SELECT
  USING (
    public.is_admin()
    OR (public.get_my_role() = 'clinician' AND public.relationship_active((SELECT auth.uid()), patient_id))
  );

-- ── session_notes ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS notes_clinician_read   ON public.session_notes;
DROP POLICY IF EXISTS notes_clinician_update ON public.session_notes;
CREATE POLICY notes_clinician_read ON public.session_notes
  FOR SELECT
  USING (
    public.is_admin()
    OR (public.get_my_role() = 'clinician' AND public.relationship_active((SELECT auth.uid()), patient_id))
  );
CREATE POLICY notes_clinician_update ON public.session_notes
  FOR UPDATE
  USING (
    public.is_admin()
    OR (public.get_my_role() = 'clinician' AND public.relationship_active((SELECT auth.uid()), patient_id))
  )
  WITH CHECK (
    public.is_admin()
    OR (public.get_my_role() = 'clinician' AND public.relationship_active((SELECT auth.uid()), patient_id))
  );

-- ── assessment_assignments ───────────────────────────────────────────────────
DROP POLICY IF EXISTS assign_read                  ON public.assessment_assignments;
DROP POLICY IF EXISTS assign_clinician_own_patients ON public.assessment_assignments;
CREATE POLICY assign_read ON public.assessment_assignments
  FOR SELECT
  USING (
    (SELECT auth.uid()) = patient_id
    OR public.is_admin()
    OR (
      public.get_my_role() = 'clinician'
      AND (
        (SELECT auth.uid()) = clinician_id
        OR public.relationship_active((SELECT auth.uid()), patient_id)
      )
    )
  );
CREATE POLICY assign_clinician_own_patients ON public.assessment_assignments
  FOR ALL
  USING (
    public.get_my_role() = 'clinician'
    AND (SELECT auth.uid()) = clinician_id
    AND public.relationship_active((SELECT auth.uid()), patient_id)
  )
  WITH CHECK (
    public.get_my_role() = 'clinician'
    AND (SELECT auth.uid()) = clinician_id
    AND public.relationship_active((SELECT auth.uid()), patient_id)
  );
