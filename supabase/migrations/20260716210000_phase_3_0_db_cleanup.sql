-- ============================================================
-- Phase 3.0 — Database cleanup (duplicates / unused objects)
-- ============================================================
-- Scope (strict): remove duplicate triggers, one identical duplicate
-- messages SELECT RLS policy, and an unused helper function.
--
-- Explicitly OUT OF SCOPE:
--   * Application logic / API routes / UI
--   * Permission keys / relationship_permissions model
--   * Authentication behavior / handle_new_user / role escalation rules
--   * messages INSERT policies (msg_participant_insert is NOT touched)
--   * Authorization semantics of remaining policies (qual expressions unchanged)
--
-- Idempotent: DROP IF EXISTS only.

-- ────────────────────────────────────────────────────────────
-- 1. Duplicate profiles triggers
-- ────────────────────────────────────────────────────────────
-- Live inventory showed two pairs of BEFORE UPDATE triggers on
-- public.profiles that invoke the exact same functions:
--
--   prevent_role_escalation      → prevent_role_self_escalation()
--   trg_prevent_role_escalation  → prevent_role_self_escalation()
--
--   set_profiles_updated_at      → handle_updated_at()
--   trg_profiles_updated_at      → handle_updated_at()
--
-- Running both pairs means each function executes twice per UPDATE
-- (redundant work; no different security outcome). Canonical names
-- use the trg_ prefix (existing ops docs / Phase 1 matrix). Drop only
-- the non-canonical duplicates; keep the functions themselves.

DROP TRIGGER IF EXISTS prevent_role_escalation ON public.profiles;
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;

-- Retained (canonical):
--   trg_prevent_role_escalation  BEFORE UPDATE → prevent_role_self_escalation()
--   trg_profiles_updated_at      BEFORE UPDATE → handle_updated_at()

-- ────────────────────────────────────────────────────────────
-- 2. Duplicate messages SELECT RLS policy
-- ────────────────────────────────────────────────────────────
-- Three SELECT policies existed on public.messages:
--
--   messages_read:
--     (auth.uid() = patient_id OR auth.uid() = clinician_id)
--   msg_participant_read:
--     (patient_id = auth.uid() OR clinician_id = auth.uid())
--   msg_admin_read:
--     EXISTS (profiles.role IN ('admin','superadmin'))
--
-- messages_read and msg_participant_read are logically identical
-- (same participant predicate; operand order only). Postgres ORs
-- permissive policies, so the duplicate adds no access and only noise.
--
-- Keep: messages_read (baseline / Phase 2.1 family)
-- Keep: msg_admin_read (admin SELECT path)
-- Drop: msg_participant_read only
--
-- Do NOT drop msg_participant_insert — that is a different command and
-- is outside Phase 3.0 cleanup scope.

DROP POLICY IF EXISTS msg_participant_read ON public.messages;

-- ────────────────────────────────────────────────────────────
-- 3. Unused database function public.is_admin()
-- ────────────────────────────────────────────────────────────
-- Defined in the schema baseline as:
--   SELECT public.get_my_role() = ANY (ARRAY['admin','superadmin']);
--
-- Repository search found zero application / SQL callers outside the
-- baseline definition itself. RLS and app code use get_my_role() /
-- role checks directly. Removing an unused SECURITY-adjacent helper
-- reduces the attack surface and avoids accidental future misuse.

DROP FUNCTION IF EXISTS public.is_admin();

-- ============================================================
-- ROLLBACK (reference only — restores pre-cleanup duplicates)
-- ============================================================
-- BEGIN;
-- CREATE TRIGGER prevent_role_escalation
--   BEFORE UPDATE ON public.profiles
--   FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();
-- CREATE TRIGGER set_profiles_updated_at
--   BEFORE UPDATE ON public.profiles
--   FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
-- CREATE POLICY msg_participant_read ON public.messages FOR SELECT
--   TO authenticated
--   USING (
--     patient_id = (SELECT auth.uid())
--     OR clinician_id = (SELECT auth.uid())
--   );
-- CREATE OR REPLACE FUNCTION public.is_admin()
--   RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $$
--   SELECT public.get_my_role() = ANY (ARRAY['admin','superadmin']);
-- $$;
-- COMMIT;
