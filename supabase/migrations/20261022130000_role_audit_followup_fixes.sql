-- ============================================================
-- Role access audit 2026-10-15: follow-up fixes outside B1–B7
-- ============================================================
-- 1. audit_log is append-only. Rows can no longer be edited or deleted by
--    anyone except the 365-day retention purge, and erasing a user keeps
--    their audit history (actor_id becomes NULL instead of the rows going).
-- 2. End users can only write two self-reported audit actions.
-- 3. Clinician invitations and clinician–patient relationships are written
--    only by the server (every app write already uses the service role), so
--    a clinician can't create an "active" link without consent, a patient
--    can't forge an invitation or re-point a relationship, and an accepted
--    invite can't be reset and reused.
-- 4. Message read receipts work for the recipient; message bodies can't be
--    edited after sending.
-- 5. Patients can't write their own package results.
-- 6. Patient access codes come from a cryptographic RNG with ~50 bits.
--
-- Existing permissive policies are kept and narrowed with RESTRICTIVE ones
-- so this migration applies cleanly before or after
-- 20261018120000_launch_blocker_access_fixes.sql, which ALTERs some of them.
-- ============================================================


-- ══════════════════════════════════════════════════════════
-- 1. audit_log: append-only, kept when a user is erased
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.audit_log ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_actor_id_fkey;
ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.guard_audit_log_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- The retention purge sets this flag for its own transaction only.
  IF current_setting('vw.audit_purge', true) = 'on' THEN
    RETURN COALESCE(OLD, NEW);
  END IF;

  -- Erasing a user nulls actor_id through the foreign key; allow exactly that.
  IF TG_OP = 'UPDATE'
     AND NEW.actor_id IS NULL
     AND OLD.actor_id IS NOT NULL
     AND (to_jsonb(NEW) - 'actor_id') = (to_jsonb(OLD) - 'actor_id') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'audit_log is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_log_append_only ON public.audit_log;
CREATE TRIGGER trg_audit_log_append_only
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.guard_audit_log_append_only();

-- Retention purge: superadmin route only (service role), never newer than
-- 365 days. Records itself in the log it purges.
CREATE OR REPLACE FUNCTION public.purge_audit_log_before(p_before timestamptz, p_actor uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  n integer;
BEGIN
  IF p_before IS NULL OR p_before > now() - interval '365 days' THEN
    RAISE EXCEPTION 'Audit entries can only be purged once they are older than 365 days';
  END IF;

  PERFORM set_config('vw.audit_purge', 'on', true);
  DELETE FROM public.audit_log WHERE created_at < p_before;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('vw.audit_purge', 'off', true);

  INSERT INTO public.audit_log (actor_id, action, target_type, details)
  VALUES (p_actor, 'audit_log_purged', 'audit_log',
          jsonb_build_object('before', p_before, 'deleted', n));
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_audit_log_before(timestamptz, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_audit_log_before(timestamptz, uuid) TO service_role;

-- Erasure keeps the audit trail: the foreign key now nulls actor_id.
CREATE OR REPLACE FUNCTION admin_hard_delete_user(target uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
begin
  -- Assessment data: responses are keyed by submission_id, not patient_id.
  delete from assessment_responses where submission_id in (
    select id from assessment_submissions where patient_id = target
  );
  delete from assessment_submissions where patient_id = target;
  delete from assessment_assignments where patient_id = target or clinician_id = target;

  -- Patient self-tracked data.
  delete from mood_logs where patient_id = target;
  delete from journal_entries where patient_id = target;
  delete from gratitude_entries where patient_id = target;
  update medication_alerts set acknowledged_by = null where acknowledged_by = target;
  delete from medication_alerts where patient_id = target;
  delete from medications where patient_id = target;
  delete from ai_insights where patient_id = target;
  delete from chat_sessions where patient_id = target;
  delete from session_notes where patient_id = target;
  delete from personality_results where patient_id = target;
  delete from wellness_plans where patient_id = target;
  delete from pdf_reports where patient_id = target or generated_by = target;

  -- Communications & notifications.
  delete from messages where sender_id = target or patient_id = target or clinician_id = target;
  delete from clinical_notes where patient_id = target or clinician_id = target;
  delete from notification_log where recipient_id = target;
  delete from notifications where user_id = target;
  update notification_events set sender_id = null where sender_id = target;
  delete from notification_events where recipient_id = target;
  delete from dismissed_announcements where user_id = target;
  delete from push_tokens where user_id = target;

  -- Clinician relationships / verification.
  update clinician_verifications set reviewed_by = null where reviewed_by = target;
  delete from clinician_verifications where clinician_id = target;
  delete from patient_access_codes where patient_id = target;
  update clinician_invitations set patient_id = null where patient_id = target;
  delete from clinician_invitations where clinician_id = target;
  update clinician_patient_relationships set revoked_by = null where revoked_by = target;
  delete from clinician_patient_relationships where clinician_id = target or patient_id = target;
  update relationship_permissions set modified_by = null where modified_by = target;

  -- Consent ledger (immutable while the user exists; removed on full erasure).
  update user_consents set recorded_by = null where recorded_by = target;
  delete from user_consents where user_id = target;

  -- Payments & packages (child → parent order).
  delete from purchased_package_results where user_id = target;
  delete from package_purchases where user_id = target;
  delete from package_results where user_id = target;
  delete from promo_code_usage where user_id = target;
  delete from payments where user_id = target;

  -- ADHD check-ins.
  delete from adhd_zone_checkins where user_id = target;

  -- Audit entries are kept; audit_log.actor_id is set to NULL by the FK.

  -- patient_profiles / clinician_profiles cascade from profiles; delete profile.
  delete from profiles where id = target;
end;
$$;

REVOKE EXECUTE ON FUNCTION admin_hard_delete_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_hard_delete_user(uuid) TO service_role;


-- ══════════════════════════════════════════════════════════
-- 2. End users may only self-report two audit actions
--    (profile page and assessment consent write these from the browser;
--    every other audit row is written by the server).
-- ══════════════════════════════════════════════════════════
ALTER POLICY audit_self_insert ON public.audit_log
  WITH CHECK (
    (SELECT auth.uid()) = actor_id
    AND action = ANY (ARRAY['profile_updated', 'consent_given'])
  );


-- ══════════════════════════════════════════════════════════
-- 3. Invitations and relationships: server-only writes
-- ══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS ci_no_end_user_insert ON public.clinician_invitations;
DROP POLICY IF EXISTS ci_no_end_user_update ON public.clinician_invitations;
DROP POLICY IF EXISTS ci_no_end_user_delete ON public.clinician_invitations;
CREATE POLICY ci_no_end_user_insert ON public.clinician_invitations
  AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY ci_no_end_user_update ON public.clinician_invitations
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY ci_no_end_user_delete ON public.clinician_invitations
  AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

DROP POLICY IF EXISTS cpr_no_end_user_insert ON public.clinician_patient_relationships;
DROP POLICY IF EXISTS cpr_no_end_user_update ON public.clinician_patient_relationships;
DROP POLICY IF EXISTS cpr_no_end_user_delete ON public.clinician_patient_relationships;
CREATE POLICY cpr_no_end_user_insert ON public.clinician_patient_relationships
  AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY cpr_no_end_user_update ON public.clinician_patient_relationships
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY cpr_no_end_user_delete ON public.clinician_patient_relationships
  AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

-- A relationship's parties never change after it is created, even for the
-- server, so a bug can't silently move consent to another person. (A revoked
-- link may be re-opened by a new request, so status and initiated_by can move.)
CREATE OR REPLACE FUNCTION public.guard_relationship_parties()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.clinician_id IS DISTINCT FROM OLD.clinician_id
     OR NEW.patient_id IS DISTINCT FROM OLD.patient_id THEN
    RAISE EXCEPTION 'A relationship''s clinician and patient cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_relationship_parties ON public.clinician_patient_relationships;
CREATE TRIGGER trg_guard_relationship_parties
  BEFORE UPDATE ON public.clinician_patient_relationships
  FOR EACH ROW EXECUTE FUNCTION public.guard_relationship_parties();


-- ══════════════════════════════════════════════════════════
-- 4. Messages: recipient can mark read; nobody edits a sent message
-- ══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS messages_update ON public.messages;
CREATE POLICY messages_update ON public.messages FOR UPDATE
  USING ((SELECT auth.uid()) IN (patient_id, clinician_id) AND (SELECT auth.uid()) <> sender_id)
  WITH CHECK ((SELECT auth.uid()) IN (patient_id, clinician_id) AND (SELECT auth.uid()) <> sender_id);

CREATE OR REPLACE FUNCTION public.guard_message_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Server (service role / SQL editor) is unrestricted.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - 'read_at') IS DISTINCT FROM (to_jsonb(OLD) - 'read_at') THEN
    RAISE EXCEPTION 'Only read_at can be changed on a message';
  END IF;
  IF OLD.read_at IS NOT NULL AND NEW.read_at IS DISTINCT FROM OLD.read_at THEN
    RAISE EXCEPTION 'A message can only be marked read once';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_message_update ON public.messages;
CREATE TRIGGER trg_guard_message_update
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_message_update();


-- ══════════════════════════════════════════════════════════
-- 5. Package results are computed and written by the server only
-- ══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS package_results_no_end_user_insert ON public.package_results;
DROP POLICY IF EXISTS package_results_no_end_user_update ON public.package_results;
CREATE POLICY package_results_no_end_user_insert ON public.package_results
  AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY package_results_no_end_user_update ON public.package_results
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);


-- ══════════════════════════════════════════════════════════
-- 6. Patient access codes: CSPRNG, V + 10 chars from a 32-symbol alphabet
--    (~50 bits). Existing codes keep working.
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.generate_patient_access_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  chars    text    := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no I, O, 0, 1
  new_code text;
  bytes    bytea;
  attempts integer := 0;
BEGIN
  LOOP
    bytes := gen_random_bytes(10);
    new_code := 'V';
    FOR i IN 0..9 LOOP
      new_code := new_code || substr(chars, (get_byte(bytes, i) % 32) + 1, 1);
    END LOOP;

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.patient_access_codes WHERE code = new_code
    );

    attempts := attempts + 1;
    IF attempts > 20 THEN
      RAISE EXCEPTION 'generate_patient_access_code: failed after 20 attempts';
    END IF;
  END LOOP;

  RETURN new_code;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_patient_access_code() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_patient_access_code() TO service_role;
