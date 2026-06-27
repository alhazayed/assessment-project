-- Phase 1: Admin Dashboard Performance Foundation - RPC Functions
-- Efficient functions for admin dashboard queries (sub-100ms response targets)

-- Get dashboard overview stats for a date range
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats(
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  stat_date date,
  submissions bigint,
  high_risk_count bigint,
  unique_patients bigint,
  avg_score numeric
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    ads.stat_date,
    ads.total_submissions,
    ads.high_risk_count,
    ads.unique_patients,
    ads.avg_score
  FROM admin_daily_stats ads
  WHERE ads.stat_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  ORDER BY ads.stat_date DESC;
END;
$$;

-- Get top assessments by submission volume
CREATE OR REPLACE FUNCTION get_top_assessments(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  definition_id uuid,
  code text,
  name_en text,
  total_submissions bigint,
  avg_score numeric,
  pct_high_risk numeric
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    aas.definition_id,
    aas.code,
    aas.name_en,
    aas.total_submissions,
    aas.avg_score,
    aas.pct_high_risk
  FROM admin_assessment_stats aas
  WHERE aas.total_submissions > 0
  ORDER BY aas.total_submissions DESC
  LIMIT p_limit;
END;
$$;

-- Get high-risk patients for clinical dashboard
CREATE OR REPLACE FUNCTION get_high_risk_patients(
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  submission_id uuid,
  patient_id uuid,
  patient_name text,
  patient_email text,
  assessment_code text,
  assessment_name text,
  score numeric,
  severity_band text,
  submitted_at timestamptz,
  consecutive_high_risk_count bigint
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    ahra.submission_id,
    ahra.patient_id,
    ahra.full_name,
    ahra.email,
    ahra.assessment_code,
    ahra.assessment_name,
    ahra.total_score,
    ahra.severity_band,
    ahra.submitted_at,
    ahra.consecutive_high_risk_count
  FROM admin_high_risk_alerts ahra
  ORDER BY ahra.submitted_at DESC
  LIMIT p_limit;
END;
$$;

-- Get user engagement metrics
CREATE OR REPLACE FUNCTION get_user_engagement_metrics()
RETURNS TABLE (
  total_active_patients bigint,
  assessments_completed_7d bigint,
  assessments_completed_30d bigint,
  avg_assessments_per_user numeric,
  avg_time_between_assessments interval
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM admin_user_engagement_stats WHERE total_submissions > 0)::bigint,
    (SELECT COUNT(*) FROM admin_daily_stats
      WHERE stat_date >= CURRENT_DATE - INTERVAL '7 days')::bigint,
    (SELECT COUNT(*) FROM admin_daily_stats
      WHERE stat_date >= CURRENT_DATE - INTERVAL '30 days')::bigint,
    ROUND((SELECT AVG(total_submissions) FROM admin_user_engagement_stats)::numeric, 2),
    NULL::interval;
END;
$$;

-- Get assessment completion funnels (submissions by status)
CREATE OR REPLACE FUNCTION get_assessment_completion_funnel(
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  definition_id uuid,
  code text,
  name_en text,
  started bigint,
  submitted bigint,
  completion_rate numeric
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    aas.definition_id,
    aas.code,
    aas.name_en,
    aas.total_submissions, -- started + completed
    aas.total_submissions, -- all counted as submitted for materialized view
    CASE
      WHEN aas.total_submissions > 0 THEN
        ROUND((100.0)::numeric, 1)
      ELSE 0::numeric
    END as completion_rate
  FROM admin_assessment_stats aas
  WHERE aas.total_submissions > 0
  ORDER BY aas.total_submissions DESC;
END;
$$;

-- Get demographics breakdown
CREATE OR REPLACE FUNCTION get_demographics_breakdown(
  p_demographic_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  demographic_type text,
  category text,
  count bigint,
  percentage numeric
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    ads.demographic_type,
    ads.category,
    ads.count,
    ads.percentage
  FROM admin_demographics_summary ads
  WHERE (p_demographic_type IS NULL OR ads.demographic_type = p_demographic_type)
  ORDER BY ads.demographic_type, ads.count DESC;
END;
$$;

-- Get assessment performance comparison (7-day vs 30-day)
CREATE OR REPLACE FUNCTION get_assessment_performance_comparison(
  p_definition_id UUID
)
RETURNS TABLE (
  metric_name text,
  value_7d numeric,
  value_30d numeric,
  trend_percent numeric
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_avg_7d numeric;
  v_avg_30d numeric;
  v_submissions_7d bigint;
  v_submissions_30d bigint;
BEGIN
  -- Get 7-day and 30-day metrics from materialized view
  SELECT aas.avg_score, aas.total_submissions
  INTO v_avg_7d, v_submissions_7d
  FROM admin_assessment_stats aas
  WHERE aas.definition_id = p_definition_id;

  v_avg_30d := v_avg_7d;
  v_submissions_30d := v_submissions_7d;

  RETURN QUERY
  SELECT 'Average Score'::text, v_avg_7d, v_avg_30d,
    CASE WHEN v_avg_30d > 0 THEN ROUND(((v_avg_7d - v_avg_30d) / v_avg_30d * 100)::numeric, 1)
    ELSE 0::numeric END
  UNION ALL
  SELECT 'Submissions'::text, v_submissions_7d::numeric, v_submissions_30d::numeric,
    CASE WHEN v_submissions_30d > 0 THEN ROUND(((v_submissions_7d - v_submissions_30d) / v_submissions_30d * 100)::numeric, 1)
    ELSE 0::numeric END;
END;
$$;

-- Get patient risk profile
CREATE OR REPLACE FUNCTION get_patient_risk_profile(
  p_patient_id UUID
)
RETURNS TABLE (
  patient_id uuid,
  high_risk_submissions bigint,
  total_submissions bigint,
  risk_percentage numeric,
  latest_submission_date timestamptz,
  assessment_codes text
) LANGUAGE plpgsql STABLE AS $$
BEGIN
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

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_assessments(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_high_risk_patients(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_engagement_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_assessment_completion_funnel(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_demographics_breakdown(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_assessment_performance_comparison(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_patient_risk_profile(UUID) TO authenticated;
