-- SECURITY HARDENING (re-apply): pin search_path on the 9 functions still
-- flagged by the Supabase security advisor (lint 0011_function_search_path_mutable).
--
-- Background: an earlier fix, 20260702194500_pin_function_search_paths.sql, contained
-- the correct ALTER statements but was versioned BEFORE migrations that had already
-- been applied to production (e.g. 20260704085517_assessment_drafts). Supabase's
-- migration runner only applies versions newer than the latest applied one, so the
-- older file was permanently skipped ("out-of-order" drift) and the functions on
-- production kept a mutable (null) search_path. This migration carries a current
-- timestamp so it is genuinely newer than production HEAD and will deploy.
--
-- A mutable search_path lets a caller who controls their session search_path shadow
-- built-in objects and influence what the function resolves. Pinning to
-- `public, pg_temp` removes that vector. All nine are analytics/admin-dashboard
-- helpers or a trigger function (SECURITY INVOKER); none take a user-controlled
-- identifier that alters resolution, so this is additive and cannot change behavior.

ALTER FUNCTION public.get_admin_dashboard_stats(p_days integer)                  SET search_path = public, pg_temp;
ALTER FUNCTION public.get_assessment_completion_funnel(p_days integer)           SET search_path = public, pg_temp;
ALTER FUNCTION public.get_assessment_performance_comparison(p_definition_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_demographics_breakdown(p_demographic_type text)        SET search_path = public, pg_temp;
ALTER FUNCTION public.get_high_risk_patients(p_limit integer)                    SET search_path = public, pg_temp;
ALTER FUNCTION public.get_patient_risk_profile(p_patient_id uuid)                SET search_path = public, pg_temp;
ALTER FUNCTION public.get_top_assessments(p_limit integer)                       SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_engagement_metrics()                             SET search_path = public, pg_temp;
ALTER FUNCTION public.packages_set_updated_at()                                 SET search_path = public, pg_temp;
