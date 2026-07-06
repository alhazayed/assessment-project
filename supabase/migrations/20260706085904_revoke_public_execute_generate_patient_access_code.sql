-- SECURITY HARDENING: remove direct REST/RPC access to generate_patient_access_code().
--
-- Advisor lint 0028/0029 flagged this SECURITY DEFINER function as executable by the
-- `anon` and `authenticated` roles via /rest/v1/rpc/generate_patient_access_code.
--
-- The only legitimate caller is the server route app/api/patient/code/route.ts, which
-- invokes it through the SERVICE ROLE client (createAdminClient). service_role bypasses
-- these grants, so revoking EXECUTE from PUBLIC/anon/authenticated does not affect the
-- real code path — it only removes the ability for a signed-in (or anonymous) user to
-- call the generator directly over the REST API and burn access-code space or probe it.
--
-- get_my_role() and check_relationship_permission() are intentionally left executable by
-- `authenticated`: both are referenced inside RLS policies, so the querying role must
-- retain EXECUTE for those policies to evaluate. They are SECURITY DEFINER by design.

REVOKE EXECUTE ON FUNCTION public.generate_patient_access_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_patient_access_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_patient_access_code() FROM authenticated;
