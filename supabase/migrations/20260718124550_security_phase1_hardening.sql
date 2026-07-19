-- Phase 1 Security Hardening (C1–C4, H1)

CREATE OR REPLACE FUNCTION public.has_clinician_access(
  p_clinician_id uuid,
  p_patient_id uuid,
  p_permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.check_relationship_permission(p_clinician_id, p_patient_id, p_permission)
    OR EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = p_patient_id
        AND pr.assigned_clinician_id = p_clinician_id
    );
$$;

REVOKE ALL ON FUNCTION public.has_clinician_access(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_clinician_access(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_clinician_access(uuid, uuid, text) TO service_role;

DROP POLICY IF EXISTS "cn_patient_read" ON public.clinical_notes;
DROP POLICY IF EXISTS "cn_clinician_own" ON public.clinical_notes;
DROP POLICY IF EXISTS "cn_admin_read" ON public.clinical_notes;
DROP POLICY IF EXISTS "msg_participant_insert" ON public.messages;
DROP POLICY IF EXISTS "msg_participant_read" ON public.messages;

DROP POLICY IF EXISTS notes_patient_read_nonprivate ON public.clinical_notes;
CREATE POLICY notes_patient_read_nonprivate ON public.clinical_notes
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = patient_id
    AND is_private = false
  );

DROP POLICY IF EXISTS assign_read ON public.assessment_assignments;
CREATE POLICY assign_read ON public.assessment_assignments
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = patient_id
    OR get_my_role() = ANY (ARRAY['admin'::text, 'superadmin'::text])
    OR (
      get_my_role() = 'clinician'::text
      AND (
        clinician_id = (SELECT auth.uid())
        OR public.has_clinician_access(
          (SELECT auth.uid()),
          patient_id,
          'view_assessment_history'
        )
      )
    )
  );

DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'get_admin_dashboard_stats(integer)',
    'get_top_assessments(integer)',
    'get_high_risk_patients(integer)',
    'get_user_engagement_metrics()',
    'get_assessment_completion_funnel(integer)',
    'get_assessment_performance_comparison(uuid)',
    'get_patient_risk_profile(uuid)'
  ]
  LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC', fn);
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM anon', fn);
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'skip missing function %', fn;
    END;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_demographics_breakdown'
  ) THEN
    REVOKE ALL ON FUNCTION public.get_demographics_breakdown(text) FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.get_demographics_breakdown(text) FROM anon;
    REVOKE ALL ON FUNCTION public.get_demographics_breakdown(text) FROM authenticated;
    GRANT EXECUTE ON FUNCTION public.get_demographics_breakdown(text) TO service_role;
  END IF;
END $$;

DO $$
DECLARE
  mv text;
BEGIN
  FOREACH mv IN ARRAY ARRAY[
    'admin_daily_stats',
    'admin_assessment_stats',
    'admin_user_engagement_stats',
    'admin_high_risk_alerts',
    'admin_demographics_summary'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = mv
    ) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', mv);
    END IF;
  END LOOP;
END $$;