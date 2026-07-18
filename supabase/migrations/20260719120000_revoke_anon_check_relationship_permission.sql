-- =============================================================================
-- Production Hardening v1.0 — Phase 3: remove the anonymous authorization oracle
-- =============================================================================
-- check_relationship_permission(uuid,uuid,text) is a SECURITY DEFINER helper used
-- ONLY inside has_clinician_access() (itself SECURITY DEFINER, so the nested call
-- executes as the function owner regardless of the caller's grant). No RLS policy
-- and no application code calls it directly. Its anon EXECUTE grant therefore only
-- exposes a direct PostgREST RPC oracle (/rest/v1/rpc/check_relationship_permission)
-- that lets an UNAUTHENTICATED caller probe whether an active, granted relationship
-- exists between two given UUIDs (a metadata-existence leak).
--
-- Fix: revoke EXECUTE from PUBLIC + anon; retain authenticated + service_role.
--
-- SAFETY: get_my_role() intentionally KEEPS anon EXECUTE (RLS policies invoke it
-- during anonymous requests); it is NOT touched here. has_clinician_access() keeps
-- working because it runs as its definer, not as anon.
-- Idempotent; no data change; no authorization-logic change.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.check_relationship_permission(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_relationship_permission(uuid, uuid, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.check_relationship_permission(uuid, uuid, text) TO authenticated, service_role;
