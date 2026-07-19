-- ============================================================
-- PHASE 2.1 — CONSOLIDATE CLINICIAN AUTHORIZATION
-- ============================================================
-- The platform carried two authorization models:
--   Legacy : profiles.assigned_clinician_id  (direct ownership)
--   Modern : clinician_patient_relationships + relationship_permissions
--            surfaced through check_relationship_permission()
--
-- This migration consolidates every clinician authorization decision onto a
-- single primitive — has_clinician_access() — WITHOUT removing the legacy
-- column and WITHOUT breaking any existing patient or clinician.
--
-- Design guarantees (why this is safe):
--   * has_clinician_access() = modern consent check OR the exact legacy
--     assigned_clinician_id condition. It is therefore a SUPERSET of the old
--     per-table `assigned_clinician_id = auth.uid()` checks: every access that
--     worked before still works (legacy arm), and consent-based access is now
--     also honoured (modern arm). Nothing is reduced.
--   * A backfill materialises an active relationship + full permission grants
--     from each assigned_clinician_id, so the modern model represents legacy
--     patients too — but the legacy arm remains as a permanent safety net, so
--     the system is correct even if the backfill is skipped or a NEW legacy
--     assignment appears later (no manual migration required).
--   * assigned_clinician_id is NOT dropped (rule: keep it until migration is
--     fully complete). Only authorization *decisions* are re-pointed.
--
-- This migration is idempotent (CREATE OR REPLACE / DROP..CREATE POLICY /
-- INSERT .. WHERE NOT EXISTS / ON CONFLICT DO NOTHING) and transaction-safe.

-- ══════════════════════════════════════════════════════════
-- 1. CENTRALIZED AUTHORIZATION PRIMITIVE
--    One function that every clinician authorization decision passes through.
-- ══════════════════════════════════════════════════════════
-- Why: eliminates duplicated ownership logic (Task 5) and gives one place to
-- reason about authorization. The legacy arm preserves backward compatibility
-- (Task 3): a patient with assigned_clinician_id but no relationship row still
-- authorizes. SECURITY DEFINER so it can read profiles/relationships regardless
-- of the caller's own RLS, exactly like check_relationship_permission().
CREATE OR REPLACE FUNCTION public.has_clinician_access(
  p_clinician_id uuid,
  p_patient_id   uuid,
  p_permission   text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Modern: active consent relationship granting the requested permission.
    public.check_relationship_permission(p_clinician_id, p_patient_id, p_permission)
    -- Legacy compatibility: direct assignment (full access, as before). Kept
    -- until assigned_clinician_id is fully retired in a later phase.
    OR EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = p_patient_id
        AND pr.assigned_clinician_id = p_clinician_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.has_clinician_access(uuid, uuid, text) TO authenticated;

-- ══════════════════════════════════════════════════════════
-- 2. BACKFILL — materialise relationships from assigned_clinician_id
--    (idempotent, transaction-safe, tagged for rollback)
-- ══════════════════════════════════════════════════════════
-- Why: converges the data onto the modern model so check_relationship_permission
-- succeeds for legacy patients (Task 4). Only creates a relationship where the
-- patient currently has NO relationship with that clinician, so it never
-- duplicates or overwrites a real consent decision. initiated_by='clinician'
-- (the assigning party); request_message tags the row so a rollback can target
-- exactly these backfilled records.
INSERT INTO public.clinician_patient_relationships
  (clinician_id, patient_id, status, initiated_by, request_message, requested_at, responded_at)
SELECT p.assigned_clinician_id, p.id, 'active', 'clinician',
       'legacy_assigned_clinician_backfill', now(), now()
FROM public.profiles p
WHERE p.assigned_clinician_id IS NOT NULL
  AND p.role = 'patient'
  AND NOT EXISTS (
    SELECT 1 FROM public.clinician_patient_relationships r
    WHERE r.clinician_id = p.assigned_clinician_id
      AND r.patient_id   = p.id
  )
ON CONFLICT (clinician_id, patient_id) DO NOTHING;

-- Grant the full standard permission set to every relationship that corresponds
-- to a current legacy assignment (covers rows just created above and any that
-- already existed for a legacy-assigned pair). This makes the modern permission
-- checks return true for legacy patients, matching the "full access" the
-- assigned clinician had under the legacy model. Idempotent via ON CONFLICT.
INSERT INTO public.relationship_permissions
  (relationship_id, permission_key, granted, granted_at)
SELECT r.id, k.key, true, now()
FROM public.clinician_patient_relationships r
JOIN public.profiles p
  ON p.id = r.patient_id
 AND p.assigned_clinician_id = r.clinician_id
CROSS JOIN (VALUES
  ('view_profile'), ('view_assessment_results'), ('view_assessment_history'),
  ('view_reports'), ('view_progress_tracking'), ('view_mood_tracking'),
  ('export_reports'), ('message_patient'), ('upload_documents'),
  ('generate_clinical_notes')
) AS k(key)
WHERE r.status = 'active'
ON CONFLICT (relationship_id, permission_key) DO NOTHING;

-- Rollback (documented, not executed):
--   DELETE FROM relationship_permissions rp USING clinician_patient_relationships r
--     WHERE rp.relationship_id = r.id AND r.request_message = 'legacy_assigned_clinician_backfill';
--   DELETE FROM clinician_patient_relationships
--     WHERE request_message = 'legacy_assigned_clinician_backfill';

-- ══════════════════════════════════════════════════════════
-- 3. RE-POINT RLS POLICIES ONTO has_clinician_access()
--    Each policy preserves its existing admin/patient arms verbatim and only
--    swaps the `assigned_clinician_id = auth.uid()` sub-clause for the shared
--    primitive. Because has_clinician_access() includes that exact legacy
--    condition, these rewrites are strictly non-reducing.
-- ══════════════════════════════════════════════════════════

-- assessment_submissions — clinician reads a patient's submissions.
DROP POLICY IF EXISTS submissions_clinician ON public.assessment_submissions;
CREATE POLICY submissions_clinician ON public.assessment_submissions FOR SELECT
  USING (
    (get_my_role() = ANY (ARRAY['admin','superadmin']))
    OR (
      get_my_role() = 'clinician'
      AND public.has_clinician_access((SELECT auth.uid()), assessment_submissions.patient_id, 'view_assessment_results')
    )
  );

-- assessment_responses — clinician reads answers of a patient's submission.
DROP POLICY IF EXISTS responses_clinician ON public.assessment_responses;
CREATE POLICY responses_clinician ON public.assessment_responses FOR SELECT
  USING (
    (get_my_role() = ANY (ARRAY['admin','superadmin']))
    OR (
      get_my_role() = 'clinician'
      AND EXISTS (
        SELECT 1 FROM public.assessment_submissions s
        WHERE s.id = assessment_responses.submission_id
          AND public.has_clinician_access((SELECT auth.uid()), s.patient_id, 'view_assessment_results')
      )
    )
  );

-- assessment_assignments — SELECT already consolidated in Phase 1; rewrite it
-- through the shared primitive (equivalent: consent OR legacy) plus the
-- assignment-authored arm. Clinician write policy re-pointed the same way.
DROP POLICY IF EXISTS assign_read ON public.assessment_assignments;
CREATE POLICY assign_read ON public.assessment_assignments FOR SELECT
  USING (
    ((SELECT auth.uid()) = patient_id)
    OR (get_my_role() = ANY (ARRAY['admin','superadmin']))
    OR (
      get_my_role() = 'clinician'
      AND (
        clinician_id = (SELECT auth.uid())
        OR public.has_clinician_access((SELECT auth.uid()), assessment_assignments.patient_id, 'view_assessment_history')
      )
    )
  );

DROP POLICY IF EXISTS assign_clinician_own_patients ON public.assessment_assignments;
CREATE POLICY assign_clinician_own_patients ON public.assessment_assignments FOR ALL
  USING (
    get_my_role() = 'clinician'
    AND (SELECT auth.uid()) = clinician_id
    AND public.has_clinician_access((SELECT auth.uid()), assessment_assignments.patient_id, 'view_assessment_history')
  )
  WITH CHECK (
    get_my_role() = 'clinician'
    AND (SELECT auth.uid()) = clinician_id
    AND public.has_clinician_access((SELECT auth.uid()), assessment_assignments.patient_id, 'view_assessment_history')
  );

-- clinical_notes — clinician creates/reads their own notes for a patient.
DROP POLICY IF EXISTS clinician_own_notes ON public.clinical_notes;
CREATE POLICY clinician_own_notes ON public.clinical_notes FOR ALL
  USING (
    (SELECT auth.uid()) = clinician_id
    AND (
      get_my_role() = ANY (ARRAY['admin','superadmin'])
      OR public.has_clinician_access((SELECT auth.uid()), clinical_notes.patient_id, 'generate_clinical_notes')
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = clinician_id
    AND (
      get_my_role() = ANY (ARRAY['admin','superadmin'])
      OR public.has_clinician_access((SELECT auth.uid()), clinical_notes.patient_id, 'generate_clinical_notes')
    )
  );

-- messages — patient↔clinician send/edit. Both directional arms re-pointed to
-- the shared primitive keyed on message_patient.
DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = sender_id
    AND (
      ((SELECT auth.uid()) = patient_id
        AND public.has_clinician_access(messages.clinician_id, (SELECT auth.uid()), 'message_patient'))
      OR ((SELECT auth.uid()) = clinician_id
        AND public.has_clinician_access((SELECT auth.uid()), messages.patient_id, 'message_patient'))
      OR get_my_role() = ANY (ARRAY['admin','superadmin'])
    )
  );

DROP POLICY IF EXISTS messages_update ON public.messages;
CREATE POLICY messages_update ON public.messages FOR UPDATE
  USING ((SELECT auth.uid()) = sender_id)
  WITH CHECK (
    (SELECT auth.uid()) = sender_id
    AND (
      ((SELECT auth.uid()) = patient_id
        AND public.has_clinician_access(messages.clinician_id, (SELECT auth.uid()), 'message_patient'))
      OR ((SELECT auth.uid()) = clinician_id
        AND public.has_clinician_access((SELECT auth.uid()), messages.patient_id, 'message_patient'))
      OR get_my_role() = ANY (ARRAY['admin','superadmin'])
    )
  );

-- mood_logs — clinician reads a patient's mood tracking.
DROP POLICY IF EXISTS mood_clinician ON public.mood_logs;
CREATE POLICY mood_clinician ON public.mood_logs FOR SELECT
  USING (
    (get_my_role() = ANY (ARRAY['admin','superadmin']))
    OR (
      get_my_role() = 'clinician'
      AND public.has_clinician_access((SELECT auth.uid()), mood_logs.patient_id, 'view_mood_tracking')
    )
  );

-- user_consents — clinician reads a patient's consent records.
DROP POLICY IF EXISTS user_consents_clinician_read ON public.user_consents;
CREATE POLICY user_consents_clinician_read ON public.user_consents FOR SELECT
  USING (
    get_my_role() = 'clinician'
    AND public.has_clinician_access((SELECT auth.uid()), user_consents.user_id, 'view_profile')
  );
