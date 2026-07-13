-- Production security hardening — final launch audit remediation
-- 1. Revoke admin RPC functions from Data API roles (service_role only)
-- 2. Revoke remaining admin matview grant
-- 3. Remove clinical_notes policy regression (weaker cn_* policies)
-- 4. Lock down generate_patient_access_code to service_role
-- 5. Add deletion_requested_at for GDPR account deletion workflow

-- ── 1. Admin RPC functions — service_role only ─────────────────────────────
-- These functions expose aggregate patient/clinical data. Any authenticated JWT
-- could call them directly via PostgREST, bypassing the admin PIN/HMAC layer.

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

-- ── 2. Admin demographics matview — revoke Data API access ─────────────────
REVOKE ALL ON public.admin_demographics_summary FROM anon, authenticated;

-- ── 3. clinical_notes — drop weaker policies added in 20260624190200 ───────
-- Baseline policies (clinician_own_notes, notes_patient_read_nonprivate) enforce
-- assignment checks and is_private filtering. The cn_* policies are OR'd and
-- weaken those controls.

DROP POLICY IF EXISTS "cn_clinician_own" ON public.clinical_notes;
DROP POLICY IF EXISTS "cn_patient_read" ON public.clinical_notes;
DROP POLICY IF EXISTS "cn_admin_read" ON public.clinical_notes;

-- ── 4. generate_patient_access_code — service_role only ────────────────────
REVOKE EXECUTE ON FUNCTION public.generate_patient_access_code() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_patient_access_code() TO service_role;

-- ── 5. GDPR deletion tracking ────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_deletion_requested
  ON public.profiles(deletion_requested_at)
  WHERE deletion_requested_at IS NOT NULL;
