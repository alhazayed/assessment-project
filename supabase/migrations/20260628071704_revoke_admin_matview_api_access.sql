-- Revoke Data API (PostgREST) access to the admin_* materialized views.
--
-- These views aggregate sensitive data — admin_high_risk_alerts in particular
-- exposes patient names alongside high-risk scores. They had been granted full
-- privileges to the `anon` and `authenticated` roles, meaning any logged-in
-- (or even anonymous) client could read them directly via the Data API,
-- bypassing the admin console. Materialized views cannot enforce RLS, so the
-- only correct control is to remove the grant.
--
-- Admin features read these via the service-role key (the `service_role`
-- grant is left intact), so this has no effect on the admin dashboards.

revoke all on public.admin_daily_stats            from anon, authenticated;
revoke all on public.admin_assessment_stats       from anon, authenticated;
revoke all on public.admin_user_engagement_stats  from anon, authenticated;
revoke all on public.admin_high_risk_alerts       from anon, authenticated;
