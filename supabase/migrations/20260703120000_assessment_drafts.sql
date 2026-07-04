-- Migration: In-progress assessment drafts (cross-device autosave)
-- Date: 2026-07-03
-- Purpose: Assessment progress was only persisted to browser localStorage, so
--          clearing site data, switching devices, or using a different browser
--          silently lost all in-progress answers with no recovery path. This
--          adds a server-side draft row per (patient, assessment) that the
--          client autosaves to, so progress survives beyond the local browser.

CREATE TABLE IF NOT EXISTS public.assessment_drafts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  definition_id uuid NOT NULL REFERENCES public.assessment_definitions(id) ON DELETE CASCADE,
  answers       jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_index integer NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, definition_id)
);

CREATE INDEX IF NOT EXISTS idx_assessment_drafts_patient
  ON public.assessment_drafts(patient_id);

ALTER TABLE public.assessment_drafts ENABLE ROW LEVEL SECURITY;

-- Drafts are private working data — only the owning patient may read/write
-- them (no clinician/admin visibility; they are not a clinical record).
DROP POLICY IF EXISTS assessment_drafts_owner ON public.assessment_drafts;
CREATE POLICY assessment_drafts_owner ON public.assessment_drafts FOR ALL
  USING ((SELECT auth.uid()) = patient_id)
  WITH CHECK ((SELECT auth.uid()) = patient_id);

-- Keep updated_at current on every upsert so the client can compare
-- server vs. local draft freshness.
CREATE OR REPLACE FUNCTION public.touch_assessment_draft_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assessment_drafts_touch ON public.assessment_drafts;
CREATE TRIGGER trg_assessment_drafts_touch
  BEFORE UPDATE ON public.assessment_drafts
  FOR EACH ROW EXECUTE FUNCTION public.touch_assessment_draft_updated_at();
