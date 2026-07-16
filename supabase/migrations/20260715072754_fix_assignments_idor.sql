-- Fix IDOR on assessment_assignments (Phase 1 security remediation).
--
-- Problem: the shipped `assign_read` SELECT policy granted EVERY clinician read
-- access to EVERY assignment row:
--
--   USING (auth.uid() = patient_id OR get_my_role() IN ('clinician','admin','superadmin'))
--
-- so any authenticated clinician could enumerate arbitrary patients' assignments
-- (an Insecure Direct Object Reference) regardless of whether they had any
-- treating relationship with that patient.
--
-- Fix: keep patient self-read and admin/superadmin read-all unchanged, but scope
-- clinician read to assignments they are actually connected to:
--   * rows they authored             (clinician_id = auth.uid()), OR
--   * their legacy-assigned patients (profiles.assigned_clinician_id), OR
--   * patients who granted an active consent relationship with the
--     `view_assessment_history` permission (check_relationship_permission()).
--
-- Only the SELECT policy is rewritten; the write policies
-- (assign_admin_write, assign_clinician_own_patients) are unchanged and remain
-- in force, so this migration cannot widen write access.

DROP POLICY IF EXISTS assign_read ON public.assessment_assignments;
CREATE POLICY assign_read ON public.assessment_assignments FOR SELECT
  USING (
    ((SELECT auth.uid()) = patient_id)
    OR (get_my_role() = ANY (ARRAY['admin', 'superadmin']))
    OR (
      get_my_role() = 'clinician'
      AND (
        clinician_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = assessment_assignments.patient_id
            AND p.assigned_clinician_id = (SELECT auth.uid())
        )
        OR public.check_relationship_permission((SELECT auth.uid()), patient_id, 'view_assessment_history')
      )
    )
  );
