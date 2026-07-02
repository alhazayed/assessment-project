-- FIX: assessment submission fails in production with "Failed to save results".
--
-- Root cause: app/api/submit-assessment/route.ts calls submit_assessment_atomic
-- through the service-role admin client (chosen so RLS/JWT-forwarding issues in
-- the route handler can't block a legitimate, already-authenticated submission).
-- The original function was incompatible with that trusted server-side path in
-- two ways:
--   1. EXECUTE was granted only to `authenticated`, not `service_role`.
--   2. It hard-required auth.uid() to be non-null and equal to p_patient_id.
--      Under the service role there is no end-user JWT, so auth.uid() is NULL and
--      the function raised 42501 ('Not authenticated') on every call.
--
-- Fix: keep full IDOR protection for direct authenticated PostgREST calls
-- (auth.uid() present → must equal p_patient_id), and allow the trusted
-- service-role path (auth.uid() NULL) since the API route has already
-- authenticated the user and passes p_patient_id = user.id. Also grant EXECUTE
-- to service_role. p_patient_id is still required (defense in depth).

CREATE OR REPLACE FUNCTION public.submit_assessment_atomic(
  p_patient_id       uuid,
  p_definition_id    uuid,
  p_total_score      integer,
  p_severity_band    text,
  p_high_risk_flag   boolean,
  p_is_self_initiated boolean,
  p_responses        jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_submission_id uuid;
  v_response      record;
BEGIN
  -- p_patient_id is mandatory regardless of caller.
  IF p_patient_id IS NULL THEN
    RAISE EXCEPTION 'patient_id is required' USING ERRCODE = '22004';
  END IF;

  -- IDOR protection for direct authenticated end-user calls: an authenticated
  -- caller may only submit for themselves. When auth.uid() IS NULL the caller is
  -- the trusted server (service role); the API route has already authenticated
  -- the user and set p_patient_id = user.id, so that path is permitted.
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_patient_id THEN
    RAISE EXCEPTION 'Forbidden: patient_id does not match authenticated user' USING ERRCODE = '42501';
  END IF;

  -- Insert submission row
  INSERT INTO public.assessment_submissions (
    patient_id,
    definition_id,
    total_score,
    severity_band,
    high_risk_flag,
    is_self_initiated
  ) VALUES (
    p_patient_id,
    p_definition_id,
    p_total_score,
    p_severity_band,
    p_high_risk_flag,
    p_is_self_initiated
  )
  RETURNING id INTO v_submission_id;

  -- Insert individual responses
  FOR v_response IN
    SELECT
      (r->>'item_id')::uuid           AS item_id,
      (r->>'response_value')::integer AS response_value,
      r->>'response_label_en'         AS response_label_en,
      r->>'response_label_ar'         AS response_label_ar
    FROM jsonb_array_elements(p_responses) AS r
  LOOP
    INSERT INTO public.assessment_responses (
      submission_id,
      item_id,
      response_value,
      response_label_en,
      response_label_ar
    ) VALUES (
      v_submission_id,
      v_response.item_id,
      v_response.response_value,
      v_response.response_label_en,
      v_response.response_label_ar
    );
  END LOOP;

  RETURN v_submission_id;
END;
$$;

-- Trusted server (API route) invokes this via the service role; grant EXECUTE.
REVOKE ALL ON FUNCTION public.submit_assessment_atomic(uuid, uuid, integer, text, boolean, boolean, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_assessment_atomic(uuid, uuid, integer, text, boolean, boolean, jsonb) TO authenticated, service_role;
