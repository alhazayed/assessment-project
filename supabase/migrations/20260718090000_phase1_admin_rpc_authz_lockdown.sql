-- =============================================================================
-- PHASE 1 SECURITY REMEDIATION — Objective 1 & 2
-- Admin dashboard RPC authorization lockdown.
-- =============================================================================
--
-- PROBLEM (before this migration):
--   The eight admin dashboard RPCs (20260627220100_admin_dashboard_rpcs.sql)
--   were SECURITY INVOKER and `GRANT EXECUTE ... TO authenticated`, with NO
--   in-function authorization. Any authenticated user (any patient) could call
--   e.g. get_high_risk_patients() / get_patient_risk_profile() / get_demographics_
--   breakdown() and read other patients' PHI. The only thing standing in the way
--   was that the underlying materialized views had their `authenticated` grant
--   revoked — an incidental, fragile control that also breaks the legitimate
--   admin dashboards.
--
-- FIX (this migration):
--   1. Recreate every admin RPC as SECURITY DEFINER with a hard, database-level
--      admin authorization gate (`public.is_admin()`) as the FIRST statement.
--      A non-admin caller now receives ERRCODE 42501 (insufficient_privilege)
--      before any data is read. This is the objective-2 "database-level admin
--      authorization check", enforced in PostgreSQL, not in the API layer.
--   2. Revoke EXECUTE from PUBLIC and anon so the functions are unreachable by
--      unauthenticated / public roles entirely.
--   3. EXECUTE remains granted to `authenticated` ONLY because the shipped admin
--      dashboard routes invoke these RPCs through the cookie-authenticated
--      Supabase client (app/api/admin/dashboard/{stats,assessments,engagement,
--      demographics}/route.ts). The in-function is_admin() gate means an
--      authenticated NON-admin is still rejected — the grant is inert for them.
--      Once those four routes are migrated to the service-role client, the
--      `authenticated` grant can be replaced by `TO service_role` (see
--      SECURITY_IMPACT below) for full lockdown. That is an application change,
--      out of scope for a migration-only change set.
--
-- Behaviour for admins is unchanged (SECURITY DEFINER lets the function read the
-- admin_* materialized views regardless of the caller's own grants), so current
-- functionality is preserved.
-- =============================================================================

-- ── get_admin_dashboard_stats ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  stat_date date, submissions bigint, high_risk_count bigint,
  unique_patients bigint, avg_score numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: administrator role required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT ads.stat_date, ads.total_submissions, ads.high_risk_count,
         ads.unique_patients, ads.avg_score
  FROM admin_daily_stats ads
  WHERE ads.stat_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  ORDER BY ads.stat_date DESC;
END;
$$;

-- ── get_top_assessments ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_top_assessments(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  definition_id uuid, code text, name_en text,
  total_submissions bigint, avg_score numeric, pct_high_risk numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: administrator role required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT aas.definition_id, aas.code, aas.name_en,
         aas.total_submissions, aas.avg_score, aas.pct_high_risk
  FROM admin_assessment_stats aas
  WHERE aas.total_submissions > 0
  ORDER BY aas.total_submissions DESC
  LIMIT p_limit;
END;
$$;

-- ── get_high_risk_patients ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_high_risk_patients(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  submission_id uuid, patient_id uuid, patient_name text, patient_email text,
  assessment_code text, assessment_name text, score numeric,
  severity_band text, submitted_at timestamptz, consecutive_high_risk_count bigint
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: administrator role required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT ahra.submission_id, ahra.patient_id, ahra.full_name, ahra.email,
         ahra.assessment_code, ahra.assessment_name, ahra.total_score,
         ahra.severity_band, ahra.submitted_at, ahra.consecutive_high_risk_count
  FROM admin_high_risk_alerts ahra
  ORDER BY ahra.submitted_at DESC
  LIMIT p_limit;
END;
$$;

-- ── get_user_engagement_metrics ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_engagement_metrics()
RETURNS TABLE (
  total_active_patients bigint, assessments_completed_7d bigint,
  assessments_completed_30d bigint, avg_assessments_per_user numeric,
  avg_time_between_assessments interval
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: administrator role required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM admin_user_engagement_stats WHERE total_submissions > 0)::bigint,
    (SELECT COUNT(*) FROM admin_daily_stats WHERE stat_date >= CURRENT_DATE - INTERVAL '7 days')::bigint,
    (SELECT COUNT(*) FROM admin_daily_stats WHERE stat_date >= CURRENT_DATE - INTERVAL '30 days')::bigint,
    ROUND((SELECT AVG(total_submissions) FROM admin_user_engagement_stats)::numeric, 2),
    NULL::interval;
END;
$$;

-- ── get_assessment_completion_funnel ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_assessment_completion_funnel(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  definition_id uuid, code text, name_en text,
  started bigint, submitted bigint, completion_rate numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: administrator role required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT aas.definition_id, aas.code, aas.name_en,
         aas.total_submissions, aas.total_submissions,
         CASE WHEN aas.total_submissions > 0 THEN ROUND((100.0)::numeric, 1) ELSE 0::numeric END
  FROM admin_assessment_stats aas
  WHERE aas.total_submissions > 0
  ORDER BY aas.total_submissions DESC;
END;
$$;

-- ── get_demographics_breakdown ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_demographics_breakdown(p_demographic_type TEXT DEFAULT NULL)
RETURNS TABLE (
  demographic_type text, category text, count bigint, percentage numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: administrator role required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT ads.demographic_type, ads.category, ads.count, ads.percentage
  FROM admin_demographics_summary ads
  WHERE (p_demographic_type IS NULL OR ads.demographic_type = p_demographic_type)
  ORDER BY ads.demographic_type, ads.count DESC;
END;
$$;

-- ── get_assessment_performance_comparison ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_assessment_performance_comparison(p_definition_id UUID)
RETURNS TABLE (
  metric_name text, value_7d numeric, value_30d numeric, trend_percent numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_avg_7d numeric; v_avg_30d numeric;
  v_submissions_7d bigint; v_submissions_30d bigint;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: administrator role required' USING ERRCODE = '42501';
  END IF;
  SELECT aas.avg_score, aas.total_submissions
  INTO v_avg_7d, v_submissions_7d
  FROM admin_assessment_stats aas
  WHERE aas.definition_id = p_definition_id;

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

-- ── get_patient_risk_profile ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_patient_risk_profile(p_patient_id UUID)
RETURNS TABLE (
  patient_id uuid, high_risk_submissions bigint, total_submissions bigint,
  risk_percentage numeric, latest_submission_date timestamptz, assessment_codes text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: administrator role required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    aues.user_id,
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

-- ── Grant lockdown ───────────────────────────────────────────────────────────
-- Remove all public/anon access. Retain authenticated (gated by is_admin()).
DO $$
DECLARE
  fn text;
  sigs text[] := ARRAY[
    'public.get_admin_dashboard_stats(integer)',
    'public.get_top_assessments(integer)',
    'public.get_high_risk_patients(integer)',
    'public.get_user_engagement_metrics()',
    'public.get_assessment_completion_funnel(integer)',
    'public.get_demographics_breakdown(text)',
    'public.get_assessment_performance_comparison(uuid)',
    'public.get_patient_risk_profile(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY sigs LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    -- Gated authenticated execute (in-function is_admin() enforces authz).
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    -- service_role kept for future migration of dashboard routes to admin client.
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;
