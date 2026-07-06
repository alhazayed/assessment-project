-- Admin Dashboard Materialized View Refresh Jobs
-- Set up pg_cron to automatically refresh views every hour

-- Enable pg_cron extension (required for scheduled jobs)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant pg_cron to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule refresh of admin_daily_stats every hour at :00
SELECT cron.schedule(
  'admin_daily_stats_refresh',
  '0 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY admin_daily_stats'
);

-- Schedule refresh of admin_assessment_stats every hour at :05
SELECT cron.schedule(
  'admin_assessment_stats_refresh',
  '5 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY admin_assessment_stats'
);

-- Schedule refresh of admin_user_engagement_stats every hour at :10
SELECT cron.schedule(
  'admin_user_engagement_stats_refresh',
  '10 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY admin_user_engagement_stats'
);

-- Schedule refresh of admin_high_risk_alerts every hour at :15
SELECT cron.schedule(
  'admin_high_risk_alerts_refresh',
  '15 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY admin_high_risk_alerts'
);

-- Schedule refresh of admin_demographics_summary every 6 hours at :20
SELECT cron.schedule(
  'admin_demographics_summary_refresh',
  '20 */6 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY admin_demographics_summary'
);

-- Force refresh immediately to populate views with current data
REFRESH MATERIALIZED VIEW CONCURRENTLY admin_daily_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY admin_assessment_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY admin_user_engagement_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY admin_high_risk_alerts;
REFRESH MATERIALIZED VIEW CONCURRENTLY admin_demographics_summary;
