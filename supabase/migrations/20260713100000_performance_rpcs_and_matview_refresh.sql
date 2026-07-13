-- Performance RPCs and materialized view refresh schedule

-- Efficient submission counts for admin user list (replaces full row fetch)
CREATE OR REPLACE FUNCTION get_submission_counts_by_patient(p_patient_ids uuid[])
RETURNS TABLE(patient_id uuid, submission_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.patient_id, COUNT(*)::bigint
  FROM assessment_submissions s
  WHERE s.patient_id = ANY(p_patient_ids)
  GROUP BY s.patient_id;
$$;

REVOKE ALL ON FUNCTION get_submission_counts_by_patient(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_submission_counts_by_patient(uuid[]) TO service_role;

-- Distinct active patients since a timestamp (KPI dashboard)
CREATE OR REPLACE FUNCTION count_distinct_active_patients(p_since timestamptz)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT patient_id)::bigint
  FROM assessment_submissions
  WHERE submitted_at >= p_since;
$$;

REVOKE ALL ON FUNCTION count_distinct_active_patients(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION count_distinct_active_patients(timestamptz) TO service_role;

-- Latest submission per patient for clinician patient list
CREATE OR REPLACE FUNCTION get_latest_submissions_for_patients(p_patient_ids uuid[])
RETURNS TABLE(
  patient_id uuid,
  submitted_at timestamptz,
  severity_band text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (s.patient_id)
    s.patient_id,
    s.submitted_at,
    s.severity_band
  FROM assessment_submissions s
  WHERE s.patient_id = ANY(p_patient_ids)
  ORDER BY s.patient_id, s.submitted_at DESC;
$$;

REVOKE ALL ON FUNCTION get_latest_submissions_for_patients(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_latest_submissions_for_patients(uuid[]) TO service_role;

-- Refresh admin materialized views hourly when pg_cron is available
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh_admin_matviews') THEN
      PERFORM cron.schedule(
        'refresh_admin_matviews',
        '0 * * * *',
        $job$
          REFRESH MATERIALIZED VIEW CONCURRENTLY admin_daily_stats;
          REFRESH MATERIALIZED VIEW CONCURRENTLY admin_assessment_stats;
          REFRESH MATERIALIZED VIEW CONCURRENTLY admin_user_engagement_stats;
          REFRESH MATERIALIZED VIEW CONCURRENTLY admin_high_risk_alerts;
          REFRESH MATERIALIZED VIEW CONCURRENTLY admin_demographics_summary;
        $job$
      );
    END IF;
  END IF;
END;
$cron$;
