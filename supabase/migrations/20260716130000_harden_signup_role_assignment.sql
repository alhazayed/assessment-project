-- ============================================================
-- F-0 remediation — never let a public signup self-assign a privileged role
-- ============================================================
-- Finding F-0 (Phase 2.3 audit): handle_new_user() set profiles.role from the
-- client-controlled signup metadata:
--     v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
-- Because supabase.auth.signUp({ options:{ data:{...} } }) writes directly into
-- auth.users.raw_user_meta_data, and profiles.role's CHECK permits
-- 'admin'/'superadmin', an anonymous attacker could sign up with
-- data:{ role:'superadmin' } and obtain full DB access through RLS
-- (get_my_role() = 'superadmin'). prevent_role_escalation only guards UPDATEs,
-- not this INSERT.
--
-- Fix: hard-clamp every self-signup to the least-privileged role. Only 'patient'
-- may be assigned at signup; any client-supplied role is ignored. Privileged
-- roles (clinician/admin/superadmin) are granted only later through the
-- admin-gated role-update path (app/api/admin/users), which is protected by the
-- prevent_role_escalation trigger.
--
-- Safety / no regression: verified that no legitimate flow depends on
-- signup-metadata role — the web and mobile register screens pass no role
-- (default was already 'patient'), and there is no auth.admin.createUser /
-- inviteUserByEmail path. Real signups are therefore unaffected; only malicious
-- role injection is neutralised. The rest of the function (patient_profiles
-- bootstrap, ON CONFLICT safety net) is preserved verbatim.
--
-- Idempotent (CREATE OR REPLACE). The existing trigger binding is unchanged.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- SECURITY (F-0): ignore any client-supplied role. A public signup can only
  -- ever create a 'patient'. Elevated roles must be granted through the
  -- admin-gated update path, never via self-controlled signup metadata.
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
  IF v_role IS DISTINCT FROM 'patient' THEN
    v_role := 'patient';
  END IF;

  INSERT INTO public.profiles (id, role, full_name_en)
  VALUES (NEW.id, v_role, COALESCE(NEW.raw_user_meta_data->>'full_name_en', ''))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.patient_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================
-- ROLLBACK (restores the prior, vulnerable behavior — for reference only)
-- ============================================================
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
-- DECLARE v_role text;
-- BEGIN
--   v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
--   INSERT INTO public.profiles (id, role, full_name_en)
--   VALUES (NEW.id, v_role, COALESCE(NEW.raw_user_meta_data->>'full_name_en', ''))
--   ON CONFLICT (id) DO NOTHING;
--   IF v_role = 'patient' THEN
--     INSERT INTO public.patient_profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
--   END IF;
--   RETURN NEW;
-- END; $$;
