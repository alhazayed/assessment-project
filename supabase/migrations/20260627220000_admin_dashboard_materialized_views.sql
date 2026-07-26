-- Phase 1: Admin Dashboard Performance Foundation - Materialized Views
-- These views aggregate data for fast admin dashboard queries.
--
-- CORRECTED 2026-07-26: the original version of this migration never applied to
-- a fresh database. It referenced columns that do not exist on public.profiles
-- (`user_type`, `full_name`, `email` — the real columns are `role`,
-- `full_name_en`, and email lives in auth.users) and contained SQL syntax
-- errors (stray quotes in the demographics subqueries). On the remote database
-- these matviews had been created out-of-band, so `CREATE ... IF NOT EXISTS`
-- silently skipped and the drift went unnoticed — but it also left two admin
-- RPCs broken in production (get_high_risk_patients referenced a non-existent
-- `full_name` column; get_demographics_breakdown referenced a missing
-- admin_demographics_summary). The definitions below use the correct source
-- columns and expose exactly the columns the RPCs in
-- 20260627220100_admin_dashboard_rpcs.sql consume.

-- Daily statistics aggregation (for trend charts)
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_daily_stats AS
SELECT
  DATE(submitted_at) as stat_date,
  COUNT(*) as total_submissions,
  COUNT(CASE WHEN high_risk_flag = true THEN 1 END) as high_risk_count,
  COUNT(DISTINCT patient_id) as unique_patients,
  ROUND(AVG(total_score)::numeric, 2) as avg_score
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
  COUNT(sub.id) as total_submissions,
  COUNT(DISTINCT sub.patient_id) as unique_patients,
  ROUND(AVG(sub.total_score)::numeric, 2) as avg_score,
  ROUND((COUNT(CASE WHEN sub.high_risk_flag = true THEN 1 END)::numeric /
    NULLIF(COUNT(sub.id), 0) * 100)::numeric, 1) as pct_high_risk
FROM public.assessment_definitions ad
LEFT JOIN public.assessment_submissions sub ON ad.id = sub.definition_id
  AND sub.submitted_at >= NOW() - INTERVAL '90 days'
GROUP BY ad.id, ad.code, ad.name_en
ORDER BY total_submissions DESC;

CREATE INDEX IF NOT EXISTS idx_admin_assessment_stats_submissions
  ON admin_assessment_stats(total_submissions DESC);

-- User engagement statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_user_engagement_stats AS
SELECT
  p.id as user_id,
  p.role,
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
WHERE p.role IN ('patient', 'admin')
GROUP BY p.id, p.role, p.date_of_birth, p.gender, p.country_of_residence
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
  p.full_name_en as full_name,
  u.email::text as email,
  ad.code as assessment_code,
  ad.name_en as assessment_name,
  sub.total_score::numeric as total_score,
  sub.high_risk_flag,
  sub.severity_band,
  sub.submitted_at,
  AGE(p.created_at) as account_age,
  COUNT(*) OVER (PARTITION BY sub.patient_id) as consecutive_high_risk_count
FROM public.assessment_submissions sub
JOIN public.profiles p ON sub.patient_id = p.id
JOIN public.assessment_definitions ad ON sub.definition_id = ad.id
LEFT JOIN auth.users u ON u.id = p.id
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
  ROUND((COUNT(*)::numeric /
    NULLIF((SELECT COUNT(*) FROM public.profiles WHERE role = 'patient'), 0)::numeric) * 100, 1) as percentage
FROM public.profiles p
WHERE p.role = 'patient' AND p.gender IS NOT NULL
GROUP BY p.gender

UNION ALL

SELECT
  'education',
  p.educational_status,
  COUNT(*),
  ROUND((COUNT(*)::numeric /
    NULLIF((SELECT COUNT(*) FROM public.profiles WHERE role = 'patient' AND educational_status IS NOT NULL), 0)::numeric) * 100, 1)
FROM public.profiles p
WHERE p.role = 'patient' AND p.educational_status IS NOT NULL
GROUP BY p.educational_status

UNION ALL

SELECT
  'marital_status',
  p.marital_status,
  COUNT(*),
  ROUND((COUNT(*)::numeric /
    NULLIF((SELECT COUNT(*) FROM public.profiles WHERE role = 'patient' AND marital_status IS NOT NULL), 0)::numeric) * 100, 1)
FROM public.profiles p
WHERE p.role = 'patient' AND p.marital_status IS NOT NULL
GROUP BY p.marital_status

ORDER BY demographic_type, count DESC;

CREATE INDEX IF NOT EXISTS idx_admin_demographics_summary_type
  ON admin_demographics_summary(demographic_type, count DESC);

-- Grant access to authenticated admin users. (A later hardening migration —
-- 20260628071704 — revokes anon/authenticated Data API access to these views,
-- since admin features read them via the service-role key.)
GRANT SELECT ON admin_daily_stats TO authenticated;
GRANT SELECT ON admin_assessment_stats TO authenticated;
GRANT SELECT ON admin_user_engagement_stats TO authenticated;
GRANT SELECT ON admin_high_risk_alerts TO authenticated;
GRANT SELECT ON admin_demographics_summary TO authenticated;
