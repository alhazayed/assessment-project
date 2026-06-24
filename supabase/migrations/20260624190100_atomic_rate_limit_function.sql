-- Atomic rate limiting function.
-- Replaces the non-atomic SELECT count + INSERT pattern in lib/rate-limit.ts.
-- Uses pg_advisory_xact_lock to serialize concurrent requests for the same key.

CREATE OR REPLACE FUNCTION public.check_and_record_rate_limit(
  p_key         text,
  p_window_start timestamptz,
  p_limit       int
) RETURNS int
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  -- Serialize concurrent checks for the same rate-limit key within this transaction
  PERFORM pg_advisory_xact_lock(hashtext(p_key));

  SELECT COUNT(*) INTO v_count
  FROM public.rate_limit_log
  WHERE key = p_key
    AND created_at >= p_window_start;

  IF v_count < p_limit THEN
    INSERT INTO public.rate_limit_log(key) VALUES (p_key);
    RETURN v_count + 1; -- allowed; returns new hit count
  ELSE
    RETURN -1; -- denied
  END IF;
END;
$$;

-- Grant execute to service_role (used by admin client in lib/rate-limit.ts)
GRANT EXECUTE ON FUNCTION public.check_and_record_rate_limit(text, timestamptz, int)
  TO service_role;

-- Revoke from public/anon/authenticated — only callable via service_role
REVOKE EXECUTE ON FUNCTION public.check_and_record_rate_limit(text, timestamptz, int)
  FROM public, anon, authenticated;
