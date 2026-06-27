-- Phase 1: Admin Dashboard Performance Foundation - Materialized Views
-- These views aggregate data for fast admin dashboard queries
-- Refresh via pg_cron every hour

-- Daily statistics aggregation (for trend charts)
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_daily_stats AS
SELECT
  DATE(submitted_at) as stat_date,
  COUNT(*) as total_submissions,
  COUNT(CASE WHEN high_risk_flag = true THEN 1 END) as high_risk_count,
  COUNT(DISTINCT patient_id) as unique_patients,
  ROUND(AVG(total_score)::numeric, 2) as avg_score,
  MIN(total_score) as min_score,
  MAX(total_score) as max_score,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_score) as median_score
FROM public.assessment_submissions
WHERE submitted_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(submitted_at)
ORDER BY stat_date DESC;

CREATE INDEX IF NOT EXISTS idx_admin_daily_stats_date
  ON admin_daily_stats(stat_date DESC);

-- Assessment performance statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_assessment_stats AS
SELECT
  ad.id as definition_id,
  ad.code,
  ad.name_en,
  ad.name_ar,
  COUNT(sub.id) as total_submissions,
  COUNT(DISTINCT sub.patient_id) as unique_patients,
  COUNT(CASE WHEN sub.high_risk_flag = true THEN 1 END) as high_risk_count,
  ROUND(AVG(sub.total_score)::numeric, 2) as avg_score,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sub.total_score) as median_score,
  ROUND(STDDEV(sub.total_score)::numeric, 2) as stddev_score,
  MIN(sub.total_score) as min_score,
  MAX(sub.total_score) as max_score,
  ROUND((COUNT(CASE WHEN sub.high_risk_flag = true THEN 1 END)::numeric /
    NULLIF(COUNT(sub.id), 0) * 100)::numeric, 1) as pct_high_risk,
  MAX(sub.submitted_at) as last_submission_date
FROM public.assessment_definitions ad
LEFT JOIN public.assessment_submissions sub ON ad.id = sub.definition_id
  AND sub.submitted_at >= NOW() - INTERVAL '90 days'
GROUP BY ad.id, ad.code, ad.name_en, ad.name_ar
ORDER BY total_submissions DESC;

CREATE INDEX IF NOT EXISTS idx_admin_assessment_stats_submissions
  ON admin_assessment_stats(total_submissions DESC);

-- User engagement statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_user_engagement_stats AS
SELECT
  p.id as user_id,
  p.user_type,
  COUNT(sub.id) as total_submissions,
  COUNT(CASE WHEN sub.high_risk_flag = true THEN 1 END) as high_risk_submissions,
  MAX(sub.submitted_at) as last_assessment_date,
  MIN(sub.submitted_at) as first_assessment_date,
  ROUND(AVG(sub.total_score)::numeric, 2) as avg_assessment_score,
  CASE
    WHEN p.date_of_birth IS NOT NULL THEN
      DATE_PART('year', AGE(p.date_of_birth))::integer
    ELSE NULL
  END as age,
  p.gender,
  p.country_of_residence
FROM public.profiles p
LEFT JOIN public.assessment_submissions sub ON p.id = sub.patient_id
  AND sub.submitted_at >= NOW() - INTERVAL '90 days'
WHERE p.user_type IN ('patient', 'admin')
GROUP BY p.id, p.user_type, p.date_of_birth, p.gender, p.country_of_residence
ORDER BY total_submissions DESC;

CREATE INDEX IF NOT EXISTS idx_admin_user_engagement_submissions
  ON admin_user_engagement_stats(total_submissions DESC);

CREATE INDEX IF NOT EXISTS idx_admin_user_engagement_user_id
  ON admin_user_engagement_stats(user_id);

-- High-risk alerts (for clinical dashboard)
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_high_risk_alerts AS
SELECT
  sub.id as submission_id,
  sub.patient_id,
  p.full_name,
  p.email,
  ad.code as assessment_code,
  ad.name_en as assessment_name,
  sub.total_score,
  sub.high_risk_flag,
  sub.severity_band,
  sub.submitted_at,
  AGE(p.created_at) as account_age,
  COUNT(CASE WHEN sub2.high_risk_flag = true THEN 1 END)
    OVER (PARTITION BY sub.patient_id ORDER BY sub2.submitted_at DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
    as consecutive_high_risk_count
FROM public.assessment_submissions sub
JOIN public.profiles p ON sub.patient_id = p.id
JOIN public.assessment_definitions ad ON sub.definition_id = ad.id
LEFT JOIN public.assessment_submissions sub2 ON p.id = sub2.patient_id
WHERE sub.high_risk_flag = true
  AND sub.submitted_at >= NOW() - INTERVAL '30 days'
ORDER BY sub.submitted_at DESC;

CREATE INDEX IF NOT EXISTS idx_admin_high_risk_alerts_patient
  ON admin_high_risk_alerts(patient_id);

CREATE INDEX IF NOT EXISTS idx_admin_high_risk_alerts_date
  ON admin_high_risk_alerts(submitted_at DESC);

-- Demographics summary (for analytics dashboard)
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_demographics_summary AS
SELECT
  'gender' as demographic_type,
  p.gender as category,
  COUNT(*) as count,
  ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM public.profiles WHERE user_type = 'patient'))::numeric * 100, 1) as percentage
FROM public.profiles p
WHERE p.user_type = 'patient' AND p.gender IS NOT NULL
GROUP BY p.gender

UNION ALL

SELECT
  'education',
  p.educational_status,
  COUNT(*),
  ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM public.profiles WHERE user_type = 'patient' AND educational_status IS NOT NULL'))::numeric * 100, 1)
FROM public.profiles p
WHERE p.user_type = 'patient' AND p.educational_status IS NOT NULL
GROUP BY p.educational_status

UNION ALL

SELECT
  'marital_status',
  p.marital_status,
  COUNT(*),
  ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM public.profiles WHERE user_type = 'patient' AND marital_status IS NOT NULL'))::numeric * 100, 1)
FROM public.profiles p
WHERE p.user_type = 'patient' AND p.marital_status IS NOT NULL
GROUP BY p.marital_status

ORDER BY demographic_type, count DESC;

CREATE INDEX IF NOT EXISTS idx_admin_demographics_summary_type
  ON admin_demographics_summary(demographic_type, count DESC);

-- Grant access to authenticated admin users
GRANT SELECT ON admin_daily_stats TO authenticated;
GRANT SELECT ON admin_assessment_stats TO authenticated;
GRANT SELECT ON admin_user_engagement_stats TO authenticated;
GRANT SELECT ON admin_high_risk_alerts TO authenticated;
GRANT SELECT ON admin_demographics_summary TO authenticated;
