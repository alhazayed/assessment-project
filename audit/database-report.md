# V Welfare — Database Report

**Audit date:** 2026-07-13
**Scope:** `/workspace/supabase/migrations/` (~100 SQL files) + `supabase/config.toml`
**Method:** Full read of substantive migrations; empty "stub" migrations cross‑referenced against `20260619120000_schema_baseline.sql` and application code. **No live DB access** — anything living only in stub migrations is an evidence gap and cannot be confirmed against production.

Severity key: **Critical / High / Medium / Low**.

---

## 0. Executive Summary

The schema is **functionally rich and thoughtfully modelled** for a mental‑health platform (governed assessments, granular clinician consent, audit trail, consent documents). But **migration hygiene is poor** and **recent migrations introduce regressions that are worse than the baseline**. The migration history is **not a trustworthy source of truth** for a fresh/DR deploy. Fix Critical/High items before treating migrations as authoritative or launching.

| Severity | Count |
|---|---|
| Critical | 5 |
| High | 6 |
| Medium | 9 |
| Low | 4 |

---

## 1. Schema Overview

**~44 tables + 5 materialized views.** Authoritative snapshot: `20260619120000_schema_baseline.sql` (declares tables, RLS, functions, triggers). Domains:

- **Identity:** `profiles` (1:1 `auth.users`), `patient_profiles`, `clinician_profiles`.
- **Assessments:** `assessment_definitions`, `assessment_governance`, `assessment_items`, `assessment_interpretation_templates`, `assessment_submissions`, `assessment_responses`, `assessment_assignments`.
- **Clinical/tracking:** `clinical_notes`, `session_notes`, `mood_logs`, `journal_entries`, `gratitude_entries`, `medications`, `medication_alerts`, `personality_results`, `wellness_plans`, `chat_sessions`, `ai_insights`, `pdf_reports`.
- **Consent/connection:** `clinician_patient_relationships`, `relationship_permissions`, `clinician_invitations`, `patient_access_codes`, `clinician_verifications`, `consent_documents`, `user_consents`, `access-requests` (invitations table).
- **Messaging/notifications:** `messages`, `notifications`, `notification_log`, `notification_events`.
- **Platform:** `platform_settings`, `platform_announcements`, `dismissed_announcements`, `feature_flags`, `cms_sections`, `content_articles`, `audit_log`, `rate_limit_log`, `push_tokens`.
- **Packages:** `packages`, `package_assessments`, `package_interpretations`, `package_results`, `package_sessions`.
- **Materialized views:** `admin_daily_stats`, `admin_assessment_stats`, `admin_user_engagement_stats`, `admin_high_risk_alerts`, `admin_demographics_summary`.

---

## 2. Critical Findings

### DB‑C1 (Critical): `patient_id NOT NULL` conflicts with live guest submissions
`20260627220200_assessment_submissions_constraints.sql:6-17` sets `assessment_submissions.patient_id NOT NULL` (comment claims guests "use a separate table" — **no such table exists**). `submit-assessment-guest/route.ts:296` still inserts `patient_id: null`. Applying this migration breaks the guest flow entirely; not applying it means the repo and prod disagree. **Fix:** create a `guest_submissions` table and migrate the guest code, or revert NOT NULL. *Effort: 4–8h.*

### DB‑C2 (Critical): Auth signup trigger dropped and never recreated
`20260619210813_fix_duplicate_auth_trigger.sql:6-31` drops `on_auth_user_created` and redefines `handle_new_user()` but issues **no `CREATE TRIGGER`**. Baseline creates the trigger *earlier*, and this migration runs *after* it, so profile‑creation now depends on an out‑of‑repo trigger (`trg_on_auth_user_created`). If absent in prod, **signups create no profile row**. **Fix:** add idempotent `DROP TRIGGER IF EXISTS … ; CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();`. *Effort: 1h.*

### DB‑C3 (Critical): Admin RPCs + materialized views over‑granted to all authenticated users
`20260627220100_admin_dashboard_rpcs.sql:235-243` `GRANT EXECUTE … TO authenticated` on `get_admin_dashboard_stats`, `get_high_risk_patients`, `get_patient_risk_profile(p_patient_id)`, etc., with **no in‑function role check** (functions default to SECURITY INVOKER). `20260627220000_admin_dashboard_materialized_views.sql:151-155` `GRANT SELECT … TO authenticated` on all five views. Any logged‑in patient could call these directly (bypassing the API's `requireAdmin`), and `get_patient_risk_profile` allows **enumeration of any patient UUID**. **Fix:** REVOKE from `authenticated`; make functions SECURITY DEFINER with an admin gate, or serve only via the service‑role admin client. *Effort: 4–8h.*

### DB‑C4 (Critical): Admin materialized views reference non‑existent columns
`20260627220000_...:52-88` selects `p.user_type`, `p.full_name`, `p.email` — but `profiles` has `role` (not `user_type`), `full_name_en` (not `full_name`), and **no `email`** (email lives in `auth.users`). The views/RPCs error at runtime; the app already routes around them (`app/api/admin/dashboard/risk/route.ts:10-13` documents this). **Fix:** correct the view SQL (`role`, `full_name_en`, join `auth.users` for email) or drop the views and query base tables. *Effort: 6–10h.*

### DB‑C5 (Critical): ~71 empty stub migrations — history not reproducible
~71 of ~100 files contain only "applied directly to remote database; stub preserved." This includes **all foundational schema, RLS rebuilds, guest support, healthcare hardening, consent views, and index drops**. The only full snapshot (`schema_baseline`) is itself incomplete/buggy (see DB‑H3). A fresh deploy, Supabase branch/preview, or DR restore from the repo will **not** reproduce production. This underpins `KNOWN_ISSUES.md`'s "remote migration versions not found" blocker. **Fix:** replace stubs with a real `pg_dump --schema-only` baseline (and keep future migrations real). *Effort: 16–40h.*

---

## 3. High Findings

### DB‑H1 (High): RLS policy stacking weakens clinical‑note & message privacy
`20260624190200_clinical_notes_and_messages_rls.sql` **adds** permissive policies without dropping the baseline ones; Postgres ORs permissive policies:
- `cn_patient_read` (`:8-20`) → patients can read **`is_private = true`** notes (baseline restricted to non‑private).
- `cn_clinician_own` → notes where `clinician_id = auth.uid()` **without assignment check**.
- `msg_participant_insert` (`:47-54`) → clinician can message **any** patient by setting `clinician_id = self`.
**Fix:** `DROP POLICY` the weak ones; restore assignment + `is_private` checks (ideally on the consent graph). *Effort: 4–6h.*

### DB‑H2 (High): Broad clinician read policies without assignment/consent
Baseline `patient_prof_clinician` (`:802-803`) lets **any** clinician `SELECT` **every** `patient_profiles` row; same pattern on `ai_insights`, `gratitude_entries`, `medications`, `personality_results`. **Fix:** scope to assigned/consented patients via a join to `clinician_patient_relationships`. *Effort: 6–12h.*

### DB‑H3 (High): `schema_baseline` FK ordering bug
`assessment_submissions` (baseline `:146`) references `assessment_assignments`, created later (`:164`). A **fresh** apply of baseline alone fails on the FK. **Fix:** reorder table creation. *Effort: 1h.*

### DB‑H4 (High): `admin_demographics_summary` not revoked
`20260628071704_revoke_admin_matview_api_access.sql` revokes 4 of 5 views; `admin_demographics_summary` remains granted to `authenticated` (population demographics exposed at the DB layer). **Fix:** revoke it too. *Effort: 15min.*

### DB‑H5 (High): Admin stats API vs. revoked grants
`admin/dashboard/stats` uses the **user‑scoped** client to call RPCs that read now‑revoked views; after DB‑C3 revoke, these calls **fail for admins** (INVOKER context). **Fix:** call via service‑role admin client after adding a real admin gate. *Effort: 2–4h.*

### DB‑H6 (High): Inconsistent FK targets — `package_sessions.user_id → auth.users` while `package_results.user_id` was fixed to `profiles`
Divergent FK targets complicate joins and cascade behaviour (`20260623220100`/`20260624044337` fixed results; sessions not). **Fix:** align both to `profiles`. *Effort: 2h.*

---

## 4. Medium Findings

- **DB‑M1:** `profiles.role` has **no CHECK constraint** — any string can be stored; integrity relies on app + triggers. *Fix:* `CHECK (role IN ('patient','clinician','admin','superadmin'))`. *0.5h.*
- **DB‑M2:** Newer policies use bare `auth.uid()` instead of `(select auth.uid())` (per‑row re‑evaluation → RLS perf) in `20260624120000`, packages, push_tokens, `20260622020000`. *Fix:* wrap in subselect. *2–4h.*
- **DB‑M3:** Redundant/duplicate indexes across ≥6 migrations (e.g. triple `idx_assessment_submissions_patient_submitted`; single + partial `assignment_id`; single + composite `patient_id`; duplicate `rate_limit_log(key,created_at)`; duplicate `feature_flags_flag_key`). Write amplification + storage. *Fix:* document a canonical index set and drop duplicates. *4–6h.*
- **DB‑M4:** `audit_log.actor_id NOT NULL` conflicts with anonymous guest audit inserts (`submit-assessment-guest:331` omits `actor_id`) → those fire‑and‑forget inserts may **always fail silently**. *Fix:* make `actor_id` nullable for guest actions. *1h.*
- **DB‑M5:** `submit_assessment_atomic` doesn't validate that `item_id`s belong to `definition_id` or verify scoring (app validates, but the SECURITY DEFINER RPC is granted to `authenticated` and bypasses RLS). *Fix:* validate inside the function. *2–3h.*
- **DB‑M6:** pg_cron jobs for **materialized‑view refresh** and **rate‑limit cleanup** exist only as stub migrations (`20260614224838`, refresh not in repo) → stale analytics + unbounded `rate_limit_log` growth. *Fix:* add real cron migrations. *2–4h.*
- **DB‑M7:** Denormalized demographics across `profiles`, `patient_profiles`, and `assessment_submissions.guest_*` → sync drift + GDPR erasure complexity. *Fix:* consolidate. *4–8h.*
- **DB‑M8:** Dual clinician models (`assigned_clinician_id` vs `clinician_patient_relationships`) — schema‑level source of the consent bypass in `security-report.md`. *Fix:* deprecate the legacy field. *8–20h.*
- **DB‑M9:** JSONB blobs for queryable data (`chat_sessions.messages`, `wellness_plans.plan_json`, `package_results.*_scores`) hinder indexing/analytics at scale. *Fix:* normalize hot paths. *variable.*

---

## 5. Low Findings

- **DB‑L1:** `assessment_assignments.completed_submission_id` has **no FK** (orphan risk). *0.5h.*
- **DB‑L2:** `packages_set_updated_at` trigger function missing `SET search_path`. *0.5h.*
- **DB‑L3:** `generate_patient_access_code()` (SECURITY DEFINER) lacks an explicit `REVOKE`/`GRANT` lockdown (likely PUBLIC‑callable). *0.5h.*
- **DB‑L4:** Duplicate/pointer migrations (`assessment_submissions_constraints`, `package_results_fk_fix` appear 3× each) clutter the version table. *cleanup.*

---

## 6. RLS Coverage (from repo)

All ~44 tables have `ENABLE ROW LEVEL SECURITY` in baseline/later migrations. **Materialized views cannot use RLS** — access is grant‑based only (hence DB‑C3/DB‑H4 matter). Positives: patient‑ownership policies use `(select auth.uid())`; `get_my_role()` is SECURITY DEFINER with `search_path` set (correct anti‑recursion); `check_and_record_rate_limit` is service‑role‑only. Public `USING (true)` reads on assessment definitions/items/CMS/announcements/flags are acceptable for public content (but feature‑flag config is world‑readable — consider tightening).

---

## 7. Config (`config.toml`)

| Setting | Note |
|---|---|
| `enable_confirmations = false` | Email unverified at signup (see `security-report.md` SEC‑H5) |
| `jwt_expiry = 3600` | 1h — reasonable |
| `max_rows = 1000` | Good PostgREST abuse guard |
| `major_version = 15` | PG 15 |
| `schemas = ["public","graphql_public"]` | All public tables exposed to PostgREST unless revoked — reinforces DB‑C3 |
| `site_url = http://localhost:3000` | Expected for local; ensure prod overrides |

Storage buckets/policies are **not** in `config.toml` or committed migrations → **cannot verify bucket privacy / Storage RLS for uploaded clinician documents** (evidence gap; treat as launch blocker until confirmed).

---

## 8. Scalability & Normalization

- Guest data in the main submissions table, three notification systems, dual clinician models, and JSONB blobs are the main scaling/maintenance risks.
- Materialized‑view analytics is the right idea but is currently broken (DB‑C4) and un‑refreshed (DB‑M6).
- Add missing FK indexes (mostly done in `20260623211848`) and drop duplicates (DB‑M3).

---

## 9. Prioritized Remediation (DB)

| Priority | Items | Effort |
|---|---|---|
| P0 | DB‑C1, DB‑C2, DB‑C3, DB‑C4, DB‑H1, DB‑H4 | 20–40h |
| P0 (evidence) | DB‑C5 backfill real baseline; confirm Storage RLS | 16–40h |
| P1 | DB‑H2, DB‑H3, DB‑H5, DB‑H6, DB‑M4, DB‑M5, DB‑M8 | 20–40h |
| P2 | DB‑M1/2/3/6/7/9, DB‑L1–L4 | 15–25h |

**Database verdict:** ❌ Not launch‑ready until P0 items and the Storage‑policy evidence gap are resolved.
