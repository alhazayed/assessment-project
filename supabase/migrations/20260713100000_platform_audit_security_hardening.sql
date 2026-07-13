-- Platform audit security hardening (2026-07-13)
-- Fixes: overlapping RLS policies, clinician IDOR, admin RPC exposure,
-- signup role escalation, package policy gaps, matview schema drift.

-- ── Helper: clinician may access a specific patient's data ─────────────────
CREATE OR REPLACE FUNCTION public.clinician_can_access_patient(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT
    public.is_admin()
    OR (
      public.get_my_role() = 'clinician'
      AND (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = p_patient_id
            AND p.assigned_clinician_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.clinician_patient_relationships cpr
          WHERE cpr.patient_id = p_patient_id
            AND cpr.clinician_id = auth.uid()
            AND cpr.status = 'active'
        )
        OR EXISTS (
          SELECT 1 FROM public.assessment_assignments aa
          WHERE aa.patient_id = p_patient_id
            AND aa.clinician_id = auth.uid()
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.clinician_can_access_patient(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clinician_can_access_patient(uuid) TO authenticated;

-- ── Drop overlapping policies that weakened baseline enforcement ───────────
DROP POLICY IF EXISTS "cn_clinician_own" ON public.clinical_notes;
DROP POLICY IF EXISTS "cn_patient_read" ON public.clinical_notes;
DROP POLICY IF EXISTS "cn_admin_read" ON public.clinical_notes;
DROP POLICY IF EXISTS "msg_participant_read" ON public.messages;
DROP POLICY IF EXISTS "msg_participant_insert" ON public.messages;
DROP POLICY IF EXISTS "msg_admin_read" ON public.messages;

-- ── Clinician verification: prevent self-escalation to verified ──────────────
DROP POLICY IF EXISTS "cv_clinician_own" ON public.clinician_verifications;

CREATE POLICY "cv_clinician_select"
  ON public.clinician_verifications FOR SELECT
  TO authenticated
  USING (clinician_id = auth.uid() OR public.is_admin());

CREATE POLICY "cv_clinician_insert"
  ON public.clinician_verifications FOR INSERT
  TO authenticated
  WITH CHECK (
    clinician_id = auth.uid()
    AND status = 'pending_verification'
  );

CREATE POLICY "cv_clinician_update_pending"
  ON public.clinician_verifications FOR UPDATE
  TO authenticated
  USING (clinician_id = auth.uid() AND status = 'pending_verification')
  WITH CHECK (
    clinician_id = auth.uid()
    AND status = 'pending_verification'
  );

CREATE POLICY "cv_admin_manage"
  ON public.clinician_verifications FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── Tighten broad clinician read policies (IDOR prevention) ──────────────────
DROP POLICY IF EXISTS assign_read ON public.assessment_assignments;
CREATE POLICY assign_read ON public.assessment_assignments FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = patient_id
    OR public.clinician_can_access_patient(patient_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS patient_prof_clinician ON public.patient_profiles;
CREATE POLICY patient_prof_clinician ON public.patient_profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = id
    OR public.clinician_can_access_patient(id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS pdf_reports_clinician ON public.pdf_reports;
CREATE POLICY pdf_reports_clinician ON public.pdf_reports FOR SELECT
  TO authenticated
  USING (public.clinician_can_access_patient(patient_id));

DROP POLICY IF EXISTS personality_clinician ON public.personality_results;
CREATE POLICY personality_clinician ON public.personality_results FOR SELECT
  TO authenticated
  USING (public.clinician_can_access_patient(patient_id));

DROP POLICY IF EXISTS insights_clinician ON public.ai_insights;
CREATE POLICY insights_clinician ON public.ai_insights FOR SELECT
  TO authenticated
  USING (public.clinician_can_access_patient(patient_id));

DROP POLICY IF EXISTS medications_clinician ON public.medications;
CREATE POLICY medications_clinician ON public.medications FOR SELECT
  TO authenticated
  USING (public.clinician_can_access_patient(patient_id));

DROP POLICY IF EXISTS med_alerts_clinician ON public.medication_alerts;
CREATE POLICY med_alerts_clinician ON public.medication_alerts FOR SELECT
  TO authenticated
  USING (public.clinician_can_access_patient(patient_id));

DROP POLICY IF EXISTS gratitude_clinician ON public.gratitude_entries;
CREATE POLICY gratitude_clinician ON public.gratitude_entries FOR SELECT
  TO authenticated
  USING (public.clinician_can_access_patient(patient_id));

-- ── Package catalog: require auth + active status (no draft leakage) ─────────
DROP POLICY IF EXISTS "packages_authenticated_read" ON public.packages;
CREATE POLICY "packages_authenticated_read"
  ON public.packages FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND status = 'active');

DROP POLICY IF EXISTS "package_assessments_authenticated_read" ON public.package_assessments;
CREATE POLICY "package_assessments_authenticated_read"
  ON public.package_assessments FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.packages p
      WHERE p.id = package_id AND p.status = 'active'
    )
  );

DROP POLICY IF EXISTS "package_interpretations_authenticated_read" ON public.package_interpretations;
CREATE POLICY "package_interpretations_authenticated_read"
  ON public.package_interpretations FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.packages p
      WHERE p.id = package_id AND p.status = 'active'
    )
  );

-- ── Signup: never trust user_metadata role (prevent privilege escalation) ────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name_en)
  VALUES (
    NEW.id,
    'patient',
    COALESCE(NEW.raw_user_meta_data->>'full_name_en', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.patient_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ── Restrict permission probe to involved parties ───────────────────────────
CREATE OR REPLACE FUNCTION public.check_relationship_permission(
  p_clinician_id uuid,
  p_patient_id   uuid,
  p_permission   text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      auth.uid() = p_clinician_id
      OR auth.uid() = p_patient_id
      OR public.is_admin()
    )
    AND EXISTS (
      SELECT 1
      FROM public.clinician_patient_relationships cpr
      JOIN public.relationship_permissions rp ON rp.relationship_id = cpr.id
      WHERE cpr.clinician_id  = p_clinician_id
        AND cpr.patient_id    = p_patient_id
        AND cpr.status        = 'active'
        AND rp.permission_key = p_permission
        AND rp.granted        = true
    );
$$;

REVOKE ALL ON FUNCTION public.check_relationship_permission(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_relationship_permission(uuid, uuid, text) TO authenticated;

-- ── Admin materialized views: fix schema drift + revoke API access ───────────
DROP MATERIALIZED VIEW IF EXISTS admin_high_risk_alerts;
CREATE MATERIALIZED VIEW admin_high_risk_alerts AS
SELECT
  sub.id AS submission_id,
  sub.patient_id,
  p.full_name_en AS full_name,
  au.email,
  ad.code AS assessment_code,
  ad.name_en AS assessment_name,
  sub.total_score,
  sub.high_risk_flag,
  sub.severity_band,
  sub.submitted_at,
  AGE(p.created_at) AS account_age,
  COUNT(CASE WHEN sub2.high_risk_flag = true THEN 1 END)
    OVER (
      PARTITION BY sub.patient_id
      ORDER BY sub2.submitted_at DESC
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS consecutive_high_risk_count
FROM public.assessment_submissions sub
JOIN public.profiles p ON sub.patient_id = p.id
JOIN auth.users au ON au.id = p.id
JOIN public.assessment_definitions ad ON sub.definition_id = ad.id
LEFT JOIN public.assessment_submissions sub2 ON p.id = sub2.patient_id
WHERE sub.high_risk_flag = true
  AND sub.submitted_at >= NOW() - INTERVAL '30 days'
ORDER BY sub.submitted_at DESC;

CREATE INDEX IF NOT EXISTS idx_admin_high_risk_alerts_patient
  ON admin_high_risk_alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_admin_high_risk_alerts_date
  ON admin_high_risk_alerts(submitted_at DESC);

DROP MATERIALIZED VIEW IF EXISTS admin_user_engagement_stats;
CREATE MATERIALIZED VIEW admin_user_engagement_stats AS
SELECT
  p.id AS user_id,
  p.role AS user_type,
  COUNT(sub.id) AS total_submissions,
  COUNT(CASE WHEN sub.high_risk_flag = true THEN 1 END) AS high_risk_submissions,
  MAX(sub.submitted_at) AS last_assessment_date,
  MIN(sub.submitted_at) AS first_assessment_date,
  ROUND(AVG(sub.total_score)::numeric, 2) AS avg_assessment_score,
  CASE
    WHEN p.date_of_birth IS NOT NULL THEN
      DATE_PART('year', AGE(p.date_of_birth))::integer
    ELSE NULL
  END AS age,
  p.gender,
  p.country_of_residence
FROM public.profiles p
LEFT JOIN public.assessment_submissions sub
  ON p.id = sub.patient_id
  AND sub.submitted_at >= NOW() - INTERVAL '90 days'
WHERE p.role = 'patient'
GROUP BY p.id, p.role, p.date_of_birth, p.gender, p.country_of_residence
ORDER BY total_submissions DESC;

CREATE INDEX IF NOT EXISTS idx_admin_user_engagement_submissions
  ON admin_user_engagement_stats(total_submissions DESC);
CREATE INDEX IF NOT EXISTS idx_admin_user_engagement_user_id
  ON admin_user_engagement_stats(user_id);

DROP MATERIALIZED VIEW IF EXISTS admin_demographics_summary;
CREATE MATERIALIZED VIEW admin_demographics_summary AS
SELECT
  'gender' AS demographic_type,
  p.gender AS category,
  COUNT(*) AS count,
  ROUND((COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM public.profiles WHERE role = 'patient'), 0)) * 100, 1) AS percentage
FROM public.profiles p
WHERE p.role = 'patient' AND p.gender IS NOT NULL
GROUP BY p.gender

UNION ALL

SELECT
  'education',
  p.educational_status,
  COUNT(*),
  ROUND((COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM public.profiles WHERE role = 'patient' AND educational_status IS NOT NULL), 0)) * 100, 1)
FROM public.profiles p
WHERE p.role = 'patient' AND p.educational_status IS NOT NULL
GROUP BY p.educational_status

UNION ALL

SELECT
  'marital_status',
  p.marital_status,
  COUNT(*),
  ROUND((COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM public.profiles WHERE role = 'patient' AND marital_status IS NOT NULL), 0)) * 100, 1)
FROM public.profiles p
WHERE p.role = 'patient' AND p.marital_status IS NOT NULL
GROUP BY p.marital_status

ORDER BY demographic_type, count DESC;

CREATE INDEX IF NOT EXISTS idx_admin_demographics_summary_type
  ON admin_demographics_summary(demographic_type, count DESC);

REVOKE ALL ON public.admin_daily_stats FROM anon, authenticated;
REVOKE ALL ON public.admin_assessment_stats FROM anon, authenticated;
REVOKE ALL ON public.admin_user_engagement_stats FROM anon, authenticated;
REVOKE ALL ON public.admin_high_risk_alerts FROM anon, authenticated;
REVOKE ALL ON public.admin_demographics_summary FROM anon, authenticated;

-- ── Admin RPCs: enforce is_admin() and restrict to service_role ──────────────
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  stat_date date,
  submissions bigint,
  high_risk_count bigint,
  unique_patients bigint,
  avg_score numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT ads.stat_date, ads.total_submissions, ads.high_risk_count, ads.unique_patients, ads.avg_score
  FROM admin_daily_stats ads
  WHERE ads.stat_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  ORDER BY ads.stat_date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_top_assessments(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  definition_id uuid, code text, name_en text,
  total_submissions bigint, avg_score numeric, pct_high_risk numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT aas.definition_id, aas.code, aas.name_en, aas.total_submissions, aas.avg_score, aas.pct_high_risk
  FROM admin_assessment_stats aas
  WHERE aas.total_submissions > 0
  ORDER BY aas.total_submissions DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_high_risk_patients(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  submission_id uuid, patient_id uuid, patient_name text, patient_email text,
  assessment_code text, assessment_name text, score numeric, severity_band text,
  submitted_at timestamptz, consecutive_high_risk_count bigint
) LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT ahra.submission_id, ahra.patient_id, ahra.full_name, ahra.email,
         ahra.assessment_code, ahra.assessment_name, ahra.total_score,
         ahra.severity_band, ahra.submitted_at, ahra.consecutive_high_risk_count
  FROM admin_high_risk_alerts ahra
  ORDER BY ahra.submitted_at DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_engagement_metrics()
RETURNS TABLE (
  total_active_patients bigint, assessments_completed_7d bigint,
  assessments_completed_30d bigint, avg_assessments_per_user numeric,
  avg_time_between_assessments interval
) LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM admin_user_engagement_stats WHERE total_submissions > 0)::bigint,
    (SELECT COUNT(*) FROM admin_daily_stats WHERE stat_date >= CURRENT_DATE - INTERVAL '7 days')::bigint,
    (SELECT COUNT(*) FROM admin_daily_stats WHERE stat_date >= CURRENT_DATE - INTERVAL '30 days')::bigint,
    ROUND((SELECT AVG(total_submissions) FROM admin_user_engagement_stats)::numeric, 2),
    NULL::interval;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_assessment_completion_funnel(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  definition_id uuid, code text, name_en text,
  started bigint, submitted bigint, completion_rate numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT aas.definition_id, aas.code, aas.name_en,
         aas.total_submissions, aas.total_submissions,
         CASE WHEN aas.total_submissions > 0 THEN ROUND((100.0)::numeric, 1) ELSE 0::numeric END
  FROM admin_assessment_stats aas
  WHERE aas.total_submissions > 0
  ORDER BY aas.total_submissions DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_demographics_breakdown(p_demographic_type TEXT DEFAULT NULL)
RETURNS TABLE (
  demographic_type text, category text, count bigint, percentage numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT ads.demographic_type, ads.category, ads.count, ads.percentage
  FROM admin_demographics_summary ads
  WHERE (p_demographic_type IS NULL OR ads.demographic_type = p_demographic_type)
  ORDER BY ads.demographic_type, ads.count DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_assessment_performance_comparison(p_definition_id UUID)
RETURNS TABLE (
  metric_name text, value_7d numeric, value_30d numeric, trend_percent numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg_7d numeric;
  v_avg_30d numeric;
  v_submissions_7d bigint;
  v_submissions_30d bigint;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  SELECT aas.avg_score, aas.total_submissions INTO v_avg_7d, v_submissions_7d
  FROM admin_assessment_stats aas WHERE aas.definition_id = p_definition_id;
  v_avg_30d := v_avg_7d;
  v_submissions_30d := v_submissions_7d;
  RETURN QUERY
  SELECT 'Average Score'::text, v_avg_7d, v_avg_30d,
    CASE WHEN v_avg_30d > 0 THEN ROUND(((v_avg_7d - v_avg_30d) / v_avg_30d * 100)::numeric, 1) ELSE 0::numeric END
  UNION ALL
  SELECT 'Submissions'::text, v_submissions_7d::numeric, v_submissions_30d::numeric,
    CASE WHEN v_submissions_30d > 0 THEN ROUND(((v_submissions_7d - v_submissions_30d) / v_submissions_30d * 100)::numeric, 1) ELSE 0::numeric END;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_patient_risk_profile(p_patient_id UUID)
RETURNS TABLE (
  patient_id uuid, high_risk_submissions bigint, total_submissions bigint,
  risk_percentage numeric, latest_submission_date timestamptz, assessment_codes text
) LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT aues.user_id,
    (SELECT COUNT(*) FROM admin_high_risk_alerts WHERE patient_id = p_patient_id)::bigint,
    aues.total_submissions,
    CASE WHEN aues.total_submissions > 0 THEN
      ROUND(((SELECT COUNT(*) FROM admin_high_risk_alerts WHERE patient_id = p_patient_id)::numeric / aues.total_submissions * 100), 1)
    ELSE 0::numeric END,
    aues.last_assessment_date,
    STRING_AGG(DISTINCT ad.code, ', ')
  FROM admin_user_engagement_stats aues
  LEFT JOIN public.assessment_submissions sub ON aues.user_id = sub.patient_id
  LEFT JOIN public.assessment_definitions ad ON sub.definition_id = ad.id
  WHERE aues.user_id = p_patient_id
  GROUP BY aues.user_id, aues.total_submissions, aues.last_assessment_date;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_top_assessments(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_high_risk_patients(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_engagement_metrics() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_assessment_completion_funnel(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_demographics_breakdown(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_assessment_performance_comparison(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_patient_risk_profile(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_top_assessments(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_high_risk_patients(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_engagement_metrics() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_assessment_completion_funnel(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_demographics_breakdown(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_assessment_performance_comparison(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_patient_risk_profile(UUID) TO authenticated, service_role;
