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

DO $migrate$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_admin_dashboard_stats',
        'get_top_assessments',
        'get_high_risk_patients',
        'get_user_engagement_metrics',
        'get_assessment_completion_funnel',
        'get_demographics_breakdown',
        'get_assessment_performance_comparison',
        'get_patient_risk_profile'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', fn.proname, fn.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', fn.proname, fn.args);
  END LOOP;
END
$migrate$;

DO $migrate$
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
      SELECT 1 FROM pg_matviews
      WHERE schemaname = 'public' AND matviewname = mv
    ) THEN
      EXECUTE format('GRANT SELECT ON public.%I TO service_role', mv);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', mv);
    END IF;
  END LOOP;
END
$migrate$;

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

REVOKE EXECUTE ON FUNCTION public.generate_patient_access_code() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_patient_access_code() TO service_role;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_deletion_requested
  ON public.profiles(deletion_requested_at)
  WHERE deletion_requested_at IS NOT NULL;