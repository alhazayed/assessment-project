-- ============================================================
-- Phase 2.4 — F-1 remediation: scope clinician PHI reads to the
-- relationship/permission model
-- ============================================================
-- Finding F-1 (Phase 2.3 audit): nine patient-PHI tables granted clinician read
-- SOLELY via get_my_role() = ANY (ARRAY['clinician','admin','superadmin']), i.e.
-- ANY clinician could read EVERY patient's rows with no clinician_patient_
-- relationships row and no relationship_permissions grant — bypassing the model
-- enforced on the seven Phase 2.1 tables.
--
-- This migration re-points each of those clinician SELECT policies onto the
-- centralized has_clinician_access() primitive (active consent grant for the
-- relevant permission key, OR the legacy assigned_clinician_id fallback), exactly
-- mirroring 20260715120000. Each rewrite:
--   * PRESERVES admin/superadmin read  — kept as the first OR arm (unchanged).
--   * PRESERVES patient owner access    — the separate owner policies
--     (insights_owner, chat_patient_own, pdf_reports_patient, personality_own,
--     mood/journal/med owner policies, etc.) are NOT touched.
--   * SCOPES the clinician arm          — clinician now needs an authorized
--     relationship for the mapped permission key.
--   * Introduces NO duplicate policies  — each policy is DROP-then-CREATE with
--     its existing name; no policy is added or removed, only its clinician arm
--     is tightened.
--
-- Permission-key mapping (clinician arm):
--   pdf_reports          -> view_reports
--   ai_insights          -> view_assessment_results
--   personality_results  -> view_assessment_results
--   chat_sessions        -> view_assessment_results
--   medications          -> view_profile
--   medication_alerts    -> view_profile
--   patient_profiles     -> view_profile          (row identity column is `id`)
--   gratitude_entries    -> view_progress_tracking
--   journal_entries      -> view_progress_tracking (is_shared = true gate kept)
--
-- Performance: for admin/superadmin the leading role check short-circuits before
-- has_clinician_access() is called; for patients (owner policies) get_my_role()
-- is neither admin/superadmin nor 'clinician', so the AND short-circuits and the
-- function is never invoked. The function itself resolves via existing indexes
-- (idx_cpr_clinician, idx_cpr_patient, idx_rp_relationship, profiles PK). Same
-- cost profile as the already-shipped Phase 2.1 policies.
--
-- Out of F-1 scope (reviewed, intentionally NOT changed): assessment_governance
-- (ag_read) and invitations (inv_admin) are also role-only for clinicians but
-- have no patient column and are not per-patient PHI, so has_clinician_access()
-- does not apply. Signup/role assignment (F-0) is explicitly out of scope.
--
-- Idempotent (DROP POLICY IF EXISTS + CREATE) and transaction-safe.

-- pdf_reports ---------------------------------------------------------------
DROP POLICY IF EXISTS pdf_reports_clinician ON public.pdf_reports;
CREATE POLICY pdf_reports_clinician ON public.pdf_reports FOR SELECT
  USING (
    get_my_role() = ANY (ARRAY['admin','superadmin'])
    OR (get_my_role() = 'clinician'
        AND public.has_clinician_access((SELECT auth.uid()), pdf_reports.patient_id, 'view_reports'))
  );

-- ai_insights ---------------------------------------------------------------
DROP POLICY IF EXISTS insights_clinician ON public.ai_insights;
CREATE POLICY insights_clinician ON public.ai_insights FOR SELECT
  USING (
    get_my_role() = ANY (ARRAY['admin','superadmin'])
    OR (get_my_role() = 'clinician'
        AND public.has_clinician_access((SELECT auth.uid()), ai_insights.patient_id, 'view_assessment_results'))
  );

-- personality_results -------------------------------------------------------
DROP POLICY IF EXISTS personality_clinician ON public.personality_results;
CREATE POLICY personality_clinician ON public.personality_results FOR SELECT
  USING (
    get_my_role() = ANY (ARRAY['admin','superadmin'])
    OR (get_my_role() = 'clinician'
        AND public.has_clinician_access((SELECT auth.uid()), personality_results.patient_id, 'view_assessment_results'))
  );

-- chat_sessions -------------------------------------------------------------
DROP POLICY IF EXISTS chat_clinician_read ON public.chat_sessions;
CREATE POLICY chat_clinician_read ON public.chat_sessions FOR SELECT
  USING (
    get_my_role() = ANY (ARRAY['admin','superadmin'])
    OR (get_my_role() = 'clinician'
        AND public.has_clinician_access((SELECT auth.uid()), chat_sessions.patient_id, 'view_assessment_results'))
  );

-- medications ---------------------------------------------------------------
DROP POLICY IF EXISTS meds_clinician ON public.medications;
CREATE POLICY meds_clinician ON public.medications FOR SELECT
  USING (
    get_my_role() = ANY (ARRAY['admin','superadmin'])
    OR (get_my_role() = 'clinician'
        AND public.has_clinician_access((SELECT auth.uid()), medications.patient_id, 'view_profile'))
  );

-- medication_alerts ---------------------------------------------------------
DROP POLICY IF EXISTS alerts_clinician ON public.medication_alerts;
CREATE POLICY alerts_clinician ON public.medication_alerts FOR SELECT
  USING (
    get_my_role() = ANY (ARRAY['admin','superadmin'])
    OR (get_my_role() = 'clinician'
        AND public.has_clinician_access((SELECT auth.uid()), medication_alerts.patient_id, 'view_profile'))
  );

-- patient_profiles (row identity column is `id`) ----------------------------
DROP POLICY IF EXISTS patient_prof_clinician ON public.patient_profiles;
CREATE POLICY patient_prof_clinician ON public.patient_profiles FOR SELECT
  USING (
    get_my_role() = ANY (ARRAY['admin','superadmin'])
    OR (get_my_role() = 'clinician'
        AND public.has_clinician_access((SELECT auth.uid()), patient_profiles.id, 'view_profile'))
  );

-- gratitude_entries ---------------------------------------------------------
DROP POLICY IF EXISTS gratitude_clinician ON public.gratitude_entries;
CREATE POLICY gratitude_clinician ON public.gratitude_entries FOR SELECT
  USING (
    get_my_role() = ANY (ARRAY['admin','superadmin'])
    OR (get_my_role() = 'clinician'
        AND public.has_clinician_access((SELECT auth.uid()), gratitude_entries.patient_id, 'view_progress_tracking'))
  );

-- journal_entries (preserve the is_shared = true gate) ----------------------
DROP POLICY IF EXISTS journal_clinician_shared ON public.journal_entries;
CREATE POLICY journal_clinician_shared ON public.journal_entries FOR SELECT
  USING (
    is_shared = true
    AND (
      get_my_role() = ANY (ARRAY['admin','superadmin'])
      OR (get_my_role() = 'clinician'
          AND public.has_clinician_access((SELECT auth.uid()), journal_entries.patient_id, 'view_progress_tracking'))
    )
  );

-- ============================================================
-- ROLLBACK (run to restore the pre-2.4 broad clinician policies)
-- ============================================================
-- BEGIN;
-- DROP POLICY IF EXISTS pdf_reports_clinician ON public.pdf_reports;
-- CREATE POLICY pdf_reports_clinician ON public.pdf_reports FOR SELECT
--   USING (get_my_role() = ANY (ARRAY['clinician','admin','superadmin']));
-- DROP POLICY IF EXISTS insights_clinician ON public.ai_insights;
-- CREATE POLICY insights_clinician ON public.ai_insights FOR SELECT
--   USING (get_my_role() = ANY (ARRAY['clinician','admin','superadmin']));
-- DROP POLICY IF EXISTS personality_clinician ON public.personality_results;
-- CREATE POLICY personality_clinician ON public.personality_results FOR SELECT
--   USING (get_my_role() = ANY (ARRAY['clinician','admin','superadmin']));
-- DROP POLICY IF EXISTS chat_clinician_read ON public.chat_sessions;
-- CREATE POLICY chat_clinician_read ON public.chat_sessions FOR SELECT
--   USING (get_my_role() = ANY (ARRAY['clinician','admin','superadmin']));
-- DROP POLICY IF EXISTS meds_clinician ON public.medications;
-- CREATE POLICY meds_clinician ON public.medications FOR SELECT
--   USING (get_my_role() = ANY (ARRAY['clinician','admin','superadmin']));
-- DROP POLICY IF EXISTS alerts_clinician ON public.medication_alerts;
-- CREATE POLICY alerts_clinician ON public.medication_alerts FOR SELECT
--   USING (get_my_role() = ANY (ARRAY['clinician','admin','superadmin']));
-- DROP POLICY IF EXISTS patient_prof_clinician ON public.patient_profiles;
-- CREATE POLICY patient_prof_clinician ON public.patient_profiles FOR SELECT
--   USING (get_my_role() = ANY (ARRAY['clinician','admin','superadmin']));
-- DROP POLICY IF EXISTS gratitude_clinician ON public.gratitude_entries;
-- CREATE POLICY gratitude_clinician ON public.gratitude_entries FOR SELECT
--   USING (get_my_role() = ANY (ARRAY['clinician','admin','superadmin']));
-- DROP POLICY IF EXISTS journal_clinician_shared ON public.journal_entries;
-- CREATE POLICY journal_clinician_shared ON public.journal_entries FOR SELECT
--   USING ((is_shared = true) AND (get_my_role() = ANY (ARRAY['clinician','admin','superadmin'])));
-- COMMIT;
