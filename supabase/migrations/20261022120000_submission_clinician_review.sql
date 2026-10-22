-- ============================================================
-- CLINICIAN REVIEW OF ASSESSMENT RESULTS
-- ============================================================
-- A verified clinician with access to the patient can confirm that they
-- reviewed a submission. The result page and PDFs then show
-- "Clinically reviewed by <name>, <title>" / "تمت مراجعة النتيجة بواسطة ...".
--
-- The reviewer's name and title are snapshotted from clinician_verifications
-- at confirmation time, so the line keeps naming who actually reviewed the
-- result even if the clinician later edits their profile.
--
-- The only write path is confirm_submission_review(). There is no UPDATE
-- policy on assessment_submissions, and the insert trigger below stops a
-- patient (or anyone inserting directly) from creating a pre-reviewed row.
-- ============================================================

ALTER TABLE public.assessment_submissions
  ADD COLUMN IF NOT EXISTS reviewed_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at    timestamptz,
  ADD COLUMN IF NOT EXISTS reviewer_name  text,
  ADD COLUMN IF NOT EXISTS reviewer_title text;

CREATE INDEX IF NOT EXISTS idx_assessment_submissions_reviewed_by
  ON public.assessment_submissions(reviewed_by);

-- ── New submissions always start unreviewed ───────────────
CREATE OR REPLACE FUNCTION public.submissions_clear_review_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.reviewed_by    := NULL;
  NEW.reviewed_at    := NULL;
  NEW.reviewer_name  := NULL;
  NEW.reviewer_title := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_submissions_clear_review_on_insert ON public.assessment_submissions;
CREATE TRIGGER trg_submissions_clear_review_on_insert
  BEFORE INSERT ON public.assessment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.submissions_clear_review_on_insert();

-- ── Prerequisite: only an admin can verify a clinician ───
-- confirm_submission_review() trusts clinician_verifications.status, so the
-- self-verification hole (audit B1) must be closed first. This block is copied
-- verbatim from 20261018120000 (PR #120); every statement is idempotent, so
-- whichever migration runs second is a no-op for it.
-- B1: clinician_verifications
-- Owners and admins may read. All writes go through the service role
-- (/api/clinician/verification and /api/admin/clinician-verifications), so
-- there is no end-user write rule at all. The trigger is a second lock in
-- case a write rule is ever added back.
-- ══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "cv_clinician_own" ON public.clinician_verifications;
DROP POLICY IF EXISTS "cv_owner_admin_read" ON public.clinician_verifications;
CREATE POLICY "cv_owner_admin_read"
  ON public.clinician_verifications FOR SELECT
  TO authenticated
  USING (
    clinician_id = (SELECT auth.uid())
    OR get_my_role() = ANY (ARRAY['admin', 'superadmin'])
  );

CREATE OR REPLACE FUNCTION public.guard_clinician_verification_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR coalesce(public.get_my_role() IN ('admin', 'superadmin'), false) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pending_verification'
       OR NEW.reviewed_by IS NOT NULL
       OR NEW.reviewed_at IS NOT NULL
       OR NEW.rejection_reason IS NOT NULL THEN
      RAISE EXCEPTION 'Only an administrator can review a clinician verification'
        USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.status           IS DISTINCT FROM OLD.status
     OR NEW.reviewed_by      IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at      IS DISTINCT FROM OLD.reviewed_at
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
     OR NEW.clinician_id     IS DISTINCT FROM OLD.clinician_id THEN
    RAISE EXCEPTION 'Only an administrator can review a clinician verification'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_clinician_verification_review() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_clinician_verification_review ON public.clinician_verifications;
CREATE TRIGGER trg_guard_clinician_verification_review
  BEFORE INSERT OR UPDATE ON public.clinician_verifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_clinician_verification_review();

-- ── Confirm a review ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.confirm_submission_review(p_submission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_patient_id uuid;
  v_reviewed   uuid;
  v_name       text;
  v_title      text;
  v_at         timestamptz := now();
BEGIN
  IF v_uid IS NULL OR public.get_my_role() <> 'clinician' THEN
    RAISE EXCEPTION 'Only clinicians can confirm a review' USING ERRCODE = '42501';
  END IF;

  SELECT cv.full_name, cv.professional_title
    INTO v_name, v_title
    FROM public.clinician_verifications cv
   WHERE cv.clinician_id = v_uid
     AND cv.status = 'verified'
     -- An admin must have approved it, which also rules out rows a clinician
     -- self-verified before the B1 fix above existed.
     AND EXISTS (
       SELECT 1 FROM public.profiles a
        WHERE a.id = cv.reviewed_by
          AND a.role IN ('admin', 'superadmin')
     );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clinician is not verified' USING ERRCODE = '42501';
  END IF;

  SELECT s.patient_id, s.reviewed_by
    INTO v_patient_id, v_reviewed
    FROM public.assessment_submissions s
   WHERE s.id = p_submission_id
   FOR UPDATE;
  IF NOT FOUND OR v_patient_id IS NULL
     OR NOT public.has_clinician_access(v_uid, v_patient_id, 'view_assessment_results') THEN
    RAISE EXCEPTION 'Submission not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_reviewed IS NOT NULL THEN
    RAISE EXCEPTION 'Submission already reviewed' USING ERRCODE = '23505';
  END IF;

  UPDATE public.assessment_submissions
     SET reviewed_by    = v_uid,
         reviewed_at    = v_at,
         reviewer_name  = v_name,
         reviewer_title = v_title
   WHERE id = p_submission_id;

  INSERT INTO public.audit_log (actor_id, action, target_type, target_id, details)
  VALUES (v_uid, 'submission_review_confirmed', 'assessment_submission', p_submission_id,
          jsonb_build_object('patient_id', v_patient_id));

  RETURN jsonb_build_object(
    'reviewed_at', v_at,
    'reviewer_name', v_name,
    'reviewer_title', v_title
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_submission_review(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_submission_review(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirm_submission_review(uuid) TO authenticated;
