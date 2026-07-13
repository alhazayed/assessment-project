-- Production security hardening — final launch audit remediation
-- PREREQUISITE: deploy app code that uses createAdminClient() for admin RPCs
-- and lib/clinician-patient-access.ts for clinical-notes API guards.
--
-- 1. Revoke admin RPC functions from Data API roles (service_role only)
-- 2. Revoke remaining admin matview grant
-- 3. Replace clinical_notes policies (drop weak cn_* + strengthen baseline)
-- 4. Lock down generate_patient_access_code to service_role
-- 5. Add deletion_requested_at for GDPR account deletion workflow

-- ── Helper: clinician may access patient clinical data ─────────────────────
CREATE OR REPLACE FUNCTION public.clinician_can_access_patient_notes(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    get_my_role() = ANY (ARRAY['admin', 'superadmin'])
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = p_patient_id
        AND p.assigned_clinician_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.clinician_patient_relationships cpr
      JOIN public.relationship_permissions rp ON rp.relationship_id = cpr.id
      WHERE cpr.clinician_id = (SELECT auth.uid())
        AND cpr.patient_id = p_patient_id
        AND cpr.status = 'active'
        AND rp.permission_key = 'generate_clinical_notes'
        AND rp.granted = true
    );
$$;

REVOKE ALL ON FUNCTION public.clinician_can_access_patient_notes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clinician_can_access_patient_notes(uuid) TO authenticated, service_role;

-- ── 1. Admin RPC functions — service_role only ─────────────────────────────
REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_stats(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_top_assessments(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_high_risk_patients(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_engagement_metrics() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_assessment_completion_funnel(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_demographics_breakdown(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_assessment_performance_comparison(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_patient_risk_profile(UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_top_assessments(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_high_risk_patients(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_engagement_metrics() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_assessment_completion_funnel(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_demographics_breakdown(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_assessment_performance_comparison(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_patient_risk_profile(UUID) TO service_role;

-- Ensure service_role can read admin matviews used by RPCs and API routes
GRANT SELECT ON public.admin_daily_stats TO service_role;
GRANT SELECT ON public.admin_assessment_stats TO service_role;
GRANT SELECT ON public.admin_user_engagement_stats TO service_role;
GRANT SELECT ON public.admin_high_risk_alerts TO service_role;
GRANT SELECT ON public.admin_demographics_summary TO service_role;

-- ── 2. Admin demographics matview — revoke Data API access ─────────────────
REVOKE ALL ON public.admin_demographics_summary FROM anon, authenticated;

-- ── 3. clinical_notes — drop weak cn_* policies; replace baseline policy ───
DROP POLICY IF EXISTS "cn_clinician_own" ON public.clinical_notes;
DROP POLICY IF EXISTS "cn_patient_read" ON public.clinical_notes;
DROP POLICY IF EXISTS "cn_admin_read" ON public.clinical_notes;

DROP POLICY IF EXISTS clinician_own_notes ON public.clinical_notes;

CREATE POLICY clinician_own_notes ON public.clinical_notes
  FOR ALL
  TO authenticated
  USING (
    clinician_id = (SELECT auth.uid())
    AND public.clinician_can_access_patient_notes(patient_id)
  )
  WITH CHECK (
    clinician_id = (SELECT auth.uid())
    AND public.clinician_can_access_patient_notes(patient_id)
  );

-- notes_admin_all and notes_patient_read_nonprivate from baseline remain unchanged.

-- ── 4. generate_patient_access_code — service_role only ────────────────────
REVOKE EXECUTE ON FUNCTION public.generate_patient_access_code() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_patient_access_code() TO service_role;

-- ── 5. GDPR deletion tracking ────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_deletion_requested
  ON public.profiles(deletion_requested_at)
  WHERE deletion_requested_at IS NOT NULL;
