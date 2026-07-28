-- Re-allow anonymous (guest) assessment submissions.
--
-- The guest flow (POST /api/submit-assessment-guest) inserts an
-- assessment_submissions row with patient_id = NULL (plus guest_* demographic
-- columns). However, later constraint migrations
-- (20260624044327 / 20260627220200_assessment_submissions_constraints.sql) added
-- a NOT NULL constraint to patient_id, which makes every guest submission fail
-- with "null value in column patient_id violates not-null constraint".
--
-- Drop the NOT NULL so guest rows (patient_id IS NULL) are permitted again. The
-- foreign key (ON DELETE CASCADE) is retained, so authenticated submissions
-- still cascade-delete with their owner, and NULL is a valid FK value. RLS is
-- unaffected: the patient self-insert policy requires auth.uid() = patient_id,
-- so authenticated clients still cannot write a NULL-patient row — only the
-- server-side service-role guest endpoint can.
ALTER TABLE public.assessment_submissions
  ALTER COLUMN patient_id DROP NOT NULL;
