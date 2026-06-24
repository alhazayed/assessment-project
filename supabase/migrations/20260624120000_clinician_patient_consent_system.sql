-- ============================================================
-- CLINICIAN-PATIENT CONSENT & SECURE COLLABORATION SYSTEM
-- ============================================================
-- Adds: clinician verifications, patient access codes,
--       consent-based relationships, granular permissions,
--       clinician invitations, notification events.
-- All tables use RLS. No existing tables are altered (except
-- audit_log gets a details jsonb column).
-- ============================================================

-- ── Add details column to audit_log ───────────────────────
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS details jsonb;

-- ══════════════════════════════════════════════════════════
-- 1. CLINICIAN VERIFICATIONS
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.clinician_verifications (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinician_id      uuid        NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name         text        NOT NULL,
  professional_title text       NOT NULL,
  license_number    text        NOT NULL,
  country           text        NOT NULL,
  specialty         text        NOT NULL,
  organization      text        NOT NULL,
  document_urls     jsonb       NOT NULL DEFAULT '[]',
  status            text        NOT NULL DEFAULT 'pending_verification'
                                CHECK (status IN ('pending_verification','verified','rejected','suspended')),
  reviewed_by       uuid        REFERENCES public.profiles(id),
  reviewed_at       timestamptz,
  rejection_reason  text,
  submitted_at      timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinician_verif_clinician ON public.clinician_verifications(clinician_id);
CREATE INDEX IF NOT EXISTS idx_clinician_verif_status    ON public.clinician_verifications(status);

ALTER TABLE public.clinician_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cv_clinician_own"
  ON public.clinician_verifications FOR ALL
  USING (
    clinician_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
  );

-- ══════════════════════════════════════════════════════════
-- 2. PATIENT ACCESS CODES
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.patient_access_codes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code         text        NOT NULL UNIQUE,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

-- Enforce only one active code per patient
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_code_per_patient
  ON public.patient_access_codes(patient_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_pac_patient ON public.patient_access_codes(patient_id);
CREATE INDEX IF NOT EXISTS idx_pac_code    ON public.patient_access_codes(code) WHERE is_active = true;

ALTER TABLE public.patient_access_codes ENABLE ROW LEVEL SECURITY;

-- Patient sees only their own code
CREATE POLICY "pac_patient_read"
  ON public.patient_access_codes FOR SELECT
  USING (
    patient_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
  );

-- ══════════════════════════════════════════════════════════
-- 3. CLINICIAN INVITATIONS  (clinician → patient link)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.clinician_invitations (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinician_id          uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token                 text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  message               text,
  patient_id            uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  status                text        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending','accepted','expired','cancelled')),
  requested_permissions jsonb       NOT NULL DEFAULT '["view_profile","view_assessment_results","message_patient"]',
  created_at            timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_at           timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ci_clinician ON public.clinician_invitations(clinician_id);
CREATE INDEX IF NOT EXISTS idx_ci_token     ON public.clinician_invitations(token);
CREATE INDEX IF NOT EXISTS idx_ci_status    ON public.clinician_invitations(status);

ALTER TABLE public.clinician_invitations ENABLE ROW LEVEL SECURITY;

-- Clinician manages their own; patient sees after acceptance
CREATE POLICY "ci_parties_access"
  ON public.clinician_invitations FOR ALL
  USING (
    clinician_id = auth.uid()
    OR patient_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
  );

-- ══════════════════════════════════════════════════════════
-- 4. CLINICIAN-PATIENT RELATIONSHIPS
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.clinician_patient_relationships (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinician_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status            text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','active','rejected','revoked','expired')),
  initiated_by      text        NOT NULL CHECK (initiated_by IN ('clinician','patient')),
  request_message   text,
  patient_code_used text,
  invitation_id     uuid        REFERENCES public.clinician_invitations(id) ON DELETE SET NULL,
  requested_permissions jsonb   NOT NULL DEFAULT '["view_profile","view_assessment_results","message_patient"]',
  requested_at      timestamptz NOT NULL DEFAULT now(),
  responded_at      timestamptz,
  revoked_at        timestamptz,
  revoked_by        uuid        REFERENCES public.profiles(id),
  last_access_at    timestamptz,
  UNIQUE(clinician_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_cpr_clinician ON public.clinician_patient_relationships(clinician_id);
CREATE INDEX IF NOT EXISTS idx_cpr_patient   ON public.clinician_patient_relationships(patient_id);
CREATE INDEX IF NOT EXISTS idx_cpr_status    ON public.clinician_patient_relationships(status);

ALTER TABLE public.clinician_patient_relationships ENABLE ROW LEVEL SECURITY;

-- Both parties and admins can read their relationships
CREATE POLICY "cpr_parties_read"
  ON public.clinician_patient_relationships FOR SELECT
  USING (
    clinician_id = auth.uid()
    OR patient_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
  );

-- Only verified clinicians can create an access request
CREATE POLICY "cpr_clinician_insert"
  ON public.clinician_patient_relationships FOR INSERT
  WITH CHECK (
    clinician_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.clinician_verifications cv
      WHERE cv.clinician_id = auth.uid() AND cv.status = 'verified'
    )
  );

-- Patient approves/rejects/revokes; admin can also update
CREATE POLICY "cpr_patient_update"
  ON public.clinician_patient_relationships FOR UPDATE
  USING (
    patient_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
  );

-- ══════════════════════════════════════════════════════════
-- 5. RELATIONSHIP PERMISSIONS
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.relationship_permissions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid        NOT NULL REFERENCES public.clinician_patient_relationships(id) ON DELETE CASCADE,
  permission_key  text        NOT NULL CHECK (permission_key IN (
                                'view_profile',
                                'view_assessment_results',
                                'view_assessment_history',
                                'view_reports',
                                'view_progress_tracking',
                                'view_mood_tracking',
                                'export_reports',
                                'message_patient',
                                'upload_documents',
                                'generate_clinical_notes'
                              )),
  granted         boolean     NOT NULL DEFAULT false,
  granted_at      timestamptz,
  revoked_at      timestamptz,
  modified_by     uuid        REFERENCES public.profiles(id),
  UNIQUE(relationship_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_rp_relationship ON public.relationship_permissions(relationship_id);

ALTER TABLE public.relationship_permissions ENABLE ROW LEVEL SECURITY;

-- Both parties can read permissions; only patient can write
CREATE POLICY "rp_parties_read"
  ON public.relationship_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clinician_patient_relationships cpr
      WHERE cpr.id = relationship_id
        AND (cpr.clinician_id = auth.uid() OR cpr.patient_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
  );

CREATE POLICY "rp_patient_manage"
  ON public.relationship_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.clinician_patient_relationships cpr
      WHERE cpr.id = relationship_id AND cpr.patient_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
  );

-- ══════════════════════════════════════════════════════════
-- 6. NOTIFICATION EVENTS  (consent-workflow notifications)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.notification_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type   text        NOT NULL,
  related_id   uuid,
  related_type text,
  title_en     text,
  title_ar     text,
  body_en      text,
  body_ar      text,
  link         text,
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ne_recipient ON public.notification_events(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ne_unread    ON public.notification_events(recipient_id) WHERE read_at IS NULL;

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ne_recipient_read"
  ON public.notification_events FOR SELECT
  USING (
    recipient_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
  );

CREATE POLICY "ne_recipient_update"
  ON public.notification_events FOR UPDATE
  USING (recipient_id = auth.uid());

-- ══════════════════════════════════════════════════════════
-- 7. HELPER FUNCTION: generate_patient_access_code()
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.generate_patient_access_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars    text    := 'ABCDEFGHJKLMNPQRSTUVWXYZ'; -- excludes I, O (ambiguous)
  new_code text;
  attempts integer := 0;
BEGIN
  LOOP
    -- Format: V + 1 random uppercase letter + 5 zero-padded digits
    new_code := 'V'
      || substr(chars, floor(random() * length(chars))::int + 1, 1)
      || lpad((floor(random() * 100000))::text, 5, '0');

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.patient_access_codes WHERE code = new_code
    );

    attempts := attempts + 1;
    IF attempts > 200 THEN
      RAISE EXCEPTION 'generate_patient_access_code: failed after 200 attempts';
    END IF;
  END LOOP;

  RETURN new_code;
END;
$$;

-- ══════════════════════════════════════════════════════════
-- 8. HELPER FUNCTION: check_relationship_permission()
--    Returns true if the caller has permission_key on patient
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.check_relationship_permission(
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
  SELECT EXISTS (
    SELECT 1
    FROM public.clinician_patient_relationships cpr
    JOIN public.relationship_permissions rp ON rp.relationship_id = cpr.id
    WHERE cpr.clinician_id  = p_clinician_id
      AND cpr.patient_id    = p_patient_id
      AND cpr.status        = 'active'
      AND rp.permission_key = p_permission
      AND rp.granted        = true
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_relationship_permission TO authenticated;
