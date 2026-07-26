-- Fix a pre-existing bug in get_patient_risk_profile(): the correlated
-- subqueries `SELECT COUNT(*) FROM admin_high_risk_alerts WHERE patient_id = ...`
-- left `patient_id` unqualified, which is ambiguous because the outer query also
-- exposes assessment_submissions.patient_id. Calling the RPC failed with
-- "column reference \"patient_id\" is ambiguous". Qualify the column.
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
    (SELECT COUNT(*) FROM admin_high_risk_alerts WHERE admin_high_risk_alerts.patient_id = p_patient_id)::bigint,
    aues.total_submissions,
    CASE WHEN aues.total_submissions > 0 THEN
      ROUND(((SELECT COUNT(*) FROM admin_high_risk_alerts WHERE admin_high_risk_alerts.patient_id = p_patient_id)::numeric / aues.total_submissions * 100), 1)
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

-- Preserve the hardened posture (admin RPCs are invoked via the service-role
-- key only; see 20260713152251_production_security_hardening).
REVOKE EXECUTE ON FUNCTION get_patient_risk_profile(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_patient_risk_profile(UUID) TO service_role;
