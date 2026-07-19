-- =====================================================================
-- Security hardening: revoke anon EXECUTE on SECURITY DEFINER helpers
-- that should never be callable without a signed-in session.
--
-- Supabase advisors (2026-07-19):
--   - public.check_relationship_permission(...) callable by anon
--     → relationship-existence oracle (metadata leak)
--   - public.get_my_role() callable by anon
--     → harmless (returns null) but unnecessary public surface
--
-- Intentionally left executable by authenticated:
--   - has_clinician_access / submit_assessment_atomic (RLS helpers / guarded RPC)
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.check_relationship_permission(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM anon;

-- Defense in depth: also revoke from PUBLIC so future role grants do not
-- re-expose these via PUBLIC inheritance.
REVOKE EXECUTE ON FUNCTION public.check_relationship_permission(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC;

-- Re-grant authenticated (and service_role) explicitly after PUBLIC revoke.
GRANT EXECUTE ON FUNCTION public.check_relationship_permission(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_relationship_permission(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO service_role;

-- Post-flight assertions
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.check_relationship_permission(uuid,uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon still has EXECUTE on check_relationship_permission';
  END IF;
  IF has_function_privilege('anon', 'public.get_my_role()', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon still has EXECUTE on get_my_role';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.get_my_role()', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated lost EXECUTE on get_my_role';
  END IF;
END $$;
