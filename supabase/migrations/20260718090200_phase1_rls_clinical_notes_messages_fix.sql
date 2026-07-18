-- =============================================================================
-- PHASE 1 SECURITY REMEDIATION — Objectives 3 & 4
-- Consolidate clinical_notes and messages RLS; remove overlapping policies.
-- =============================================================================
--
-- PROBLEM (before this migration):
--   Two policy sets coexist on each table — the schema baseline set
--   (20260619120000) and a later additive set (20260624190200) that never
--   dropped the baseline policies. Because permissive RLS policies are OR-ed,
--   the LOOSER policy always wins, silently widening access:
--
--   clinical_notes:
--     • baseline `notes_patient_read_nonprivate` = (patient_id = me AND is_private = false)
--       is OR-ed with `cn_patient_read` = (patient_id = me)  →  net: patient can
--       read their own PRIVATE clinician notes. Confidentiality breach.
--     • baseline `clinician_own_notes` (clinician_id = me AND patient assigned)
--       is OR-ed with `cn_clinician_own` (clinician_id = me, NO patient scope)  →
--       net: a clinician can read/write notes for ANY patient_id.
--
--   messages:
--     • baseline `messages_insert` (sender_id = me AND an assignment relationship
--       exists) is OR-ed with `msg_participant_insert` (patient_id = me OR
--       clinician_id = me — no sender check, no relationship)  →  net: a user can
--       insert messages into arbitrary conversations and forge the sender field.
--
-- FIX (this migration):
--   Drop every clinical_notes / messages policy from both sets and recreate a
--   single, minimal, correct set. Clinician authorization is expressed purely in
--   terms of an ACTIVE clinician_patient_relationship (Objective 5) via
--   public.relationship_active(); private clinician notes are hidden from
--   patients; message writes require the sender to be a participant AND an active
--   relationship to exist.
--
-- Functionality is preserved: the backfill + sync trigger (20260718090100)
-- guarantee every currently-assigned clinician has an active relationship.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- clinical_notes
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;

-- Drop EVERY existing policy on clinical_notes first. Because migration history
-- has drifted (some migrations were applied directly to the remote DB), we drop
-- dynamically so no unknown/overlapping policy can survive and re-widen access.
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'clinical_notes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.clinical_notes', p.policyname);
  END LOOP;
END $$;

-- (Explicit drops kept for documentation; the dynamic block above already ran.)
DROP POLICY IF EXISTS clinician_own_notes            ON public.clinical_notes; -- baseline
DROP POLICY IF EXISTS notes_admin_all                ON public.clinical_notes; -- baseline
DROP POLICY IF EXISTS notes_patient_read_nonprivate  ON public.clinical_notes; -- baseline
DROP POLICY IF EXISTS cn_clinician_own               ON public.clinical_notes; -- 20260624190200
DROP POLICY IF EXISTS cn_patient_read                ON public.clinical_notes; -- 20260624190200
DROP POLICY IF EXISTS cn_admin_read                  ON public.clinical_notes; -- 20260624190200

-- Clinician may read/write notes ONLY for patients they have an active
-- relationship with, and only as the authoring clinician.
CREATE POLICY cn_clinician_manage ON public.clinical_notes
  FOR ALL
  TO authenticated
  USING (
    clinician_id = (SELECT auth.uid())
    AND public.relationship_active((SELECT auth.uid()), patient_id)
  )
  WITH CHECK (
    clinician_id = (SELECT auth.uid())
    AND public.relationship_active((SELECT auth.uid()), patient_id)
  );

-- Patient may read only NON-private notes written for them.
CREATE POLICY cn_patient_read_nonprivate ON public.clinical_notes
  FOR SELECT
  TO authenticated
  USING (
    patient_id = (SELECT auth.uid())
    AND is_private = false
  );

-- Admins/superadmins have full access.
CREATE POLICY cn_admin_all ON public.clinical_notes
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- messages
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop EVERY existing policy on messages first (drift-safe, as above).
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', p.policyname);
  END LOOP;
END $$;

-- (Explicit drops kept for documentation; the dynamic block above already ran.)
DROP POLICY IF EXISTS messages_read          ON public.messages; -- baseline
DROP POLICY IF EXISTS messages_insert        ON public.messages; -- baseline
DROP POLICY IF EXISTS messages_update        ON public.messages; -- baseline
DROP POLICY IF EXISTS msg_participant_read   ON public.messages; -- 20260624190200
DROP POLICY IF EXISTS msg_participant_insert ON public.messages; -- 20260624190200
DROP POLICY IF EXISTS msg_admin_read         ON public.messages; -- 20260624190200

-- Read: the two participants of the conversation.
CREATE POLICY msg_participant_read ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    patient_id   = (SELECT auth.uid())
    OR clinician_id = (SELECT auth.uid())
  );

-- Read: admins/superadmins.
CREATE POLICY msg_admin_read ON public.messages
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Insert: sender must be a participant AND an active relationship must exist
-- between the conversation's patient and clinician.
CREATE POLICY msg_participant_insert ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND (SELECT auth.uid()) IN (patient_id, clinician_id)
    AND public.relationship_active(clinician_id, patient_id)
  );

-- Insert: admins/superadmins (e.g. system/service flows using a user context).
CREATE POLICY msg_admin_insert ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Update: only the sender, and only while the relationship is active.
CREATE POLICY msg_sender_update ON public.messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id = (SELECT auth.uid())
    AND public.relationship_active(clinician_id, patient_id)
  )
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND public.relationship_active(clinician_id, patient_id)
  );

-- Update: admins/superadmins.
CREATE POLICY msg_admin_update ON public.messages
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
