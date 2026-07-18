-- =============================================================================
-- PHASE 1 SECURITY REMEDIATION — Foundation for Objectives 3, 4 & 5
-- Clinician↔patient relationship helpers, backfill, and assignment sync.
-- =============================================================================
--
-- Objective 5 requires clinician access to be governed by
-- `clinician_patient_relationships` (an ACTIVE relationship) rather than the
-- legacy `profiles.assigned_clinician_id` pointer that current RLS trusts.
--
-- To restrict access to relationships WITHOUT losing current functionality this
-- migration:
--   1. Adds SECURITY DEFINER helper functions that RLS policies use to test for
--      an active relationship (SECURITY DEFINER avoids RLS recursion on the
--      relationships table and keeps policy expressions cheap/consistent).
--   2. Backfills an ACTIVE relationship (+ default granted permissions) for every
--      existing assigned_clinician_id pairing that has no relationship yet, so
--      clinicians retain access to their currently-assigned patients.
--   3. Installs a trigger so any FUTURE write to profiles.assigned_clinician_id
--      keeps the relationship model in sync automatically — no application change
--      needed, and no data path silently loses access.
--
-- Explicit patient decisions are respected: a relationship already in 'revoked'
-- status is never resurrected by backfill or the sync trigger.
-- =============================================================================

-- ── Helper: relationship_active(clinician, patient) ──────────────────────────
-- True iff an ACTIVE relationship exists for the (clinician, patient) pair.
CREATE OR REPLACE FUNCTION public.relationship_active(p_clinician uuid, p_patient uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinician_patient_relationships cpr
    WHERE cpr.clinician_id = p_clinician
      AND cpr.patient_id   = p_patient
      AND cpr.status       = 'active'
  );
$$;

-- ── Helper: clinician_can_access(patient) ────────────────────────────────────
-- Convenience wrapper: does the CURRENT user (as clinician) have an active
-- relationship with p_patient? Used in RLS policy USING/WITH CHECK clauses.
CREATE OR REPLACE FUNCTION public.clinician_can_access(p_patient uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.relationship_active(auth.uid(), p_patient);
$$;

REVOKE ALL ON FUNCTION public.relationship_active(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinician_can_access(uuid)     FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.relationship_active(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.clinician_can_access(uuid)     TO authenticated, service_role;

-- ── Backfill: assigned_clinician_id → active relationship ────────────────────
INSERT INTO public.clinician_patient_relationships
  (clinician_id, patient_id, status, initiated_by, requested_permissions, requested_at, responded_at)
SELECT
  p.assigned_clinician_id,
  p.id,
  'active',
  'clinician',
  '["view_profile","view_assessment_results","view_assessment_history","view_reports","view_progress_tracking","view_mood_tracking","message_patient","generate_clinical_notes"]'::jsonb,
  now(),
  now()
FROM public.profiles p
WHERE p.assigned_clinician_id IS NOT NULL
  AND p.assigned_clinician_id <> p.id
ON CONFLICT (clinician_id, patient_id) DO NOTHING; -- respect existing relationship status

-- ── Backfill: default granted permissions for relationships with none ────────
INSERT INTO public.relationship_permissions (relationship_id, permission_key, granted, granted_at)
SELECT cpr.id, k.key, true, now()
FROM public.clinician_patient_relationships cpr
CROSS JOIN (VALUES
  ('view_profile'),('view_assessment_results'),('view_assessment_history'),
  ('view_reports'),('view_progress_tracking'),('view_mood_tracking'),
  ('message_patient'),('generate_clinical_notes')
) AS k(key)
WHERE cpr.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.relationship_permissions rp WHERE rp.relationship_id = cpr.id
  )
ON CONFLICT (relationship_id, permission_key) DO NOTHING;

-- ── Sync trigger: keep relationships in step with assigned_clinician_id ───────
CREATE OR REPLACE FUNCTION public.sync_relationship_from_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rel_id uuid;
BEGIN
  IF NEW.assigned_clinician_id IS NULL OR NEW.assigned_clinician_id = NEW.id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.clinician_patient_relationships
    (clinician_id, patient_id, status, initiated_by, requested_permissions, requested_at, responded_at)
  VALUES (
    NEW.assigned_clinician_id, NEW.id, 'active', 'clinician',
    '["view_profile","view_assessment_results","view_assessment_history","view_reports","view_progress_tracking","view_mood_tracking","message_patient","generate_clinical_notes"]'::jsonb,
    now(), now()
  )
  ON CONFLICT (clinician_id, patient_id) DO UPDATE
    SET status = CASE
                   WHEN public.clinician_patient_relationships.status = 'revoked'
                     THEN 'revoked'                       -- never resurrect a revoked consent
                   ELSE 'active'
                 END,
        responded_at = COALESCE(public.clinician_patient_relationships.responded_at, now())
  RETURNING id INTO v_rel_id;

  INSERT INTO public.relationship_permissions (relationship_id, permission_key, granted, granted_at)
  SELECT v_rel_id, k.key, true, now()
  FROM (VALUES
    ('view_profile'),('view_assessment_results'),('view_assessment_history'),
    ('view_reports'),('view_progress_tracking'),('view_mood_tracking'),
    ('message_patient'),('generate_clinical_notes')
  ) AS k(key)
  ON CONFLICT (relationship_id, permission_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_relationship_on_assignment ON public.profiles;
CREATE TRIGGER sync_relationship_on_assignment
  AFTER INSERT OR UPDATE OF assigned_clinician_id ON public.profiles
  FOR EACH ROW
  WHEN (NEW.assigned_clinician_id IS NOT NULL)
  EXECUTE FUNCTION public.sync_relationship_from_assignment();
