-- Atomic assessment submission function.
-- Inserts submission + all responses in a single transaction so partial
-- writes are impossible. Validates that the caller is authenticated and
-- that the provided patient_id matches the authenticated user to prevent
-- horizontal privilege escalation (IDOR).

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
  -- Enforce authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Prevent IDOR: caller may only submit for themselves
  IF auth.uid() <> p_patient_id THEN
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
      (r->>'item_id')::uuid          AS item_id,
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

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.submit_assessment_atomic(uuid, uuid, integer, text, boolean, boolean, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_assessment_atomic(uuid, uuid, integer, text, boolean, boolean, jsonb) TO authenticated;
