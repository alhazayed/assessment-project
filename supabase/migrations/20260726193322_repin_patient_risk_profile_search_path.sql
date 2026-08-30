-- Re-pin the search_path on get_patient_risk_profile. 20260706085712 originally
-- pinned it, but 20260726120200 recreated the function with CREATE OR REPLACE,
-- which resets the setting. Restore the pin (matches every other admin RPC).
ALTER FUNCTION public.get_patient_risk_profile(p_patient_id uuid) SET search_path = public, pg_temp;
