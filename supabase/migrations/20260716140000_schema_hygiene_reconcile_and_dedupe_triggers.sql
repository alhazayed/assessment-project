-- ============================================================
-- Schema hygiene — reconcile prod/repo drift + remove duplicate triggers
-- ============================================================
-- Two related problems, both idempotent and low risk:
--
-- SECTION A — reconcile out-of-band production changes back into version control.
-- Four objects were dropped directly from the production database but were still
-- CREATE'd by earlier migrations, so rebuilding the DB from migrations (a new
-- environment, DR, or a Supabase branch) would RESURRECT them. These DROPs are
-- no-ops against current production; their purpose is to make a from-scratch
-- rebuild deterministically match production.
--   * profiles: duplicate role-guard/updated_at triggers (one of each already
--     kept in prod: trg_prevent_role_escalation, trg_profiles_updated_at)
--   * messages: msg_participant_read (identical to messages_read)
--   * is_admin() function (0 policy/code references)
--
-- SECTION B — finish the duplicate-trigger cleanup on the remaining tables.
-- The same "two triggers calling one function" pattern still exists on three
-- tables (the out-of-band cleanup only covered profiles). Each DROP keeps the
-- functionally-equivalent (or superset) copy, so behavior is preserved:
--   * assessment_definitions: keep trg_governance_gate (BEFORE INSERT/UPDATE —
--     a SUPERSET of enforce_governance_on_activation, which is UPDATE-only)
--   * content_articles: keep trg_enforce_article_review (identical BEFORE UPDATE)
--   * patient_profiles: keep trg_patient_profiles_updated_at (identical BEFORE UPDATE)
--
-- SAFETY INVARIANT: the role-escalation guard (prevent_role_self_escalation via
-- trg_prevent_role_escalation) and the governance/review gates remain active —
-- every DROP below removes only a redundant copy, never the last one.

-- ── Section A: reconcile out-of-band removals (no-op vs current prod) ─────────
DROP TRIGGER  IF EXISTS prevent_role_escalation  ON public.profiles;
DROP TRIGGER  IF EXISTS set_profiles_updated_at  ON public.profiles;
DROP POLICY   IF EXISTS msg_participant_read      ON public.messages;
DROP FUNCTION IF EXISTS public.is_admin();

-- ── Section B: remove remaining duplicate triggers (behavior-preserving) ─────
DROP TRIGGER IF EXISTS enforce_governance_on_activation   ON public.assessment_definitions;
DROP TRIGGER IF EXISTS enforce_article_review_before_publish ON public.content_articles;
DROP TRIGGER IF EXISTS set_patient_profiles_updated_at    ON public.patient_profiles;

-- ── Post-apply verification (expect the counts in parentheses) ───────────────
-- select count(*) from pg_trigger t join pg_proc p on p.oid=t.tgfoid
--   where t.tgrelid='public.profiles'::regclass and p.proname='prevent_role_self_escalation'
--   and not t.tgisinternal;                                              -- (1) guard intact
-- select count(*) from pg_trigger where tgrelid='public.assessment_definitions'::regclass
--   and not tgisinternal and tgname in ('enforce_governance_on_activation','trg_governance_gate'); -- (1)
-- select count(*) from pg_trigger where tgrelid='public.content_articles'::regclass
--   and not tgisinternal and tgfoid='public.enforce_article_review'::regproc;   -- (1)
-- select count(*) from pg_trigger where tgrelid='public.patient_profiles'::regclass
--   and not tgisinternal and tgfoid='public.handle_updated_at'::regproc;        -- (1)

-- ============================================================
-- ROLLBACK (recreate the removed objects; reference only)
-- ============================================================
-- -- Section B:
-- CREATE TRIGGER enforce_governance_on_activation BEFORE UPDATE ON public.assessment_definitions
--   FOR EACH ROW EXECUTE FUNCTION public.enforce_governance_before_activation();
-- CREATE TRIGGER enforce_article_review_before_publish BEFORE UPDATE ON public.content_articles
--   FOR EACH ROW EXECUTE FUNCTION public.enforce_article_review();
-- CREATE TRIGGER set_patient_profiles_updated_at BEFORE UPDATE ON public.patient_profiles
--   FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
-- -- Section A: recreate from their original definitions in
-- --   20260619120000_schema_baseline.sql (is_admin, profiles triggers) and
-- --   20260624190200_clinical_notes_and_messages_rls.sql (msg_participant_read).
