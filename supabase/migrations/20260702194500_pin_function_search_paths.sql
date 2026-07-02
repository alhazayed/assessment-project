-- SECURITY HARDENING: pin search_path on functions flagged by the Supabase
-- security advisor (lint 0011_function_search_path_mutable).
--
-- A mutable search_path on a SECURITY DEFINER / trigger function can let a caller
-- who controls their session search_path shadow built-in objects and influence
-- what the function resolves. Pinning to `public, pg_temp` removes that vector.
-- These are analytics/admin dashboard helpers and one trigger function; none
-- take user-controlled identifiers, so this is a low-risk, additive change.
--
-- Statements captured verbatim from the live function signatures.

ALTER FUNCTION public.get_admin_dashboard_stats(p_days integer)            SET search_path = public, pg_temp;
ALTER FUNCTION public.get_assessment_completion_funnel(p_days integer)      SET search_path = public, pg_temp;
ALTER FUNCTION public.get_assessment_performance_comparison(p_definition_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_demographics_breakdown(p_demographic_type text)   SET search_path = public, pg_temp;
ALTER FUNCTION public.get_high_risk_patients(p_limit integer)              SET search_path = public, pg_temp;
ALTER FUNCTION public.get_patient_risk_profile(p_patient_id uuid)           SET search_path = public, pg_temp;
ALTER FUNCTION public.get_top_assessments(p_limit integer)                 SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_engagement_metrics()                        SET search_path = public, pg_temp;
ALTER FUNCTION public.packages_set_updated_at()                            SET search_path = public, pg_temp;
