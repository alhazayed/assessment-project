-- Security hardening: revoke anon EXECUTE on SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.check_relationship_permission(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_relationship_permission(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_relationship_permission(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_relationship_permission(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO service_role;
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