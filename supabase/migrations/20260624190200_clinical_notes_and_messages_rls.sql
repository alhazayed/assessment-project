-- Enable RLS on clinical_notes and messages tables.
-- Application-level guards exist in route.ts but DB-layer enforcement is absent.

-- ── clinical_notes ─────────────────────────────────────────────────
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;

-- Clinician reads/writes only their own authored notes
CREATE POLICY "cn_clinician_own"
  ON public.clinical_notes
  FOR ALL
  TO authenticated
  USING (clinician_id = (SELECT auth.uid()))
  WITH CHECK (clinician_id = (SELECT auth.uid()));

-- Patient can read notes written for them (view-only)
CREATE POLICY "cn_patient_read"
  ON public.clinical_notes
  FOR SELECT
  TO authenticated
  USING (patient_id = (SELECT auth.uid()));

-- Admins and superadmins can read all notes
CREATE POLICY "cn_admin_read"
  ON public.clinical_notes
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'superadmin')
  ));

-- ── messages ───────────────────────────────────────────────────────
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Patient or clinician in the conversation can read
CREATE POLICY "msg_participant_read"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    patient_id  = (SELECT auth.uid())
    OR clinician_id = (SELECT auth.uid())
  );

-- Sender inserts — must be a participant
CREATE POLICY "msg_participant_insert"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id  = (SELECT auth.uid())
    OR clinician_id = (SELECT auth.uid())
  );

-- Admins can read all messages
CREATE POLICY "msg_admin_read"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'superadmin')
  ));
