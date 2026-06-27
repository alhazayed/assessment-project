-- Add missing indexes for foreign keys and common queries on assessment_submissions

-- Index on assignment_id (used for filtering submitted-for-assignment)
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_assignment_id
  ON public.assessment_submissions(assignment_id)
  WHERE assignment_id IS NOT NULL;

-- Index on patient_id + submitted_at (used for user's result history)
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_patient_submitted
  ON public.assessment_submissions(patient_id, submitted_at DESC);

-- Index on definition_id (used for filtering by assessment type)
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_definition_id
  ON public.assessment_submissions(definition_id);

-- Index on high_risk_flag (used for flagging high-risk submissions)
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_high_risk
  ON public.assessment_submissions(high_risk_flag)
  WHERE high_risk_flag = true;
