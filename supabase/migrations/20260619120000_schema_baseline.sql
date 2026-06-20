-- =============================================================================
-- SCHEMA BASELINE SNAPSHOT — 2026-06-19
-- This file documents the complete database schema as deployed.
-- All 72 prior migrations (20260524202222 through 20260619093251) are already
-- applied to the remote database; this file captures the resulting state for
-- source-control reference and disaster-recovery purposes.
-- New schema changes should be added as separate migration files AFTER this one.
-- =============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- SEQUENCES
-- ──────────────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.rate_limit_log_id_seq
  AS bigint START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

-- ──────────────────────────────────────────────────────────────────────────────
-- CORE TABLES (dependency order: profiles first, then referencing tables)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id                   uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  role                 text NOT NULL,
  full_name_en         text NOT NULL DEFAULT '',
  full_name_ar         text,
  language_preference  text NOT NULL DEFAULT 'ar',
  assigned_clinician_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  avatar_url           text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  is_active            boolean NOT NULL DEFAULT true,
  deactivated_at       timestamptz,
  date_of_birth        date,
  gender               text,
  marital_status       text,
  educational_status   text,
  country_of_residence text
);

CREATE TABLE IF NOT EXISTS public.patient_profiles (
  id                            uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_of_birth                 date,
  gender                        text,
  phone_number                  text,
  emergency_contact_name        text,
  emergency_contact_phone       text,
  emergency_contact_relation    text,
  consent_given_at              timestamptz,
  platform_joined_at            timestamptz NOT NULL DEFAULT now(),
  share_mood_notes              boolean NOT NULL DEFAULT false,
  share_journal_default         boolean NOT NULL DEFAULT false,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  onboarding_completed_at       timestamptz,
  onboarding_step               integer DEFAULT 0,
  arabic_dialect                text DEFAULT 'levantine',
  marital_status                text,
  educational_status            text,
  employment_status             text,
  has_psychiatric_medications   boolean NOT NULL DEFAULT false,
  psychiatric_medication_details text,
  psychiatric_medication_duration text
);

CREATE TABLE IF NOT EXISTS public.clinician_profiles (
  id                        uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  specialty_en              text,
  specialty_ar              text,
  availability_message_en   text DEFAULT 'Usually responds within 2 hours',
  availability_message_ar   text DEFAULT 'يرد عادةً في غضون ساعتين',
  bio_en                    text,
  bio_ar                    text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assessment_definitions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text NOT NULL UNIQUE,
  name_en          text NOT NULL,
  name_ar          text NOT NULL,
  description_en   text,
  description_ar   text,
  total_questions  integer NOT NULL,
  scoring_logic    jsonb NOT NULL DEFAULT '[]',
  high_risk_threshold integer,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assessment_governance (
  definition_id            uuid PRIMARY KEY REFERENCES public.assessment_definitions(id) ON DELETE CASCADE,
  original_author          text,
  publisher                text,
  license_type             text NOT NULL,
  commercial_use_allowed   boolean,
  copyright_status         text NOT NULL,
  arabic_validation_status text NOT NULL,
  validation_studies       text,
  reference_citations      text,
  scoring_method           text NOT NULL,
  clinical_limitations     text,
  last_review_date         date NOT NULL,
  steward_id               uuid REFERENCES public.profiles(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assessment_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id    uuid NOT NULL REFERENCES public.assessment_definitions(id) ON DELETE CASCADE,
  item_number      integer NOT NULL,
  question_en      text NOT NULL,
  question_ar      text NOT NULL,
  response_options jsonb NOT NULL DEFAULT '[]',
  is_safety_item   boolean NOT NULL DEFAULT false,
  score_weight     numeric NOT NULL DEFAULT 1.0,
  subscale         text,
  UNIQUE (definition_id, item_number)
);

CREATE TABLE IF NOT EXISTS public.assessment_interpretation_templates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id         uuid NOT NULL REFERENCES public.assessment_definitions(id) ON DELETE RESTRICT,
  band_key              text NOT NULL,
  template_summary_en   text NOT NULL DEFAULT '',
  template_summary_ar   text NOT NULL DEFAULT '',
  template_science_en   text NOT NULL DEFAULT '',
  template_science_ar   text NOT NULL DEFAULT '',
  template_education_en text NOT NULL DEFAULT '',
  template_education_ar text NOT NULL DEFAULT '',
  template_next_en      text NOT NULL DEFAULT '',
  template_next_ar      text NOT NULL DEFAULT '',
  citation_text         text,
  citation_url          text,
  evidence_level        text,
  is_approved           boolean NOT NULL DEFAULT false,
  approved_by           uuid REFERENCES public.profiles(id),
  approved_at           timestamptz,
  last_reviewed_at      timestamptz,
  review_required_at    timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (definition_id, band_key)
);

CREATE TABLE IF NOT EXISTS public.assessment_submissions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id    uuid REFERENCES public.assessment_assignments(id),
  patient_id       uuid REFERENCES public.profiles(id),
  definition_id    uuid NOT NULL REFERENCES public.assessment_definitions(id),
  total_score      integer NOT NULL,
  severity_band    text NOT NULL,
  started_at       timestamptz NOT NULL DEFAULT now(),
  submitted_at     timestamptz NOT NULL DEFAULT now(),
  high_risk_flag   boolean NOT NULL DEFAULT false,
  is_self_initiated boolean NOT NULL DEFAULT false,
  guest_dob        date,
  guest_gender     text,
  guest_marital    text,
  guest_education  text,
  guest_country    text
);

CREATE TABLE IF NOT EXISTS public.assessment_assignments (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id              uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinician_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  definition_id           uuid NOT NULL REFERENCES public.assessment_definitions(id),
  assigned_at             timestamptz NOT NULL DEFAULT now(),
  due_date                timestamptz,
  status                  text NOT NULL DEFAULT 'pending',
  completed_submission_id uuid,
  note_to_patient_en      text,
  note_to_patient_ar      text
);

CREATE TABLE IF NOT EXISTS public.assessment_responses (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id      uuid NOT NULL REFERENCES public.assessment_submissions(id) ON DELETE CASCADE,
  item_id            uuid NOT NULL REFERENCES public.assessment_items(id),
  response_value     integer NOT NULL,
  response_label_en  text NOT NULL,
  response_label_ar  text NOT NULL,
  UNIQUE (submission_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.ai_insights (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          uuid NOT NULL REFERENCES public.profiles(id),
  period              text NOT NULL,
  language            text NOT NULL DEFAULT 'ar',
  summary_ar          text,
  summary_en          text,
  generated_at        timestamptz NOT NULL DEFAULT now(),
  data_hash           text,
  submission_id       uuid REFERENCES public.assessment_submissions(id) ON DELETE CASCADE,
  interpretation_type text,
  UNIQUE (patient_id, period, language)
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid NOT NULL REFERENCES public.profiles(id),
  action      text NOT NULL,
  target_type text,
  target_id   uuid,
  reason      text,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.profiles(id),
  messages   jsonb NOT NULL DEFAULT '[]',
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinical_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES public.profiles(id),
  clinician_id uuid NOT NULL REFERENCES public.profiles(id),
  note_type   text NOT NULL DEFAULT 'general',
  body        text NOT NULL,
  is_private  boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cms_sections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key   text NOT NULL UNIQUE,
  title         text NOT NULL,
  description   text,
  is_visible    boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  config        jsonb NOT NULL DEFAULT '{}',
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.consent_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type   text NOT NULL,
  version         text NOT NULL,
  title_en        text NOT NULL DEFAULT '',
  title_ar        text NOT NULL DEFAULT '',
  body_en         text NOT NULL DEFAULT '',
  body_ar         text NOT NULL DEFAULT '',
  is_current      boolean NOT NULL DEFAULT false,
  effective_date  date NOT NULL DEFAULT CURRENT_DATE,
  superseded_date date,
  created_by      uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_articles (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category              text NOT NULL,
  title_en              text NOT NULL,
  title_ar              text NOT NULL,
  body_en               text NOT NULL DEFAULT '',
  body_ar               text NOT NULL DEFAULT '',
  status                text NOT NULL DEFAULT 'draft',
  clinical_reviewer_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at           timestamptz,
  version               integer NOT NULL DEFAULT 1,
  published_at          timestamptz,
  created_by            uuid REFERENCES public.profiles(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_announcements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en       text NOT NULL,
  title_ar       text NOT NULL,
  body_en        text,
  body_ar        text,
  type           text NOT NULL DEFAULT 'info',
  target_roles   text[] NOT NULL DEFAULT ARRAY['patient', 'clinician'],
  is_active      boolean NOT NULL DEFAULT true,
  is_dismissible boolean NOT NULL DEFAULT true,
  starts_at      timestamptz NOT NULL DEFAULT now(),
  ends_at        timestamptz,
  cta_label_en   text,
  cta_label_ar   text,
  cta_href       text,
  created_by     uuid REFERENCES public.profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dismissed_announcements (
  user_id         uuid NOT NULL REFERENCES public.profiles(id),
  announcement_id uuid NOT NULL REFERENCES public.platform_announcements(id),
  dismissed_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, announcement_id)
);

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key     text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description  text,
  is_enabled   boolean NOT NULL DEFAULT true,
  applies_to   text[] NOT NULL DEFAULT ARRAY['patient', 'clinician', 'public'],
  config       jsonb NOT NULL DEFAULT '{}',
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.gratitude_entries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.profiles(id),
  body       text NOT NULL DEFAULT '',
  category   text NOT NULL DEFAULT 'general',
  word_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invitations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 text NOT NULL,
  assigned_clinician_id uuid NOT NULL REFERENCES public.profiles(id),
  token_hash            text NOT NULL UNIQUE,
  created_by            uuid NOT NULL REFERENCES public.profiles(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz NOT NULL DEFAULT (now() + INTERVAL '72 hours'),
  accepted_at           timestamptz,
  status                text NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body       text NOT NULL DEFAULT '',
  is_shared  boolean NOT NULL DEFAULT false,
  shared_at  timestamptz,
  word_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.medication_alerts (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id                uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  alert_type                text NOT NULL,
  drug_ids                  text[],
  drugbank_interaction_id   text,
  severity                  text,
  mechanism_en              text,
  mechanism_ar              text,
  acknowledged_by           uuid REFERENCES public.profiles(id),
  acknowledged_at           timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.medications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  drugbank_drug_id   text,
  drug_name_display  text NOT NULL,
  dosage             text,
  frequency          text,
  prescribed_by      text,
  started_month      text,
  is_active          boolean NOT NULL DEFAULT true,
  deactivated_at     timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   uuid NOT NULL REFERENCES public.profiles(id),
  clinician_id uuid NOT NULL REFERENCES public.profiles(id),
  sender_id    uuid NOT NULL REFERENCES public.profiles(id),
  body         text NOT NULL,
  read_at      timestamptz,
  attachments  jsonb DEFAULT '[]',
  created_at   timestamptz NOT NULL DEFAULT now(),
  is_urgent    boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.mood_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date        date NOT NULL,
  mood_score      integer NOT NULL,
  energy_score    integer NOT NULL,
  anxiety_score   integer NOT NULL,
  sleep_hours     numeric,
  mood_note       text,
  note_shared     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  triggers        text[] DEFAULT '{}',
  activity_minutes integer,
  UNIQUE (patient_id, log_date)
);

CREATE TABLE IF NOT EXISTS public.notification_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id),
  channel      text NOT NULL,
  type         text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}',
  sent_at      timestamptz NOT NULL DEFAULT now(),
  status       text NOT NULL DEFAULT 'sent'
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       text NOT NULL,
  title_en   text NOT NULL,
  title_ar   text NOT NULL,
  body_en    text,
  body_ar    text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pdf_reports (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id        uuid NOT NULL REFERENCES public.assessment_submissions(id) ON DELETE CASCADE,
  patient_id           uuid NOT NULL REFERENCES public.profiles(id),
  generated_by         uuid NOT NULL REFERENCES public.profiles(id),
  generated_at         timestamptz NOT NULL DEFAULT now(),
  language             text NOT NULL,
  report_version       integer NOT NULL DEFAULT 1,
  instrument_code      text NOT NULL,
  band_key             text NOT NULL,
  total_score          integer NOT NULL,
  template_id          uuid REFERENCES public.assessment_interpretation_templates(id),
  ai_insight_used      boolean NOT NULL DEFAULT false,
  interpretation_source text NOT NULL,
  actor_role           text NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.personality_results (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        uuid NOT NULL REFERENCES public.profiles(id),
  openness          numeric NOT NULL,
  conscientiousness numeric NOT NULL,
  extraversion      numeric NOT NULL,
  agreeableness     numeric NOT NULL,
  neuroticism       numeric NOT NULL,
  responses         jsonb NOT NULL DEFAULT '{}',
  taken_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id         bigint PRIMARY KEY DEFAULT nextval('public.rate_limit_log_id_seq'),
  key        text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.session_notes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     uuid NOT NULL REFERENCES public.profiles(id),
  note           text NOT NULL DEFAULT '',
  status         text NOT NULL DEFAULT 'pending',
  appointment_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_consents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  document_id uuid NOT NULL REFERENCES public.consent_documents(id) ON DELETE RESTRICT,
  action      text NOT NULL,
  actioned_at timestamptz NOT NULL DEFAULT now(),
  ip_address  inet,
  user_agent  text,
  method      text NOT NULL DEFAULT 'in_app',
  recorded_by uuid REFERENCES public.profiles(id),
  notes       text,
  UNIQUE (user_id, document_id, action, actioned_at)
);

CREATE TABLE IF NOT EXISTS public.wellness_plans (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   uuid NOT NULL REFERENCES public.profiles(id),
  week_start   date NOT NULL,
  plan_json    jsonb NOT NULL DEFAULT '{}',
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, week_start)
);

-- ──────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_patient_submitted
  ON public.assessment_submissions(patient_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_definition_submitted
  ON public.assessment_submissions(definition_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON public.notifications(user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_patient_clinician_created
  ON public.messages(patient_id, clinician_id, created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_key_created
  ON public.rate_limit_log(key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_clinician
  ON public.profiles(assigned_clinician_id) WHERE assigned_clinician_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_created
  ON public.audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_target
  ON public.audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_mood_logs_patient_date
  ON public.mood_logs(patient_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_patient_created
  ON public.journal_entries(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_clinician_created
  ON public.messages(clinician_id, created_at);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_patient
  ON public.assessment_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_clinician
  ON public.assessment_assignments(clinician_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_submission
  ON public.assessment_responses(submission_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email
  ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token_hash
  ON public.invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_platform_announcements_active
  ON public.platform_announcements(is_active, starts_at, ends_at);

-- ──────────────────────────────────────────────────────────────────────────────
-- FUNCTIONS
-- ──────────────────────────────────────────────────────────────────────────────

-- Core role helper (SECURITY DEFINER prevents RLS recursion on profiles)
CREATE OR REPLACE FUNCTION public.get_my_role()
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SET search_path TO 'public'
AS $$
  SELECT public.get_my_role() = ANY (ARRAY['admin','superadmin']);
$$;

-- Convenience alias (not SECURITY DEFINER — callers should prefer get_my_role())
CREATE OR REPLACE FUNCTION public.current_user_role()
  RETURNS text
  LANGUAGE sql
  STABLE
  SET search_path TO 'public'
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');

  INSERT INTO public.profiles (id, role, full_name_en)
  VALUES (NEW.id, v_role, COALESCE(NEW.raw_user_meta_data->>'full_name_en', ''));

  IF v_role = 'patient' THEN
    INSERT INTO public.patient_profiles (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'auth'
AS $$
BEGIN
  IF NEW.role != OLD.role AND public.get_my_role() NOT IN ('admin','superadmin') THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_stale_invitations()
  RETURNS void
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  UPDATE public.invitations
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now();
$$;

CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_log()
  RETURNS void
  LANGUAGE sql
  SET search_path TO 'public'
AS $$
  DELETE FROM public.rate_limit_log WHERE created_at < NOW() - INTERVAL '1 hour';
$$;

CREATE OR REPLACE FUNCTION public.prune_rate_limit_log()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.rate_limit_log
  WHERE created_at < NOW() - INTERVAL '25 hours';
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_governance_before_activation()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE g public.assessment_governance%ROWTYPE;
BEGIN
  IF NEW.is_active = true THEN
    SELECT * INTO g FROM public.assessment_governance WHERE definition_id = NEW.id;
    IF NOT FOUND
       OR g.license_type IS NULL
       OR g.copyright_status IS NULL
       OR g.arabic_validation_status IS NULL
       OR g.scoring_method IS NULL
       OR g.last_review_date IS NULL
       OR g.steward_id IS NULL THEN
      RAISE EXCEPTION 'Cannot activate assessment "%": psychometric governance incomplete.', NEW.code;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_article_review()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'published' AND (NEW.clinical_reviewer_id IS NULL OR NEW.reviewed_at IS NULL) THEN
    RAISE EXCEPTION 'Cannot publish article without a clinical reviewer and reviewed_at timestamp.';
  END IF;
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    NEW.published_at = COALESCE(NEW.published_at, now());
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE TRIGGER prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

CREATE OR REPLACE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_patient_profiles_updated_at
  BEFORE UPDATE ON public.patient_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER enforce_governance_on_activation
  BEFORE UPDATE ON public.assessment_definitions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_governance_before_activation();

CREATE OR REPLACE TRIGGER enforce_article_review_before_publish
  BEFORE UPDATE ON public.content_articles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_article_review();

-- ──────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinician_profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_definitions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_governance             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_items                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_interpretation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_submissions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_assignments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_notes                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_sections                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_documents                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_articles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dismissed_announcements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gratitude_entries                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_alerts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_logs                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_reports                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personality_results               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_announcements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_log                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_notes                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_plans                    ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES
-- DROP IF EXISTS before each CREATE to make this baseline idempotent when
-- applied on top of an existing database (e.g. Supabase preview branches).
-- ──────────────────────────────────────────────────────────────────────────────

-- profiles
DROP POLICY IF EXISTS profiles_self_read ON public.profiles;
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_delete ON public.profiles;
CREATE POLICY profiles_self_read ON public.profiles FOR SELECT
  USING ((auth.uid() = id) OR (get_my_role() = ANY (ARRAY['admin','superadmin'])));
CREATE POLICY profiles_insert ON public.profiles FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY profiles_admin_update ON public.profiles FOR UPDATE
  USING (get_my_role() = ANY (ARRAY['admin','superadmin']))
  WITH CHECK (get_my_role() = ANY (ARRAY['admin','superadmin']));
CREATE POLICY profiles_admin_delete ON public.profiles FOR DELETE
  USING (get_my_role() = 'superadmin');

-- patient_profiles
DROP POLICY IF EXISTS patient_prof_own ON public.patient_profiles;
DROP POLICY IF EXISTS patient_prof_clinician ON public.patient_profiles;
DROP POLICY IF EXISTS patient_prof_admin_write ON public.patient_profiles;
CREATE POLICY patient_prof_own ON public.patient_profiles FOR ALL
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY patient_prof_clinician ON public.patient_profiles FOR SELECT
  USING (get_my_role() = ANY (ARRAY['clinician','admin','superadmin']));
CREATE POLICY patient_prof_admin_write ON public.patient_profiles FOR UPDATE
  USING (get_my_role() = ANY (ARRAY['admin','superadmin']))
  WITH CHECK (get_my_role() = ANY (ARRAY['admin','superadmin']));

-- clinician_profiles
DROP POLICY IF EXISTS clin_prof_read ON public.clinician_profiles;
DROP POLICY IF EXISTS clin_prof_own_write ON public.clinician_profiles;
CREATE POLICY clin_prof_read ON public.clinician_profiles FOR SELECT USING (true);
CREATE POLICY clin_prof_own_write ON public.clinician_profiles FOR ALL
  USING (((SELECT auth.uid()) = id) OR (get_my_role() = ANY (ARRAY['admin','superadmin'])))
  WITH CHECK (((SELECT auth.uid()) = id) OR (get_my_role() = ANY (ARRAY['admin','superadmin'])));

-- assessment_definitions
DROP POLICY IF EXISTS defs_read ON public.assessment_definitions;
DROP POLICY IF EXISTS defs_admin_write ON public.assessment_definitions;
CREATE POLICY defs_read ON public.assessment_definitions FOR SELECT USING (true);
CREATE POLICY defs_admin_write ON public.assessment_definitions FOR ALL
  USING (get_my_role() = ANY (ARRAY['admin','superadmin']))
  WITH CHECK (get_my_role() = ANY (ARRAY['admin','superadmin']));

-- assessment_governance
DROP POLICY IF EXISTS ag_read ON public.assessment_governance;
DROP POLICY IF EXISTS ag_admin ON public.assessment_governance;
CREATE POLICY ag_read ON public.assessment_governance FOR SELECT
  USING (get_my_role() = ANY (ARRAY['clinician','admin','superadmin']));
CREATE POLICY ag_admin ON public.assessment_governance FOR ALL
  USING (get_my_role() = ANY (ARRAY['admin','superadmin']))
  WITH CHECK (get_my_role() = ANY (ARRAY['admin','superadmin']));

-- assessment_items
DROP POLICY IF EXISTS items_read ON public.assessment_items;
DROP POLICY IF EXISTS items_admin_write ON public.assessment_items;
CREATE POLICY items_read ON public.assessment_items FOR SELECT USING (true);
CREATE POLICY items_admin_write ON public.assessment_items FOR ALL
  USING (get_my_role() = ANY (ARRAY['admin','superadmin']))
  WITH CHECK (get_my_role() = ANY (ARRAY['admin','superadmin']));

-- assessment_interpretation_templates
DROP POLICY IF EXISTS interp_templates_read_approved ON public.assessment_interpretation_templates;
DROP POLICY IF EXISTS interp_templates_admin_read_all ON public.assessment_interpretation_templates;
DROP POLICY IF EXISTS interp_templates_admin_write ON public.assessment_interpretation_templates;
CREATE POLICY interp_templates_read_approved ON public.assessment_interpretation_templates FOR SELECT
  USING (is_approved = true);
CREATE POLICY interp_templates_admin_read_all ON public.assessment_interpretation_templates FOR SELECT
  USING (get_my_role() = ANY (ARRAY['admin','superadmin']));
CREATE POLICY interp_templates_admin_write ON public.assessment_interpretation_templates FOR ALL
  USING (get_my_role() = ANY (ARRAY['admin','superadmin']))
  WITH CHECK (get_my_role() = ANY (ARRAY['admin','superadmin']));

-- assessment_submissions
DROP POLICY IF EXISTS submissions_patient_select ON public.assessment_submissions;
DROP POLICY IF EXISTS submissions_patient_insert ON public.assessment_submissions;
DROP POLICY IF EXISTS submissions_clinician ON public.assessment_submissions;
CREATE POLICY submissions_patient_select ON public.assessment_submissions FOR SELECT
  USING ((SELECT auth.uid()) = patient_id);
CREATE POLICY submissions_patient_insert ON public.assessment_submissions FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = patient_id);
CREATE POLICY submissions_clinician ON public.assessment_submissions FOR SELECT
  USING (
    (get_my_role() = ANY (ARRAY['admin','superadmin']))
    OR (
      get_my_role() = 'clinician'
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = assessment_submissions.patient_id AND p.assigned_clinician_id = (SELECT auth.uid()))
    )
  );

-- assessment_assignments
DROP POLICY IF EXISTS assign_read ON public.assessment_assignments;
DROP POLICY IF EXISTS assign_admin_write ON public.assessment_assignments;
DROP POLICY IF EXISTS assign_clinician_own_patients ON public.assessment_assignments;
CREATE POLICY assign_read ON public.assessment_assignments FOR SELECT
  USING (((SELECT auth.uid()) = patient_id) OR (get_my_role() = ANY (ARRAY['clinician','admin','superadmin'])));
CREATE POLICY assign_admin_write ON public.assessment_assignments FOR ALL
  USING (get_my_role() = ANY (ARRAY['admin','superadmin']))
  WITH CHECK (get_my_role() = ANY (ARRAY['admin','superadmin']));
CREATE POLICY assign_clinician_own_patients ON public.assessment_assignments FOR ALL
  USING (
    get_my_role() = 'clinician'
    AND (SELECT auth.uid()) = clinician_id
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = assessment_assignments.patient_id AND p.assigned_clinician_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    get_my_role() = 'clinician'
    AND (SELECT auth.uid()) = clinician_id
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = assessment_assignments.patient_id AND p.assigned_clinician_id = (SELECT auth.uid()))
  );

-- assessment_responses
DROP POLICY IF EXISTS responses_patient_select ON public.assessment_responses;
DROP POLICY IF EXISTS responses_patient_insert ON public.assessment_responses;
DROP POLICY IF EXISTS responses_clinician ON public.assessment_responses;
CREATE POLICY responses_patient_select ON public.assessment_responses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.assessment_submissions s WHERE s.id = assessment_responses.submission_id AND s.patient_id = (SELECT auth.uid())));
CREATE POLICY responses_patient_insert ON public.assessment_responses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessment_submissions s WHERE s.id = assessment_responses.submission_id AND s.patient_id = (SELECT auth.uid())));
CREATE POLICY responses_clinician ON public.assessment_responses FOR SELECT
  USING (
    (get_my_role() = ANY (ARRAY['admin','superadmin']))
    OR (
      get_my_role() = 'clinician'
      AND EXISTS (
        SELECT 1 FROM public.assessment_submissions s
        JOIN public.profiles p ON p.id = s.patient_id
        WHERE s.id = assessment_responses.submission_id AND p.assigned_clinician_id = (SELECT auth.uid())
      )
    )
  );

-- ai_insights
DROP POLICY IF EXISTS insights_owner ON public.ai_insights;
DROP POLICY IF EXISTS insights_clinician ON public.ai_insights;
CREATE POLICY insights_owner ON public.ai_insights FOR ALL
  USING ((SELECT auth.uid()) = patient_id)
  WITH CHECK ((SELECT auth.uid()) = patient_id);
CREATE POLICY insights_clinician ON public.ai_insights FOR SELECT
  USING (get_my_role() = ANY (ARRAY['clinician','admin','superadmin']));

-- audit_log
DROP POLICY IF EXISTS audit_admin_read ON public.audit_log;
DROP POLICY IF EXISTS audit_self_insert ON public.audit_log;
CREATE POLICY audit_admin_read ON public.audit_log FOR SELECT
  USING (get_my_role() = ANY (ARRAY['admin','superadmin']));
CREATE POLICY audit_self_insert ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = actor_id);

-- chat_sessions
DROP POLICY IF EXISTS chat_patient_own ON public.chat_sessions;
DROP POLICY IF EXISTS chat_clinician_read ON public.chat_sessions;
CREATE POLICY chat_patient_own ON public.chat_sessions FOR ALL
  USING ((SELECT auth.uid()) = patient_id)
  WITH CHECK ((SELECT auth.uid()) = patient_id);
CREATE POLICY chat_clinician_read ON public.chat_sessions FOR SELECT
  USING (get_my_role() = ANY (ARRAY['clinician','admin','superadmin']));

-- clinical_notes
DROP POLICY IF EXISTS clinician_own_notes ON public.clinical_notes;
DROP POLICY IF EXISTS notes_admin_all ON public.clinical_notes;
DROP POLICY IF EXISTS notes_patient_read_nonprivate ON public.clinical_notes;
CREATE POLICY clinician_own_notes ON public.clinical_notes FOR ALL
  USING (
    (SELECT auth.uid()) = clinician_id
    AND (
      get_my_role() = ANY (ARRAY['admin','superadmin'])
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = clinical_notes.patient_id AND (p.assigned_clinician_id = (SELECT auth.uid()) OR get_my_role() = ANY (ARRAY['admin','superadmin'])))
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = clinician_id
    AND (
      get_my_role() = ANY (ARRAY['admin','superadmin'])
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = clinical_notes.patient_id AND (p.assigned_clinician_id = (SELECT auth.uid()) OR get_my_role() = ANY (ARRAY['admin','superadmin'])))
    )
  );
CREATE POLICY notes_admin_all ON public.clinical_notes FOR ALL
  USING (get_my_role() = ANY (ARRAY['admin','superadmin']))
  WITH CHECK (get_my_role() = ANY (ARRAY['admin','superadmin']));
CREATE POLICY notes_patient_read_nonprivate ON public.clinical_notes FOR SELECT
  USING ((SELECT auth.uid()) = patient_id AND is_private = false);

-- cms_sections
DROP POLICY IF EXISTS cms_read ON public.cms_sections;
DROP POLICY IF EXISTS cms_admin_write ON public.cms_sections;
CREATE POLICY cms_read ON public.cms_sections FOR SELECT USING (true);
CREATE POLICY cms_admin_write ON public.cms_sections FOR ALL
  USING (get_my_role() = ANY (ARRAY['admin','superadmin']));

-- consent_documents
DROP POLICY IF EXISTS consent_docs_read_current ON public.consent_documents;
DROP POLICY IF EXISTS consent_docs_admin_read_all ON public.consent_documents;
DROP POLICY IF EXISTS consent_docs_admin_insert ON public.consent_documents;
DROP POLICY IF EXISTS consent_docs_admin_update ON public.consent_documents;
CREATE POLICY consent_docs_read_current ON public.consent_documents FOR SELECT
  USING (is_current = true);
CREATE POLICY consent_docs_admin_read_all ON public.consent_documents FOR SELECT
  USING (get_my_role() = ANY (ARRAY['admin','superadmin']));
CREATE POLICY consent_docs_admin_insert ON public.consent_documents FOR INSERT
  WITH CHECK (get_my_role() = ANY (ARRAY['admin','superadmin']));
CREATE POLICY consent_docs_admin_update ON public.consent_documents FOR UPDATE
  USING (get_my_role() = ANY (ARRAY['admin','superadmin']))
  WITH CHECK (get_my_role() = ANY (ARRAY['admin','superadmin']));

-- content_articles
DROP POLICY IF EXISTS articles_published ON public.content_articles;
DROP POLICY IF EXISTS articles_admin_write ON public.content_articles;
CREATE POLICY articles_published ON public.content_articles FOR SELECT
  USING ((status = 'published') OR (get_my_role() = ANY (ARRAY['admin','superadmin'])));
CREATE POLICY articles_admin_write ON public.content_articles FOR ALL
  USING (get_my_role() = ANY (ARRAY['admin','superadmin']));

-- dismissed_announcements
DROP POLICY IF EXISTS dismissed_own ON public.dismissed_announcements;
CREATE POLICY dismissed_own ON public.dismissed_announcements FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- feature_flags
DROP POLICY IF EXISTS flags_read ON public.feature_flags;
DROP POLICY IF EXISTS flags_admin_write ON public.feature_flags;
CREATE POLICY flags_read ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY flags_admin_write ON public.feature_flags FOR ALL
  USING (get_my_role() = ANY (ARRAY['admin','superadmin']));

-- gratitude_entries
DROP POLICY IF EXISTS gratitude_owner ON public.gratitude_entries;
DROP POLICY IF EXISTS gratitude_clinician ON public.gratitude_entries;
CREATE POLICY gratitude_owner ON public.gratitude_entries FOR ALL
  USING ((SELECT auth.uid()) = patient_id)
  WITH CHECK ((SELECT auth.uid()) = patient_id);
CREATE POLICY gratitude_clinician ON public.gratitude_entries FOR SELECT
  USING (get_my_role() = ANY (ARRAY['clinician','admin','superadmin']));

-- invitations
DROP POLICY IF EXISTS inv_own_read ON public.invitations;
DROP POLICY IF EXISTS inv_admin ON public.invitations;
CREATE POLICY inv_own_read ON public.invitations FOR SELECT
  USING ((SELECT auth.uid()) = created_by);
CREATE POLICY inv_admin ON public.invitations FOR ALL
  USING (get_my_role() = ANY (ARRAY['clinician','admin','superadmin']));

-- journal_entries
DROP POLICY IF EXISTS journal_owner ON public.journal_entries;
DROP POLICY IF EXISTS journal_clinician_shared ON public.journal_entries;
CREATE POLICY journal_owner ON public.journal_entries FOR ALL
  USING ((SELECT auth.uid()) = patient_id)
  WITH CHECK ((SELECT auth.uid()) = patient_id);
CREATE POLICY journal_clinician_shared ON public.journal_entries FOR SELECT
  USING (is_shared = true AND get_my_role() = ANY (ARRAY['clinician','admin','superadmin']));

-- medication_alerts
DROP POLICY IF EXISTS alerts_owner ON public.medication_alerts;
DROP POLICY IF EXISTS alerts_clinician ON public.medication_alerts;
CREATE POLICY alerts_owner ON public.medication_alerts FOR ALL
  USING ((SELECT auth.uid()) = patient_id)
  WITH CHECK ((SELECT auth.uid()) = patient_id);
CREATE POLICY alerts_clinician ON public.medication_alerts FOR SELECT
  USING (get_my_role() = ANY (ARRAY['clinician','admin','superadmin']));

-- medications
DROP POLICY IF EXISTS meds_owner ON public.medications;
DROP POLICY IF EXISTS meds_clinician ON public.medications;
CREATE POLICY meds_owner ON public.medications FOR ALL
  USING ((SELECT auth.uid()) = patient_id)
  WITH CHECK ((SELECT auth.uid()) = patient_id);
CREATE POLICY meds_clinician ON public.medications FOR SELECT
  USING (get_my_role() = ANY (ARRAY['clinician','admin','superadmin']));

-- messages
DROP POLICY IF EXISTS messages_read ON public.messages;
DROP POLICY IF EXISTS messages_insert ON public.messages;
DROP POLICY IF EXISTS messages_update ON public.messages;
CREATE POLICY messages_read ON public.messages FOR SELECT
  USING (((SELECT auth.uid()) = patient_id) OR ((SELECT auth.uid()) = clinician_id));
CREATE POLICY messages_insert ON public.messages FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = sender_id
    AND (
      (
        (SELECT auth.uid()) = patient_id
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.assigned_clinician_id = messages.clinician_id)
      ) OR (
        (SELECT auth.uid()) = clinician_id
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = messages.patient_id AND p.assigned_clinician_id = (SELECT auth.uid()))
      ) OR get_my_role() = ANY (ARRAY['admin','superadmin'])
    )
  );
CREATE POLICY messages_update ON public.messages FOR UPDATE
  USING ((SELECT auth.uid()) = sender_id)
  WITH CHECK (
    (SELECT auth.uid()) = sender_id
    AND (
      (
        (SELECT auth.uid()) = patient_id
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.assigned_clinician_id = messages.clinician_id)
      ) OR (
        (SELECT auth.uid()) = clinician_id
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = messages.patient_id AND p.assigned_clinician_id = (SELECT auth.uid()))
      ) OR get_my_role() = ANY (ARRAY['admin','superadmin'])
    )
  );

-- mood_logs
DROP POLICY IF EXISTS mood_owner ON public.mood_logs;
DROP POLICY IF EXISTS mood_clinician ON public.mood_logs;
CREATE POLICY mood_owner ON public.mood_logs FOR ALL
  USING ((SELECT auth.uid()) = patient_id)
  WITH CHECK ((SELECT auth.uid()) = patient_id);
CREATE POLICY mood_clinician ON public.mood_logs FOR SELECT
  USING (
    (get_my_role() = ANY (ARRAY['admin','superadmin']))
    OR (
      get_my_role() = 'clinician'
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = mood_logs.patient_id AND p.assigned_clinician_id = (SELECT auth.uid()))
    )
  );

-- notification_log
DROP POLICY IF EXISTS notif_own ON public.notification_log;
CREATE POLICY notif_own ON public.notification_log FOR SELECT
  USING ((SELECT auth.uid()) = recipient_id);

-- notifications
DROP POLICY IF EXISTS users_own_notifications ON public.notifications;
CREATE POLICY users_own_notifications ON public.notifications FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- pdf_reports
DROP POLICY IF EXISTS pdf_reports_patient ON public.pdf_reports;
DROP POLICY IF EXISTS pdf_reports_clinician ON public.pdf_reports;
CREATE POLICY pdf_reports_patient ON public.pdf_reports FOR ALL
  USING ((SELECT auth.uid()) = patient_id)
  WITH CHECK ((SELECT auth.uid()) = patient_id);
CREATE POLICY pdf_reports_clinician ON public.pdf_reports FOR SELECT
  USING (get_my_role() = ANY (ARRAY['clinician','admin','superadmin']));

-- personality_results
DROP POLICY IF EXISTS personality_own ON public.personality_results;
DROP POLICY IF EXISTS personality_clinician ON public.personality_results;
CREATE POLICY personality_own ON public.personality_results FOR ALL
  USING ((SELECT auth.uid()) = patient_id)
  WITH CHECK ((SELECT auth.uid()) = patient_id);
CREATE POLICY personality_clinician ON public.personality_results FOR SELECT
  USING (get_my_role() = ANY (ARRAY['clinician','admin','superadmin']));

-- platform_announcements
DROP POLICY IF EXISTS ann_read ON public.platform_announcements;
DROP POLICY IF EXISTS ann_admin_write ON public.platform_announcements;
CREATE POLICY ann_read ON public.platform_announcements FOR SELECT USING (true);
CREATE POLICY ann_admin_write ON public.platform_announcements FOR ALL
  USING (get_my_role() = ANY (ARRAY['admin','superadmin']));

-- platform_settings
DROP POLICY IF EXISTS settings_read ON public.platform_settings;
DROP POLICY IF EXISTS settings_admin_write ON public.platform_settings;
CREATE POLICY settings_read ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY settings_admin_write ON public.platform_settings FOR ALL
  USING (get_my_role() = ANY (ARRAY['admin','superadmin']));

-- session_notes
DROP POLICY IF EXISTS notes_patient_all ON public.session_notes;
DROP POLICY IF EXISTS notes_clinician_read ON public.session_notes;
DROP POLICY IF EXISTS notes_clinician_update ON public.session_notes;
CREATE POLICY notes_patient_all ON public.session_notes FOR ALL
  USING ((SELECT auth.uid()) = patient_id)
  WITH CHECK ((SELECT auth.uid()) = patient_id);
CREATE POLICY notes_clinician_read ON public.session_notes FOR SELECT
  USING (
    (get_my_role() = ANY (ARRAY['admin','superadmin']))
    OR (get_my_role() = 'clinician' AND patient_id IN (SELECT aa.patient_id FROM public.assessment_assignments aa WHERE aa.clinician_id = (SELECT auth.uid())))
  );
CREATE POLICY notes_clinician_update ON public.session_notes FOR UPDATE
  USING (
    (get_my_role() = ANY (ARRAY['admin','superadmin']))
    OR (get_my_role() = 'clinician' AND patient_id IN (SELECT aa.patient_id FROM public.assessment_assignments aa WHERE aa.clinician_id = (SELECT auth.uid())))
  )
  WITH CHECK (
    (get_my_role() = ANY (ARRAY['admin','superadmin']))
    OR (get_my_role() = 'clinician' AND patient_id IN (SELECT aa.patient_id FROM public.assessment_assignments aa WHERE aa.clinician_id = (SELECT auth.uid())))
  );

-- user_consents
DROP POLICY IF EXISTS user_consents_own_read ON public.user_consents;
DROP POLICY IF EXISTS user_consents_own_insert ON public.user_consents;
DROP POLICY IF EXISTS user_consents_admin_read ON public.user_consents;
DROP POLICY IF EXISTS user_consents_admin_insert ON public.user_consents;
DROP POLICY IF EXISTS user_consents_clinician_read ON public.user_consents;
CREATE POLICY user_consents_own_read ON public.user_consents FOR SELECT
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY user_consents_own_insert ON public.user_consents FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY user_consents_admin_read ON public.user_consents FOR SELECT
  USING (get_my_role() = ANY (ARRAY['admin','superadmin']));
CREATE POLICY user_consents_admin_insert ON public.user_consents FOR INSERT
  WITH CHECK (get_my_role() = ANY (ARRAY['admin','superadmin']));
CREATE POLICY user_consents_clinician_read ON public.user_consents FOR SELECT
  USING (
    get_my_role() = 'clinician'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_consents.user_id AND p.assigned_clinician_id = (SELECT auth.uid()))
  );

-- wellness_plans
DROP POLICY IF EXISTS wplan_own ON public.wellness_plans;
CREATE POLICY wplan_own ON public.wellness_plans FOR ALL
  USING ((SELECT auth.uid()) = patient_id)
  WITH CHECK ((SELECT auth.uid()) = patient_id);
