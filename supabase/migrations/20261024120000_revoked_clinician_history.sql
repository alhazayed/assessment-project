-- ══════════════════════════════════════════════════════════
-- Revoked clinicians lose access to past messages and assignments
-- ══════════════════════════════════════════════════════════
-- Product decision (2026-10-24): once a patient revokes a clinician (or the
-- relationship otherwise ends), that clinician no longer sees the
-- conversation history or the assessment assignments they set for that
-- patient. The patient keeps seeing both.
--
-- Before this migration:
--   messages_read / messages_update let a clinician reach every message
--   where clinician_id = auth.uid(), whatever the relationship state.
--   assign_read let a clinician read any assignment they authored.
-- After: the clinician arm requires current access through
-- has_clinician_access(), the same check the write policies already use
-- (message_patient for messages, view_assessment_history for assignments).
-- Patients and admins are unchanged.

-- ── messages ──────────────────────────────────────────────
ALTER POLICY messages_read ON public.messages
  USING (
    (SELECT auth.uid()) = patient_id
    OR (
      (SELECT auth.uid()) = clinician_id
      AND public.has_clinician_access((SELECT auth.uid()), patient_id, 'message_patient')
    )
  );

ALTER POLICY messages_update ON public.messages
  USING (
    (
      (SELECT auth.uid()) = patient_id
      OR (
        (SELECT auth.uid()) = clinician_id
        AND public.has_clinician_access((SELECT auth.uid()), patient_id, 'message_patient')
      )
    )
    AND (SELECT auth.uid()) <> sender_id
  )
  WITH CHECK (
    (
      (SELECT auth.uid()) = patient_id
      OR (
        (SELECT auth.uid()) = clinician_id
        AND public.has_clinician_access((SELECT auth.uid()), patient_id, 'message_patient')
      )
    )
    AND (SELECT auth.uid()) <> sender_id
  );

-- ── assessment assignments ────────────────────────────────
ALTER POLICY assign_read ON public.assessment_assignments
  USING (
    (SELECT auth.uid()) = patient_id
    OR public.get_my_role() = ANY (ARRAY['admin', 'superadmin'])
    OR (
      public.get_my_role() = 'clinician'
      AND public.has_clinician_access((SELECT auth.uid()), patient_id, 'view_assessment_history')
    )
  );
