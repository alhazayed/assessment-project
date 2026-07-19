REVOKE EXECUTE ON FUNCTION public.generate_patient_access_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_patient_access_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_patient_access_code() FROM authenticated;