-- =============================================================================
-- DOWN migration for 20260718124400_security_phase1_hardening
-- =============================================================================
-- Restore pre-Phase-1 grants/policies. Apply manually only if rollback is required.
-- WARNING: Re-opens known PHI exposure paths (admin RPCs, weak message insert).
-- =============================================================================

DROP POLICY IF EXISTS "msg_participant_insert" ON public.messages;
CREATE POLICY "msg_participant_insert"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id = (SELECT auth.uid())
    OR clinician_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS assign_read ON public.assessment_assignments;
CREATE POLICY assign_read ON public.assessment_assignments
  FOR SELECT
  USING (
    ((SELECT auth.uid()) = patient_id)
    OR (get_my_role() = ANY (ARRAY['clinician'::text, 'admin'::text, 'superadmin'::text]))
  );

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_assessments(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_high_risk_patients(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_engagement_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_assessment_completion_funnel(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_assessment_performance_comparison(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_patient_risk_profile(uuid) TO authenticated;
