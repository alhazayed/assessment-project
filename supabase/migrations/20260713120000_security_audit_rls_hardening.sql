-- Security audit: tighten clinician RLS to assigned/consented patients only.
-- Replaces overly broad "any clinician" SELECT policies from schema_baseline.

-- Helper: clinician may access patient via active relationship or legacy assignment.
CREATE OR REPLACE FUNCTION public.clinician_can_access_patient(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    get_my_role() = 'clinician'
    AND (
      EXISTS (
        SELECT 1
        FROM public.clinician_patient_relationships cpr
        WHERE cpr.clinician_id = (SELECT auth.uid())
          AND cpr.patient_id = p_patient_id
          AND cpr.status = 'active'
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = p_patient_id
          AND p.assigned_clinician_id = (SELECT auth.uid())
      )
    );
$$;

REVOKE ALL ON FUNCTION public.clinician_can_access_patient(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clinician_can_access_patient(uuid) TO authenticated;

-- ── patient_profiles ───────────────────────────────────────────────
DROP POLICY IF EXISTS patient_prof_clinician ON public.patient_profiles;
CREATE POLICY patient_prof_clinician ON public.patient_profiles FOR SELECT
  USING (
    get_my_role() = ANY (ARRAY['admin','superadmin'])
    OR clinician_can_access_patient(id)
  );

-- ── assessment_assignments ─────────────────────────────────────────
DROP POLICY IF EXISTS assign_read ON public.assessment_assignments;
CREATE POLICY assign_read ON public.assessment_assignments FOR SELECT
  USING (
    (SELECT auth.uid()) = patient_id
    OR get_my_role() = ANY (ARRAY['admin','superadmin'])
    OR (
      get_my_role() = 'clinician'
      AND (
        (SELECT auth.uid()) = clinician_id
        OR clinician_can_access_patient(patient_id)
      )
    )
  );

-- ── ai_insights ────────────────────────────────────────────────────
DROP POLICY IF EXISTS insights_clinician ON public.ai_insights;
CREATE POLICY insights_clinician ON public.ai_insights FOR SELECT
  USING (
    get_my_role() = ANY (ARRAY['admin','superadmin'])
    OR clinician_can_access_patient(patient_id)
  );

-- ── chat_sessions ──────────────────────────────────────────────────
DROP POLICY IF EXISTS chat_clinician_read ON public.chat_sessions;
CREATE POLICY chat_clinician_read ON public.chat_sessions FOR SELECT
  USING (
    get_my_role() = ANY (ARRAY['admin','superadmin'])
    OR clinician_can_access_patient(patient_id)
  );

-- ── pdf_reports ────────────────────────────────────────────────────
DROP POLICY IF EXISTS pdf_reports_clinician ON public.pdf_reports;
CREATE POLICY pdf_reports_clinician ON public.pdf_reports FOR SELECT
  USING (
    get_my_role() = ANY (ARRAY['admin','superadmin'])
    OR clinician_can_access_patient(patient_id)
  );

-- ── journal_entries (shared only) ──────────────────────────────────
DROP POLICY IF EXISTS journal_clinician_shared ON public.journal_entries;
CREATE POLICY journal_clinician_shared ON public.journal_entries FOR SELECT
  USING (
    is_shared = true
    AND (
      get_my_role() = ANY (ARRAY['admin','superadmin'])
      OR clinician_can_access_patient(patient_id)
    )
  );

-- ── medications ────────────────────────────────────────────────────
DROP POLICY IF EXISTS meds_clinician ON public.medications;
CREATE POLICY meds_clinician ON public.medications FOR SELECT
  USING (
    get_my_role() = ANY (ARRAY['admin','superadmin'])
    OR clinician_can_access_patient(patient_id)
  );

-- ── medication_alerts ──────────────────────────────────────────────
DROP POLICY IF EXISTS alerts_clinician ON public.medication_alerts;
CREATE POLICY alerts_clinician ON public.medication_alerts FOR SELECT
  USING (
    get_my_role() = ANY (ARRAY['admin','superadmin'])
    OR clinician_can_access_patient(patient_id)
  );

-- ── personality_results ────────────────────────────────────────────
DROP POLICY IF EXISTS personality_clinician ON public.personality_results;
CREATE POLICY personality_clinician ON public.personality_results FOR SELECT
  USING (
    get_my_role() = ANY (ARRAY['admin','superadmin'])
    OR clinician_can_access_patient(patient_id)
  );

-- ── clinical_notes: patient reads non-private only; clinician scoped ─
DROP POLICY IF EXISTS cn_patient_read ON public.clinical_notes;
CREATE POLICY cn_patient_read
  ON public.clinical_notes
  FOR SELECT
  TO authenticated
  USING (
    patient_id = (SELECT auth.uid())
    AND is_private = false
  );

DROP POLICY IF EXISTS cn_clinician_own ON public.clinical_notes;
CREATE POLICY cn_clinician_own
  ON public.clinical_notes
  FOR ALL
  TO authenticated
  USING (
    clinician_id = (SELECT auth.uid())
    AND (
      get_my_role() = ANY (ARRAY['admin','superadmin'])
      OR clinician_can_access_patient(patient_id)
    )
  )
  WITH CHECK (
    clinician_id = (SELECT auth.uid())
    AND (
      get_my_role() = ANY (ARRAY['admin','superadmin'])
      OR clinician_can_access_patient(patient_id)
    )
  );

-- Drop legacy duplicate policies superseded by cn_* (OR-combined = broader access)
DROP POLICY IF EXISTS clinician_own_notes ON public.clinical_notes;
DROP POLICY IF EXISTS notes_patient_read_nonprivate ON public.clinical_notes;
DROP POLICY IF EXISTS notes_admin_all ON public.clinical_notes;
