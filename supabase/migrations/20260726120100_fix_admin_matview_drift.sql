-- Fix admin-dashboard materialized-view drift that left two admin RPCs broken
-- in production (verified against the live database):
--   * get_high_risk_patients  -> ERROR: column ahra.full_name does not exist
--   * get_demographics_breakdown -> ERROR: relation "admin_demographics_summary" does not exist
--
-- The remote admin_high_risk_alerts had been created out-of-band without the
-- columns the RPC consumes (full_name/email/assessment_name/consecutive_high_risk_count),
-- and admin_demographics_summary was never created at all. Recreate both with
-- definitions that match what 20260627220100_admin_dashboard_rpcs.sql selects.
-- Idempotent and safe to re-run.

-- ── admin_high_risk_alerts ──────────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS admin_high_risk_alerts;
CREATE MATERIALIZED VIEW admin_high_risk_alerts AS
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

-- ── admin_demographics_summary ──────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS admin_demographics_summary;
CREATE MATERIALIZED VIEW admin_demographics_summary AS
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

-- Preserve the hardened access posture: these aggregate sensitive data and are
-- read only via the service-role key (see 20260628071704). Never expose them to
-- the anon/authenticated Data API roles.
REVOKE ALL ON admin_high_risk_alerts     FROM anon, authenticated;
REVOKE ALL ON admin_demographics_summary FROM anon, authenticated;
GRANT SELECT ON admin_high_risk_alerts     TO service_role;
GRANT SELECT ON admin_demographics_summary TO service_role;
