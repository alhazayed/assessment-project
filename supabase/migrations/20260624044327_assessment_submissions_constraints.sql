-- Before adding NOT NULL, verify no existing NULLs
-- (guest submissions use a separate table so this is safe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.assessment_submissions WHERE patient_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add NOT NULL: assessment_submissions has rows with NULL patient_id';
  END IF;
END $$;

-- Add NOT NULL constraint
ALTER TABLE public.assessment_submissions
  ALTER COLUMN patient_id SET NOT NULL;

-- Fix patient_id FK to cascade on patient deletion (GDPR: deleting a user deletes their PHI)
ALTER TABLE public.assessment_submissions
  DROP CONSTRAINT IF EXISTS assessment_submissions_patient_id_fkey;

ALTER TABLE public.assessment_submissions
  ADD CONSTRAINT assessment_submissions_patient_id_fkey
    FOREIGN KEY (patient_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

-- Fix assignment_id FK to SET NULL when assignment deleted (preserves historical results)
ALTER TABLE public.assessment_submissions
  DROP CONSTRAINT IF EXISTS assessment_submissions_assignment_id_fkey;

ALTER TABLE public.assessment_submissions
  ADD CONSTRAINT assessment_submissions_assignment_id_fkey
    FOREIGN KEY (assignment_id)
    REFERENCES public.assessment_assignments(id)
    ON DELETE SET NULL;
