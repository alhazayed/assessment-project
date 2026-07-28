-- Harden role governance to close two privilege-escalation paths that were
-- reachable via a direct authenticated PostgREST call (bypassing the app API):
--   1. Any `admin` could set their own (or anyone's) role to `superadmin`.
--   2. Any `admin` could demote or deactivate a `superadmin`.
--
-- The previous prevent_role_self_escalation() only blocked NON-admins from
-- changing roles, so an `admin` JWT could `UPDATE profiles SET role='superadmin'`
-- directly. This rewrite enforces, in the BEFORE UPDATE trigger:
--   * Non-admins still cannot change any role.
--   * Granting/revoking/altering a privileged role (admin/superadmin on either
--     the old or new value) requires the caller to be a superadmin.
--   * A superadmin account can only be modified (role or is_active) by a
--     superadmin.
--
-- All checks are NULL-safe: service-role calls (the app's admin APIs via
-- createAdminClient) have no auth.uid(), so get_my_role() returns NULL and these
-- checks do not fire — those paths are authorized in the API layer instead
-- (see app/api/admin/users PATCH, which also enforces a target-role guard).
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  caller_role text := public.get_my_role();
BEGIN
  -- Non-admins cannot change roles at all.
  IF NEW.role IS DISTINCT FROM OLD.role
     AND caller_role IS NOT NULL
     AND caller_role NOT IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;

  -- Only a superadmin may grant, revoke, or alter a privileged (admin/superadmin)
  -- role. This blocks an `admin` from escalating anyone (incl. themselves) to
  -- admin/superadmin, or demoting an admin/superadmin.
  IF NEW.role IS DISTINCT FROM OLD.role
     AND (NEW.role IN ('admin', 'superadmin') OR OLD.role IN ('admin', 'superadmin'))
     AND caller_role IN ('admin', 'clinician', 'patient') THEN
    RAISE EXCEPTION 'Only a superadmin can grant or modify admin/superadmin roles';
  END IF;

  -- A superadmin account may only be modified (role or activation) by a superadmin.
  -- Blocks an `admin` from deactivating a superadmin via a direct profile update.
  IF OLD.role = 'superadmin'
     AND caller_role IN ('admin', 'clinician', 'patient')
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
    RAISE EXCEPTION 'Only a superadmin can modify a superadmin account';
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure the trigger is actually bound to profiles. On production the trigger
-- (trg_prevent_role_escalation) exists but pointed at the OLD, permissive
-- function; on a fresh rebuild it does NOT exist at all (the baseline created
-- `prevent_role_escalation`, which 20260717224016 then dropped in favour of the
-- out-of-band `trg_prevent_role_escalation`). Recreate it deterministically so
-- every environment enforces the guard.
DROP TRIGGER IF EXISTS prevent_role_escalation ON public.profiles;
DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();
