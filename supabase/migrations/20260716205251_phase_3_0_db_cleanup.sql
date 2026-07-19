-- Phase 3.0 — Database cleanup (duplicates / unused objects)
-- Scope: remove duplicate triggers, one identical duplicate messages SELECT RLS policy, and unused is_admin().
-- Does NOT touch msg_participant_insert, permissions, or auth behavior.

DROP TRIGGER IF EXISTS prevent_role_escalation ON public.profiles;
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;

DROP POLICY IF EXISTS msg_participant_read ON public.messages;

DROP FUNCTION IF EXISTS public.is_admin();
