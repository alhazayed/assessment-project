# V Welfare Technical Dossier

| Field | Value |
|---|---|
| **Date** | 2026-07-18 |
| **Repository** | `alhazayed/assessment-project` |
| **Branch** | `claude/v-welfare-technical-dossier-fvah3o` |
| **Commit SHA** | `a546ac8b28976b797f7b33c88bb88ead47b56cfc` |
| **Web app version** | `0.1.0` (`package.json`) |
| **Mobile app version** | `1.0.0` (`mobile/package.json`) |
| **Supabase project ref** | `wyzezyctpvlohuuhzyof` (`supabase/config.toml`, `.mcp.json`) |
| **Authors** | Principal Software Architect (this dossier). Codebase contributors per `git shortlog`: Claude (48 commits), alhazayed (21), Cursor Agent (1). |

> **Scope & method.** This dossier is derived exclusively from repository inspection at the commit above. No code was modified. No live database, deployment, or third‑party console was queried. Where a claim cannot be verified from the repository, the text says **"Unable to verify from repository."** Line/file references are provided as evidence. Nothing here is a certification or a penetration‑test result.

---

## 1. Executive Summary

**Platform purpose.** V Welfare ("Vwelfare") is a bilingual (Arabic / English, RTL‑aware) mental‑health assessment platform. It lets patients take validated psychometric assessments (e.g. PHQ‑9, GAD‑7, DASS‑21, ASRS, ISI, DAST‑10) and assessment "packages," view results and AI‑assisted interpretations, track mood/journal, and optionally share results with verified clinicians under granular consent. Evidence: `lib/assessment-content.ts`, `supabase/migrations/*seed*`, `app/(app)/assessments`, `app/(app)/packages`, `CLAUDE.md`.

**Technology maturity.** The platform is a **Next.js 14 App‑Router monorepo‑style project** (web in the root, an Expo/React‑Native app under `mobile/`) backed by **Supabase (Postgres + Auth + RLS)** and **Google Gemini 1.5 Flash** for AI. The codebase is substantial: ~23.3k lines of `app/` TypeScript/TSX, ~6.2k lines in `lib/`, ~3.3k in `components/`, ~6.2k in `mobile/`, and 100 migration files (`supabase/migrations/`).

**Current production readiness.** The repository contains multiple internally‑authored audit reports that reach a **"GO LIVE WITH CONDITIONS"** verdict (`SECURITY_AUDIT_REPORT.md:500`) and a functional audit listing **22 open issues, 0 critical open** (`AUDIT_REPORT_2026_06_24.md`, summary table). Independent of those self‑assessments, repository inspection surfaces several **unresolved engineering risks** (Section 20), most notably a documented **Supabase migration‑sync failure** (`KNOWN_ISSUES.md:1`) and an **admin‑dashboard materialized‑view migration that references columns which do not exist in the baseline schema** (Section 6.7). Production readiness therefore **cannot be confirmed from the repository alone**.

**Current development phase.** The most recent commits concern UI/RTL responsiveness fixes, clinician‑access hardening, and admin dashboards (`git log`: `a546ac8`, `2b5ef8e`, `7bfbef3`, `0331c08`). Internal docs describe a **Phase 4 (dashboards)** as the latest completed phase (`git log` `0331c08 "Phase 4 dashboards…"`).

**Recently completed phases (per repository evidence).**
- Phase 1 — Admin dashboard performance foundation (`PHASE_1_COMPLETION_REPORT.md`, `KNOWN_ISSUES.md`).
- Phase 2 — Executive KPI dashboard + trend charts (`git log` `8979aac`, `e6a921e`, `930b601`).
- Phase 3 — Clinical Risk Dashboard v1 (`git log` `fd88b51`, PR #18).
- Phase 4 — Dashboards + audit‑bug fixes (`git log` `0331c08`, PR #21).
- A 15‑phase security‑hardening programme (`SECURITY_AUDIT_REPORT.md`).

**Major architectural milestones.** (1) RLS‑enforced multi‑tenant data model with `get_my_role()` SECURITY DEFINER helper to avoid policy recursion; (2) consent‑based clinician↔patient sharing system (`supabase/migrations/20260624120000_clinician_patient_consent_system.sql`); (3) atomic assessment submission via `submit_assessment_atomic()` RPC; (4) AI safety scaffolding (PHI scrubber, budget circuit‑breaker, per‑user AI rate limits, crisis‑keyword interception).

**Current strengths.** Consistent RLS coverage (45 `ENABLE ROW LEVEL SECURITY`, 103 `CREATE POLICY` statements across migrations); server‑side scoring and IDOR‑guarded submission RPC; layered AI cost/abuse controls; bilingual content and RTL support; documented disaster‑recovery plan (`docs/DISASTER_RECOVERY.md`).

**Current limitations.** No repository‑defined CI (`.github/` absent); migration history is largely **stubbed** (72 of 100 migration files are 2‑line placeholders) with a single `schema_baseline` snapshot; the PHI scrubber is wired into only **one of five** AI endpoints; the account‑deletion endpoint only writes an audit record and does not delete data; and there is a documented migration‑sync blocker. See Sections 16–20.

---

## 2. Business Overview

**Business model.** Not explicitly documented as a commercial model in the repository. A Stripe MCP connector is configured for the workspace, but **no Stripe/billing/subscription code exists in the repository** (no payment routes, no Stripe SDK in `package.json`). Billing/monetisation is therefore **Unable to verify from repository.**

**Target users & roles.** Four roles are defined (`lib/types.ts:1`): `patient`, `clinician`, `admin`, `superadmin`. Role is stored on `public.profiles.role` and assigned at signup from `raw_user_meta_data.role` defaulting to `patient` (`handle_new_user()`, `supabase/migrations/20260619120000_schema_baseline.sql:590`).

**Clinical / patient journey (evidence‑based).**
1. **Registration** → Supabase Auth signUp; a trigger creates `profiles` and (for patients) `patient_profiles` (`handle_new_user()`).
2. **Onboarding** → `app/onboarding/page.tsx`; demographics captured into `patient_profiles`.
3. **Assessment** → patient selects an instrument (`app/(app)/assessments`) or package (`app/(app)/packages`), answers items, and submits. Scoring is computed **server‑side** in `app/api/submit-assessment/route.ts` and persisted atomically via `submit_assessment_atomic()`.
4. **Interpretation / reporting** → interpretation templates (`assessment_interpretation_templates`) and optional AI synthesis (`app/api/synthesis/route.ts`); PDF export (`app/(app)/packages/[id]/pdf-template.tsx`, `app/api/reports/route.tsx`, `@react-pdf/renderer`).
5. **Sharing (consent)** → patient issues an access code or accepts a clinician invitation; grants granular permissions (`relationship_permissions`); clinician gains scoped read access.
6. **Clinician workflow** → verified clinicians (`clinician_verifications.status='verified'`) view assigned patients (`app/(app)/patients`), write clinical notes (`clinical_notes`), assign assessments (`assessment_assignments`), and message patients (`messages`).
7. **Administration** → admins use `/x/control/*` (`app/x/control/(panel)`) for analytics, user management, assessment governance, high‑risk alerts, and exports.

**AI workflow.** Gemini 1.5 Flash powers: multi‑scale synthesis (`app/api/synthesis`), a supportive chat companion "Wafi" (`app/api/ai-chat`), assessment recommendation (`app/api/recommend-assessments`), package interpretation (`app/api/packages/[id]/interpret`), and clinical‑note drafting (`app/api/clinical-notes`). See Section 12.

**Currently supported features (verified in repo).** Bilingual assessments & packages; mood tracking (`mood_logs`); journaling (`journal_entries`); gratitude entries; AI chat & synthesis; clinician consent/sharing; clinical notes; secure messaging; admin analytics & KPI dashboards; PDF export; push‑notification token registration (`push_tokens`, `app/api/user/push-token`); mobile app (Expo).

**Planned future capabilities.** Roadmap items appear in `REMEDIATION_BACKLOG.md`, `AUDIT_REPORT_2026_06_24.md`, and `SECURITY_AUDIT_REPORT.md` (centralised logging, penetration testing, RUM, streaming exports, etc.). See Section 21. Any capability not evidenced in code is treated as planned, not implemented.

---

## 3. System Architecture

```
                     ┌──────────────────────────────────────────────┐
   Browser (web) ───►│  Next.js 14 App Router (Vercel)              │
   Expo app (mobile)─┤   • middleware.ts  → auth gate + CSP nonce   │
                     │   • app/(app), app/(auth), app/x/control     │
                     │   • app/api/*  (55 route handlers)           │
                     └───────┬───────────────────────┬──────────────┘
                             │ @supabase/ssr          │ service-role key
                             │ (anon key, RLS on)     │ (RLS bypass, server only)
                             ▼                        ▼
                     ┌──────────────────────────────────────────────┐
                     │  Supabase (Postgres 15)                       │
                     │   • Auth (JWT, cookies)                       │
                     │   • RLS policies + SECURITY DEFINER helpers   │
                     │   • RPCs, triggers, materialized views        │
                     │   • Realtime (messages)                       │
                     └───────┬──────────────────────────────────────┘
                             │ server-side fetch (connect-src allow-listed in CSP)
                             ▼
                     ┌──────────────────────────────────────────────┐
                     │  External services                            │
                     │   • Google Gemini 1.5 Flash (AI)             │
                     │   • Cloudflare Turnstile (CAPTCHA)           │
                     │   • Upstash Redis (optional rate-limit)      │
                     └──────────────────────────────────────────────┘
```

**Frontend.** Next.js 14.2.35 App Router, React 18, Tailwind CSS 3.4, Recharts, `lucide-react`. Route groups: `app/(auth)` (login/register/password), `app/(app)` (authenticated patient/clinician), `app/x/control` (admin), plus public marketing/legal pages (`app/page.tsx`, `app/privacy`, `app/terms`, `app/clinicians`, `app/contact`, `app/sample-result`).

**Backend.** Next.js Route Handlers under `app/api/*` (55 handlers). No separate backend service; business logic lives in route handlers + Postgres functions.

**Database.** Supabase Postgres 15 (`supabase/config.toml` `major_version = 15`). Exposed schemas `public`, `graphql_public`; `max_rows = 1000`.

**Authentication.** Supabase Auth via `@supabase/ssr` cookie sessions on web (`lib/supabase/server.ts`, `middleware.ts`) and `@supabase/supabase-js` with `expo-secure-store` on mobile (`mobile/lib/supabase.ts`). Admin console adds a second factor: a server PIN + HMAC‑signed `admin_session` cookie (`lib/admin-auth.ts`, `app/api/admin/login/route.ts`).

**Authorization.** Two coexisting models (Section 8): (a) **RLS** enforced in Postgres using `get_my_role()`/role checks and `profiles.assigned_clinician_id` scoping; (b) a **consent permission model** (`clinician_patient_relationships` + `relationship_permissions` + `check_relationship_permission()`), enforced in API handlers.

**Storage.** Supabase Storage `file_size_limit = 50MiB` (`supabase/config.toml`). No storage bucket definitions or storage RLS policies are present in migrations (`grep` for `storage.buckets`/`storage.objects` returns nothing) — **bucket configuration is Unable to verify from repository.** `clinician_verifications.document_urls` (jsonb) implies document uploads but no upload handler/bucket policy is in the repo.

**AI.** Google Gemini 1.5 Flash via REST (`lib/gemini.ts`), server‑side only, key from `GEMINI_API_KEY`.

**Infrastructure / deployment.** Vercel (`vercel.json` per‑route `maxDuration`; `next.config.js` security headers). Supabase for DB/Auth. Optional Upstash Redis for rate limiting (`lib/rate-limit/redis.ts`, `.env.example`).

**Request flow (web).** `middleware.ts` runs on every non‑static path: it (1) mints a per‑request CSP nonce via Web Crypto, (2) validates the Supabase session (`supabase.auth.getUser()`), (3) redirects unauthenticated users away from private routes and authenticated users away from auth pages, and (4) sets security headers + CSP. Route handlers then re‑check auth server‑side (never trusting the middleware alone).

**Auth flow.** Cookie‑based JWT (web) or Bearer token (mobile). `app/api/ai-chat/route.ts:46‑60` demonstrates dual support: `Authorization: Bearer <token>` verified via `admin.auth.getUser(token)`, else cookie session.

**Data flow.** Patient‑owned writes go through the anon/SSR client (RLS‑enforced) or, for multi‑step operations (submission, high‑risk notification), through the **service‑role admin client** after an explicit server‑side auth check (`app/api/submit-assessment/route.ts:80‑83`).

**AI request flow.** Auth → per‑user burst + daily rate‑limit (`checkRateLimit`) → global budget circuit‑breaker (`checkAiBudget`) → (recommend‑assessments only) PHI scrub → `callGemini()` with timeout + retry → JSON validation + length caps → response.

**Report generation.** React‑PDF renders result templates client/server‑side; `pdf_reports` records report metadata (instrument, band, language, interpretation source, actor role) for audit.

**Mobile communication.** Expo app talks directly to Supabase (Auth + data over RLS) and to the same Next.js AI endpoints via Bearer tokens (`mobile/lib/supabase.ts`, `app/api/ai-chat/route.ts`).

---

## 4. Repository Structure

| Path | Responsibility |
|---|---|
| `app/(auth)/` | Login, register, forgot/reset password, auth layout. |
| `app/(app)/` | Authenticated patient & clinician UI: dashboard, assessments, packages, mood, journal, insights, messages, patients, profile, clinician onboarding/verification, admin kpi‑dashboard/settings. |
| `app/x/control/` | Admin console ("control panel"): overview, analytics, users, assessments, results, risk, packages, announcements, audit, platform. Obfuscated base path `/x/control`. |
| `app/api/` | 55 Route Handlers (REST). Sub‑trees: `admin/*`, `auth/*`, `clinician/*`, `patient/*`, `packages/*`, `relationships/*`, `user/*`, plus assessment/AI/notification endpoints. |
| `app/` (root pages) | Public marketing/legal: `page.tsx`, `privacy`, `terms`, `clinicians`, `contact`, `sample-result`, `onboarding`, `robots.ts`, `sitemap.ts`, `error.tsx`, `not-found.tsx`, `auth/confirm`. |
| `lib/` | Shared libraries: Supabase clients, permissions, i18n, rate‑limit, gemini, security (`anonymizePHI`, `aiBudgetGuard`, `verifyTurnstile`, `file-export`), assessment content, severity labels, types. |
| `components/` | 22 React components (sidebar, crisis‑banner, notification‑bell, KPI cards, charts, language/dark toggles, Turnstile widget, etc.). |
| `supabase/migrations/` | 100 SQL migration files + `config.toml`. |
| `mobile/` | Expo/React‑Native app (Expo Router) with its own `package.json`, `lib/`, and screens. |
| `__tests__/security/` | Node `--test` security tests: `idor.test.ts`, `phi.test.ts`, `rls.test.ts`. |
| `load-tests/` | k6 load scenarios (100/250/500/1000 VUs) + `base.js`. |
| `docs/` | `DISASTER_RECOVERY.md`, `UI_UX_RESPONSIVE_AUDIT.md`, and this dossier. |
| `.agents/skills/` | Vendored Supabase Postgres best‑practice agent skills (documentation only). |
| Root `*.md` | Internal audit/plan reports (see Section 19). |

**Legacy code.** The `profiles.assigned_clinician_id` clinician‑scoping model (used throughout RLS in `schema_baseline.sql`) predates and coexists with the newer consent model; migration `20260613114105_clinician_patient_assignment_enforcement.sql` (stub) and `20260624120000_clinician_patient_consent_system.sql` show the transition. Both are live — see Section 8 (legacy compatibility).

**Dead / experimental code.** `vw-test.js` (root) is a Playwright smoke script referencing a hard‑coded local Playwright path (`/opt/node22/lib/node_modules/playwright`) and `http://localhost:3000` — a developer harness, not wired into `package.json` scripts. `Package.is_prototype` and `packages` seeded as prototypes indicate experimental content (`lib/types.ts:184`). Some UI routes (`adhd-zones`, `insights`, `mood`) exist both as web pages and mobile screens.

**Shared libraries / utilities.** `lib/i18n.ts` + `lib/use-lang.ts` + `lib/get-language.ts` (localisation); `lib/severity-labels.ts` + `lib/severity-labels.ar.json` (band localisation); `lib/countries.ts`; `lib/permissions.ts` (permission labels).

---

## 5. Technology Stack

| Layer | Technology | Version (evidence) | Why it is used |
|---|---|---|---|
| Web framework | Next.js (App Router) | `14.2.35` (`package.json`) | SSR/edge middleware, route handlers, file‑based routing. |
| UI runtime | React / React‑DOM | `^18` | Component model. |
| Styling | Tailwind CSS + `@tailwindcss/forms` | `^3.4.0` / `^0.5.9` | Utility‑first CSS, RTL utilities. |
| Charts | Recharts | `^2.13.0` | Admin trend/KPI charts. |
| Icons | lucide-react | `^0.454.0` | Icon set. |
| PDF | `@react-pdf/renderer` | `^4.5.1` | Client/server PDF export. |
| Auth/DB SDK | `@supabase/ssr`, `@supabase/supabase-js` | `^0.6.0`, `^2.45.4` | Cookie‑session SSR auth + data access. |
| Database | Supabase Postgres | major 15 (`config.toml`) | Managed Postgres, Auth, RLS, Realtime, Storage. |
| AI | Google Gemini 1.5 Flash (REST) | endpoint `v1beta/models/gemini-1.5-flash` (`lib/gemini.ts:1`) | Synthesis, chat, interpretation, note drafting. |
| CAPTCHA | Cloudflare Turnstile | `lib/security/verifyTurnstile.ts` | Bot/abuse protection on auth & guest flows. |
| Rate‑limit store | Supabase table (default) / Upstash Redis (optional) | `lib/rate-limit.ts`, `lib/rate-limit/redis.ts` | Abuse & AI‑cost control. |
| Language | TypeScript | `^5`, `strict: true` (`tsconfig.json`) | Type safety. |
| Lint | ESLint + `eslint-config-next` | `^8` / `14.2.35` | Static checks (`ignoreDuringBuilds:false`). |
| Mobile | Expo / React Native / Expo Router | `expo ~54`, `react-native 0.79.6`, `react 19.0.0`, `expo-router ~5.1.11` (`mobile/package.json`) | Cross‑platform mobile. |
| Mobile secure storage | `expo-secure-store` | `~14.2.4` | Session token storage. |
| Mobile styling | NativeWind + Tailwind | `^4.0.1` | Shared styling idiom. |
| Load testing | k6 | `load-tests/*` | Synthetic load scenarios. |

> **Version discrepancy (evidence).** `SECURITY_AUDIT_REPORT.md:517` and `:461` claim "Next.js 15.5.19" was adopted, but `package.json` pins `next 14.2.35` and `eslint-config-next 14.2.35`. `AUDIT_REPORT_2026_06_24.md` (SEC‑004) lists "Next.js CVEs — Requires Next 15" as **open**. The repository state is Next 14.2.35; the "Next 15" claim is **not** reflected in code.

---

## 6. Database Architecture

Primary evidence: `supabase/migrations/20260619120000_schema_baseline.sql` (1,188 lines — the authoritative snapshot of 72 prior migrations) plus later migrations.

### 6.1 Tables (43 in `public`)
Core identity: `profiles`, `patient_profiles`, `clinician_profiles`.
Assessments: `assessment_definitions`, `assessment_items`, `assessment_governance`, `assessment_interpretation_templates`, `assessment_submissions`, `assessment_assignments`, `assessment_responses`, `ai_insights`, `personality_results`.
Packages: `packages`, `package_assessments`, `package_sessions`, `package_results` (created in `20260620100000_create_packages_tables.sql` / `20260621000000_package_sessions.sql`).
Clinical collaboration: `clinician_verifications`, `patient_access_codes`, `clinician_invitations`, `clinician_patient_relationships`, `relationship_permissions`, `clinical_notes`, `session_notes`, `messages`, `invitations`.
Wellbeing: `mood_logs`, `journal_entries`, `gratitude_entries`, `wellness_plans`, `medications`, `medication_alerts`.
Content/CMS: `content_articles`, `cms_sections`, `platform_announcements`, `dismissed_announcements`, `feature_flags`, `consent_documents`, `user_consents`, `platform_settings`.
Ops/telemetry: `audit_log`, `notifications`, `notification_events`, `notification_log`, `push_tokens`, `rate_limit_log`, `chat_sessions`, `pdf_reports`.

### 6.2 Relationships & foreign keys
Nearly all domain tables reference `public.profiles(id)` (which itself references `auth.users`). Representative FKs: `assessment_submissions.patient_id → profiles.id`, `assessment_responses.submission_id → assessment_submissions.id (ON DELETE CASCADE)`, `relationship_permissions.relationship_id → clinician_patient_relationships.id (CASCADE)`, `assessment_assignments.{patient_id,clinician_id} → profiles.id`. Uniqueness constraints enforce integrity, e.g. `mood_logs UNIQUE(patient_id, log_date)`, `clinician_patient_relationships UNIQUE(clinician_id, patient_id)`, `patient_access_codes` partial unique index "one active code per patient".

### 6.3 Indexes
The baseline defines composite/partial indexes tuned for common access paths (`schema_baseline.sql:506‑543`), e.g. `idx_assessment_submissions_patient_submitted(patient_id, submitted_at DESC)`, `idx_notifications_user_unread … WHERE read_at IS NULL`, `idx_rate_limit_log_key_created`. Additional performance‑index migrations exist (`ws3_performance_indexes`, `20260622010000_perf_indexes`, `20260624190000_compound_performance_indexes`, `20260619093251_add_performance_indexes`, `add_missing_fk_indexes_v2`) — all present as **stub placeholders** except where captured in later non‑stub files.

### 6.4 Functions (Postgres)
`get_my_role()` (SECURITY DEFINER, breaks RLS recursion), `is_admin()`, `current_user_role()`, `handle_new_user()` (profile bootstrap trigger fn), `handle_updated_at()`, `prevent_role_self_escalation()`, `expire_stale_invitations()`, `cleanup_rate_limit_log()`, `prune_rate_limit_log()`, `enforce_governance_before_activation()`, `enforce_article_review()`, `generate_patient_access_code()`, `check_relationship_permission()`, `check_and_record_rate_limit()`, `submit_assessment_atomic()`, plus admin analytics RPCs: `get_admin_dashboard_stats`, `get_assessment_completion_funnel`, `get_assessment_performance_comparison`, `get_demographics_breakdown`, `get_high_risk_patients`, `get_patient_risk_profile`, `get_top_assessments`, `get_user_engagement_metrics`.

> **`has_clinician_access()`** — the dossier template asks specifically about this function. **A function named `has_clinician_access()` does not exist anywhere in the repository** (no match in `supabase/migrations/`, `app/`, or `lib/`). The equivalent capability is provided by `check_relationship_permission(p_clinician_id, p_patient_id, p_permission)` (`20260624120000_clinician_patient_consent_system.sql:290`) for the consent model, and by `profiles.assigned_clinician_id` predicate checks inside RLS policies for the legacy model. Any reference to `has_clinician_access()` elsewhere is **Unable to verify from repository.**

### 6.5 Triggers
`on_auth_user_created` (AFTER INSERT on `auth.users` → `handle_new_user`), `prevent_role_escalation` (BEFORE UPDATE on `profiles`), `set_profiles_updated_at` / `set_patient_profiles_updated_at` / `set_chat_sessions_updated_at` (updated_at maintenance), `enforce_governance_on_activation` (BEFORE UPDATE on `assessment_definitions` — blocks activation without complete psychometric governance), `enforce_article_review_before_publish` (BEFORE UPDATE on `content_articles`), and `packages_updated_at`.

### 6.6 Views / materialized views
Materialized views (`20260627220000_admin_dashboard_materialized_views.sql`): `admin_daily_stats`, `admin_assessment_stats`, `admin_user_engagement_stats`, `admin_high_risk_alerts`, `admin_demographics_summary`. A "current user consent" view is referenced by the WS5 stub migrations (`ws5_u3_current_user_consent_view`). Refresh is documented as "via pg_cron every hour" (`…materialized_views.sql:3`) but **no `cron.schedule(...)` call is present in the repository** — scheduling is **Unable to verify from repository.**

### 6.7 Data‑integrity finding: materialized‑view / schema mismatch (evidence)
`20260627220000_admin_dashboard_materialized_views.sql` references columns that **do not exist** on `public.profiles` per the baseline: `p.user_type` (lines 55, 71, 118, 120, 129, 131, 140), `p.full_name` (line 85), and `p.email` (line 87). The baseline `profiles` table has `role`, `full_name_en`, `full_name_ar` and no `email`/`user_type` (`schema_baseline.sql:20‑37`). The same file also contains **SQL syntax errors** — stray single quotes inside `IS NOT NULL')` at lines 129 and 140. As written, these `CREATE MATERIALIZED VIEW` statements would fail to execute against the baseline schema. This is consistent with the documented **migration‑sync failure** in `KNOWN_ISSUES.md`. Whether the deployed database differs from the repository is **Unable to verify from repository.**

### 6.8 Extensions
`config.toml` sets `extra_search_path = ["public","extensions"]`. Functions use `gen_random_uuid()` and `gen_random_bytes()` (pgcrypto). **No explicit `CREATE EXTENSION` statement exists in migrations** — extension enablement is assumed via Supabase defaults and is **Unable to verify from repository.**

### 6.9 Migration history & schema maturity
100 migration files spanning `20260524…` to `20260628…`. **72 of the first files are 2‑line stubs** ("Applied directly to remote database; stub preserved for migration history"), consolidated by `20260619120000_schema_baseline.sql`. Post‑baseline migrations (packages, atomic submit, consent system, admin dashboards) are real SQL. The schema is **broad and mature in surface area** but the migration mechanism is **fragile**: history is not fully reproducible from `supabase db reset` alone because early state lives only in the baseline snapshot, and the newest matview migration is internally inconsistent (6.7).

---

## 7. Authentication

**Signup.** Supabase Auth email/password. `handle_new_user()` trigger inserts a `profiles` row with role from `raw_user_meta_data.role` (default `patient`) and creates `patient_profiles` for patients (`schema_baseline.sql:590‑612`). Email confirmations are **disabled** in `config.toml` (`[auth.email] enable_confirmations = false`) — email verification is not enforced at the DB‑config level in the repo. A confirmation route exists (`app/auth/confirm/route.ts`) for the flows where it is used.

**Login.** `app/(auth)/login/page.tsx` → Supabase `signInWithPassword`. A pre‑check endpoint `app/api/auth/check-login-limit` and Turnstile verification (`app/api/auth/verify-captcha`) provide brute‑force/bot mitigation. `git log 3132647` notes login is not locked out when Turnstile fails to load (fail‑open on CAPTCHA availability, by design).

**Password reset.** `app/(auth)/forgot-password` + `app/api/auth/forgot-password/route.ts`; reset at `app/(auth)/reset-password`. `git log 2b5ef8e` (HIGH‑03) redirects authenticated users away from `/reset-password`.

**Sessions & JWT.** Supabase JWT, `jwt_expiry = 3600` (1h), refresh‑token rotation enabled, `refresh_token_reuse_interval = 10` (`config.toml`). Sessions are cookie‑based on web via `@supabase/ssr`; `middleware.ts` calls `supabase.auth.getUser()` on each request.

**Cookies.** Supabase auth cookies managed by `@supabase/ssr`. The admin second factor is a separate `admin_session` cookie: `httpOnly, secure, sameSite:'lax', path:'/', maxAge: 8h` (`app/api/admin/login/route.ts:58‑61`).

**Token storage.** Web: HTTP cookies (not `localStorage`). Mobile: `expo-secure-store` (`mobile/lib/supabase.ts`).

**Multi‑tab / refresh.** Handled by Supabase client auto‑refresh; mobile subscribes to `onAuthStateChange` (`mobile/lib/useAuth.ts:18`).

**Role assignment.** At signup via metadata; changes are guarded by `prevent_role_self_escalation()` trigger (only admins/superadmins may change `role`) (`schema_baseline.sql:614`).

**Admin authentication.** Two‑factor: (1) Supabase password login **and** (2) a shared `ADMIN_PIN` env value, combined into an HMAC‑SHA256 `admin_session` cookie bound to `userId:role` (`lib/admin-auth.ts:6‑13`). `requireAdmin()` re‑verifies the Supabase user, the `profiles.role ∈ {admin,superadmin}`, and that the cookie equals the recomputed HMAC (so revoking the role invalidates existing cookies). Admin login is IP rate‑limited (5/15min) and logs failures to `audit_log` with unified error messages to prevent factor enumeration (`app/api/admin/login/route.ts:11‑47`).

**Current security model (summary).** Cookie‑JWT primary auth + DB‑enforced RLS; admin console gated by PIN+HMAC; middleware provides a first‑line redirect gate but authorization is always re‑checked server‑side in handlers and in Postgres RLS.

---

## 8. Authorization

**Permission model.** Role‑based (`Role = patient|clinician|admin|superadmin`, `lib/types.ts:1`) plus a **granular capability model** for clinician↔patient data sharing.

**Canonical `PermissionKey`.** Defined in `lib/types.ts:271‑294` as a 10‑value union and mirrored constant:
```
view_profile, view_assessment_results, view_assessment_history, view_reports,
view_progress_tracking, view_mood_tracking, export_reports, message_patient,
upload_documents, generate_clinical_notes
```
`ALL_PERMISSION_KEYS` (`lib/types.ts:283`) enumerates all ten. The **same list is enforced at the database layer** via a `CHECK` constraint on `relationship_permissions.permission_key` (`20260624120000_clinician_patient_consent_system.sql:172‑183`), and human‑readable bilingual labels live in `lib/permissions.ts` (`PERMISSION_LABELS`). `DEFAULT_REQUESTED_PERMISSIONS` (`lib/permissions.ts:16`) is a 4‑key subset used when a clinician requests access.

> **Note:** API routes re‑declare a local `VALID_PERMISSION_KEYS`/`PermissionKey` (`app/api/relationships/[id]/permissions/route.ts:17`, `app/api/access-requests/[id]/route.ts:20`) and the patient UI re‑declares `ALL_PERMISSIONS` (`app/(app)/patient/clinicians/page.tsx:38`). The canonical list is thus duplicated in ≥4 places — a maintainability risk (Section 18).

**Relationship permissions.** Stored in `relationship_permissions` (one row per `(relationship_id, permission_key)`, `granted` boolean, audit columns `granted_at`/`revoked_at`/`modified_by`). Only the patient (or admin) may write them (`rp_patient_manage` policy). Both parties may read (`rp_parties_read`).

**`check_relationship_permission()`** (the consent‑model authority; `has_clinician_access()` does not exist — see 6.4): a `STABLE SECURITY DEFINER` SQL function returning true iff an **active** relationship exists between the clinician and patient **and** the requested permission row is `granted = true` (`…consent_system.sql:290‑311`). Granted to `authenticated`.

**RLS architecture.** 45 tables have RLS enabled; 103 policies across migrations. Pattern:
- Ownership: `USING ((SELECT auth.uid()) = patient_id)` for patient‑owned tables (mood, journal, gratitude, ai_insights, personality_results, pdf_reports, wellness_plans, notifications).
- Role escalation: admin/superadmin bypasses via `get_my_role() = ANY(ARRAY['admin','superadmin'])`.
- **Legacy clinician scoping**: many clinician read policies key off `profiles.assigned_clinician_id = auth.uid()` (e.g. `submissions_clinician`, `mood_clinician`, `responses_clinician`, `session_notes` policies, `clinician_own_notes`) rather than the consent tables. This is the **legacy compatibility** layer.
- `get_my_role()` is SECURITY DEFINER to prevent infinite recursion when a `profiles` policy needs the caller's role (`fix_get_my_role_security_definer`, `fix_profiles_self_read_rls_recursion` migrations).

**API authorization.** Handlers independently enforce auth: `auth.getUser()` (28 routes), `requireAdmin()` (all 22 `app/api/admin/*` routes), and permission checks for relationship operations. Multi‑step operations use the **service‑role admin client** (39 routes) only *after* an explicit auth check, with `patient_id` pinned to `user.id` server‑side (`app/api/submit-assessment/route.ts:80‑83`).

**Permission enforcement (IDOR defence).** `submit_assessment_atomic()` raises `42501` if `auth.uid() <> p_patient_id` (`…submit_assessment_atomic_fn.sql:31`). Assignment completion is scoped by `patient_id + definition_id + status='pending'` so a patient cannot close another's assignment (`submit-assessment/route.ts:195‑206`). `__tests__/security/idor.test.ts` and `rls.test.ts` assert these boundaries.

**Legacy compatibility.** The `assigned_clinician_id` (single assigned clinician) model and the consent (many‑relationship, granular) model are both live. RLS still trusts `assigned_clinician_id`; the API/consent layer adds `check_relationship_permission()`. **These two models are not unified** — a clinician set as `assigned_clinician_id` gains RLS read access to submissions/mood independent of `relationship_permissions` grants. This dual‑authority design is the single most important thing a reviewer must understand (Section 20 / risk).

**Current security posture.** RLS coverage is broad and role checks are consistent; the notable gaps are (a) the dual clinician‑authorization model, (b) service‑role usage in 39 routes (each a place where a missing auth check would bypass RLS entirely), and (c) materialized views that cannot enforce RLS (mitigated by revoking `anon`/`authenticated` grants — see Section 13).

---

## 9. API Inventory

55 route handlers under `app/api/`. Auth conventions: **U** = requires Supabase user (`auth.getUser`); **A** = requires admin (`requireAdmin`); **SR** = uses service‑role admin client server‑side; **RL** = rate‑limited; **Guest** = intentionally unauthenticated. (Counts: 28 U, 22 A, 39 SR, 30 RL.)

### Patient / assessment
| Route | Method(s) | Auth | Purpose / Notes |
|---|---|---|---|
| `api/submit-assessment` | POST | U, SR, RL(20/h) | Server‑side scoring, safety‑item & threshold high‑risk detection, atomic persist, admin high‑risk notify, audit. |
| `api/submit-assessment-guest` | POST | Guest, SR, RL, Turnstile | Anonymous submission with CAPTCHA + abuse protections (`guest_abuse_protections` migration). |
| `api/score-assessment` | POST | U | Scoring helper. |
| `api/check-rescreening` | GET/POST | U | Determines if re‑screening due. |
| `api/recommend-assessments` | POST | U, RL, AI | **Only endpoint that applies `scrubPHI` before Gemini.** |
| `api/packages/[id]/compute` | POST | U, SR | Compute package composite result. |
| `api/packages/[id]/interpret` | POST | U, RL, AI | AI package interpretation. |
| `api/reports` | POST | U | PDF/report generation (`route.tsx`, React‑PDF). |
| `api/synthesis` | POST | U, RL(2/min,10/day), AI | Multi‑scale AI synthesis; JSON‑validated + length‑capped. |
| `api/ai-chat` | POST | U (cookie or Bearer), RL(20/min,100/day), AI | "Wafi" companion; crisis‑keyword intercept (EN+AR); no PHI scrub. |

### Clinician / relationships
| Route | Method(s) | Auth | Purpose |
|---|---|---|---|
| `api/clinician/invite` | POST | U | Create clinician→patient invitation. |
| `api/clinician/patients` | GET | U | List clinician's patients. |
| `api/clinician/verification` | GET/POST | U | Submit/read verification. |
| `api/clinical-notes` | POST | U, AI | AI‑assisted note drafting (maxDuration 30). No PHI scrub before Gemini. |
| `api/relationships/[id]` | … | U | Relationship lifecycle. |
| `api/relationships/[id]/permissions` | PATCH | U | Grant/revoke permissions (patient‑controlled). |
| `api/access-requests`, `…/[id]` | GET/POST/PATCH | U | Clinician access requests. |
| `api/connect/[token]` | GET/POST | token | Accept invitation by token. |
| `api/patient/code` | GET/POST | U | Issue/rotate patient access code. |
| `api/patient/relationships` | GET | U | Patient's clinician relationships. |
| `api/assignments` | GET/POST | U | Assessment assignments. |
| `api/notify-high-risk`, `api/notify-message` | POST | SR | Internal notifications. |
| `api/notifications` | GET/PATCH | U | User notifications. |

### Admin (all `requireAdmin`)
`api/admin/login` (POST/DELETE), `api/admin/analytics`, `api/admin/announcements`, `api/admin/assessments` + `[id]`, `api/admin/clinician-verifications`, `api/admin/dashboard/{stats,assessments,demographics,engagement,risk}`, `api/admin/export` (maxDuration 60), `api/admin/flags`, `api/admin/kpis` + `[kpiId]/alert` + `history`, `api/admin/packages` + `analytics` + `export`, `api/admin/research` (maxDuration 45), `api/admin/results`, `api/admin/settings`, `api/admin/users`.

### User / account / infra
`api/user/export-data` (GDPR data export, U), `api/user/delete-request` (U, RL 1/h — **audit‑log only, no actual deletion**, `delete-request/route.ts`), `api/user/push-token` (U), `api/auth/{check-login-limit,check-signup-limit,forgot-password,verify-captcha}`, `api/health` (health check), `api/auth/confirm` (email confirm).

**Inputs/outputs/security (representative).** JSON in/out; inputs validated server‑side (e.g. submit‑assessment caps responses at 200 items, validates each value against the item's allowed options, deduplicates item IDs to prevent score inflation — `submit-assessment/route.ts:94‑157`). Errors return generic messages (`{error: 'Server error'}`) without stack traces. Rate‑limit fails **closed** for security‑critical endpoints (`lib/rate-limit.ts:21‑26`). No API returns raw DB errors to clients (errors are `console.error`‑logged server‑side only).

---

## 10. Frontend

**Application structure.** Next.js App Router with three route groups (`(auth)`, `(app)`, `x/control`) plus public pages. 44 `page.tsx` files.

**Routing.** File‑based; dynamic segments for `assessments/[id]`, `packages/[id]`, `connect/[token]`, admin `assessments/[assessmentId]`. `middleware.ts` gates private prefixes and admin area.

**Components.** 22 shared components (`components/`), incl. `sidebar.tsx`, `crisis-banner.tsx` (crisis resources, dismissible per a11y fix `5cb3694`), `notification-bell.tsx`, `mental-health-radar.tsx`, `kpi-trend-charts.tsx`, `kpi-card-enhanced.tsx`, `language-toggle.tsx`, `dark-mode-toggle.tsx`, `TurnstileWidget.tsx`, `ai-assessment-finder.tsx`, `synthesis-card.tsx`, `rescreening-trigger.tsx`.

**Layouts.** Root `app/layout.tsx` (global metadata, CSP nonce plumbing), group layouts `app/(app)/layout.tsx`, `app/(auth)/layout.tsx`, `app/x/control/(panel)/layout.tsx`, `app/(app)/clinician/layout.tsx`.

**Internationalisation.** Custom dictionary in `lib/i18n.ts` (`Lang = 'en'|'ar'`), consumed via `lib/use-lang.ts`/`lib/get-language.ts`. Assessment content is duplicated per language (`lib/assessment-content.ts`, `lib/assessment-content-ar.ts`) and severity labels localised (`lib/severity-labels.ts`, `.ar.json`). `git log fdd4742` localised severity‑band labels in Arabic (MED‑02).

**Accessibility.** WCAG work is documented (`git log 9cab460 "Unit 10"`, `5cb3694` notification/crisis a11y). `docs/UI_UX_RESPONSIVE_AUDIT.md` covers responsive/RTL. `AUDIT_REPORT_2026_06_24.md` lists open a11y items ACC‑001 (contrast), ACC‑002 (aria‑live on the bell). See Section 20.

**Responsive design / RTL.** RTL is a first‑class concern; latest commit `a546ac8` is a "responsive and RTL audit — apply fixes across app." Tailwind config (`tailwind.config.ts`) + `globals.css` provide the system.

**State management.** No external state library; React hooks + Supabase client. Server components fetch directly; client components (`*-content.tsx`, `dashboard-client.tsx`) manage local state.

**Forms & validation.** Native forms + `@tailwindcss/forms`; validation is server‑authoritative (route handlers) with client‑side hints. `AUDIT_REPORT_2026_06_24.md` F‑003 flags weak client‑side password validation (open).

---

## 11. Mobile Application

**Current implementation.** Expo (SDK ~54) app under `mobile/` using Expo Router (`~5.1.11`), React Native 0.79.6, React 19, NativeWind. Screens: onboarding, auth (login/register/forgot/reset), and `(app)` tabs — dashboard, assessments (`index`, `[id]`), results, mood, journal, messages, ai, profile, settings, resources (`index`, `[slug]`), plus `emergency`, `privacy`, `terms` (`mobile/app/**`).

**Architecture.** Expo Router file‑based navigation; shared libs in `mobile/lib/` (`supabase.ts`, `useAuth.ts`, `hooks.ts`, `i18n.ts`, `LocaleContext.tsx`, `theme.ts`, `notifications.ts`, `types.ts`). Build config via `eas.json`, `app.json`.

**Authentication.** Supabase JS client with session persisted in `expo-secure-store`; `useAuth()` subscribes to `onAuthStateChange` and fetches the profile (`mobile/lib/useAuth.ts`). AI endpoints are reached with `Authorization: Bearer <access_token>` (server side handled in `app/api/ai-chat/route.ts`).

**Offline support.** `@react-native-async-storage/async-storage` is a dependency, but **no explicit offline queue/cache logic is evident** in `mobile/lib`. Offline capability beyond session persistence is **Unable to verify from repository.**

**Feature parity.** Broad parity for patient flows (assessments, mood, journal, messages, AI, results, resources). Clinician and admin surfaces appear **web‑only** (no clinician/admin screens under `mobile/app`).

**Known gaps (evidence).** `AUDIT_REPORT_2026_06_24.md` AE‑001 (High, open): "Mobile scoring" — expectation that scores are computed server‑side and consistent with web; flagged for verification. Push notifications: `mobile/lib/notifications.ts` + `expo-notifications` + web `api/user/push-token` + `push_tokens` table exist; end‑to‑end delivery is **Unable to verify from repository.**

---

## 12. AI Architecture

**Gemini integration.** Single REST client `lib/gemini.ts` targeting `gemini-1.5-flash` (`v1beta:generateContent`), with a 15s timeout (`AbortController`), retry on 429/500/502/503 up to 3 attempts with capped exponential backoff. API key from `GEMINI_API_KEY` (server‑only).

**Prompt pipeline.** Each AI route builds a system instruction + user contents and calls `callGemini`. Examples: `synthesis` (compassionate‑clinician JSON schema, temp 0.2, 1024 tokens), `ai-chat` ("Wafi" companion, temp 0.7, 512 tokens, ≤10‑turn history), `clinical-notes`, `packages/[id]/interpret`, `recommend-assessments`.

**PHI protection.** `lib/security/anonymizePHI.ts` provides regex‑based scrubbing (emails, MRNs, Saudi national ID/Iqama, phones, DOBs, addresses, name‑intro patterns) returning replacement counts, explicitly documented as **defence‑in‑depth, not NLP‑grade**. **Evidence of wiring:** `scrubPHI`/`anonymizePHI` is imported only by `app/api/recommend-assessments/route.ts` (and the test). The other four Gemini callers — `synthesis`, `ai-chat`, `clinical-notes`, `packages/[id]/interpret` — **do not invoke the scrubber**. `synthesis` sends assessment names/scores/dates (structured, low‑PHI); however **`ai-chat` forwards the raw user message** (free text that may contain PHI) and **`clinical-notes` forwards note content** to Gemini without scrubbing. This is a concrete privacy finding (Sections 14, 20).

**Output validation.** `synthesis` parses the first `{…}` block, validates field types and the `overall_tone` enum, and caps all string fields to 5,000 chars before returning (`synthesis/route.ts:129‑159`). `ai-chat` validates history roles to resist prompt injection via history (`ai-chat/route.ts:112‑118`).

**Safety controls.** `ai-chat` intercepts crisis keywords (English + Arabic list) **before** any API call and returns localized crisis‑line guidance with `emergency:true` (`ai-chat/route.ts:23‑107`). System prompts forbid diagnosis/prescription and mandate crisis redirection. High‑risk assessment results trigger admin notifications server‑side.

**Rate limits & cost controls.** Per‑user burst + daily limits via `checkRateLimit` (synthesis 2/min & 10/day; ai‑chat 20/min & 100/day). A **global budget circuit‑breaker** `checkAiBudget()` estimates daily spend from `rate_limit_log` and returns 503 when `AI_DAILY_BUDGET_USD` (default $50) is exceeded (`lib/security/aiBudgetGuard.ts`).

**Future AI roadmap.** Not formally specified in the repo beyond interpretation‑template governance and AI‑insight persistence (`ai_insights`, `assessment_interpretation_templates`). Any further roadmap is **Unable to verify from repository.**

---

## 13. Security

**Authentication.** See Section 7 (cookie‑JWT, admin PIN+HMAC, rotation, rate‑limited admin login, unified error messages).

**Authorization.** See Section 8 (RLS across 45 tables/103 policies; consent model; IDOR‑guarded RPC).

**RLS.** Broad and consistent; SECURITY DEFINER role helper avoids recursion. Materialized views cannot enforce RLS — `20260628071704_revoke_admin_matview_api_access.sql` **revokes `anon`/`authenticated` grants** on the `admin_*` matviews (which include patient names + high‑risk scores in `admin_high_risk_alerts`), leaving only `service_role` — a correct mitigation of a real prior exposure.

**Secrets.** `.env.example` documents required/optional env vars. `.gitignore` excludes `.env*.local`. Service‑role key is used only in server code (`lib/supabase/admin.ts`); anon key is the only client‑exposed key. No secrets are committed in the inspected files. `next.config.js` sets `poweredByHeader:false` (removes `X-Powered-By`; note `AUDIT_REPORT_2026_06_24.md` SEC‑005 still lists it — likely stale).

**Headers.** `next.config.js` sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo off), and **HSTS** `max-age=63072000; includeSubDomains; preload`. `middleware.ts` adds `Cache-Control: no-store` to API responses.

**CSP.** Per‑request nonce (Web Crypto in edge middleware) locks `script-src` to `'self' 'nonce-…' https://challenges.cloudflare.com`; `style-src` intentionally allows `'unsafe-inline'` (documented tradeoff because inline `style=""` cannot carry a nonce — `middleware.ts:98‑103`; also `AUDIT_REPORT_2026_06_24.md` SEC‑001, open). `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `connect-src` allow‑lists Supabase + Gemini + Turnstile.

**CSRF.** Mitigated by SameSite cookies + `form-action 'self'` + JSON‑only APIs; no explicit anti‑CSRF token framework. Adequacy for state‑changing GETs is **Unable to verify from repository** beyond the above controls.

**Input validation.** Server‑authoritative in handlers (see Section 9); DB `CHECK` constraints on enums (roles implicit, permission keys, statuses).

**Logging & audit trails.** `audit_log` records actor/action/target/reason/ip/user_agent, with a self‑insert RLS policy (`audit_self_insert`) and admin‑only read. Submissions, admin login failures, and deletion requests are audited. Audit immutability is addressed in `20260613134046_rls_clinician_scope_and_audit_immutability.sql` (stub). `SECURITY_AUDIT_REPORT.md` flags **absence of centralised logging** (Datadog/Splunk) as an open medium risk.

**Security history / resolved findings.** `SECURITY_AUDIT_REPORT.md` documents a 15‑phase hardening programme; `AUDIT_REPORT_2026_06_24.md` marks SEC‑002 (rate‑limit race → atomic `check_and_record_rate_limit`), SEC‑006 (clinical‑notes auth, previously Critical), CW‑002/003 (messages/notes RLS), DB‑001/002/003 as **fixed**. `git log` corroborates: `7bfbef3` (clinician access hardening), `908011a` (matview Data‑API exposure W3), `97e2517`/`cc0a366` (CSP nonce/inline‑style fixes).

**Open findings (evidence).** Migration‑sync failure (`KNOWN_ISSUES.md`); matview/schema mismatch (6.7); PHI scrubber not applied to `ai-chat`/`clinical-notes` (12); CSP `unsafe-inline` styles (SEC‑001); registration CAPTCHA gap (SEC‑003/A‑001); Next.js version/CVE (SEC‑004); centralised logging absent; account‑deletion not implemented.

**Current security score.** The repository's own latest security self‑assessment is **94/100 "GO LIVE WITH CONDITIONS"** (`SECURITY_AUDIT_REPORT.md:450`, `:500`). This dossier does **not** independently certify that score; it records it as internal evidence and lists the open findings above.

---

## 14. Privacy & Compliance

*(Technical alignment only — no certification is claimed or implied.)*

**GDPR alignment.** Consent documents (`consent_documents`) + immutable consent ledger (`user_consents`, ON DELETE RESTRICT, with IP/user_agent/method) support lawful‑basis record‑keeping. Data export exists (`app/api/user/export-data`). **Data minimisation** for AI is partial (only `recommend-assessments` scrubs PHI — Section 12).

**Consent.** Granular, patient‑controlled sharing (`relationship_permissions`) with grant/revoke timestamps and `modified_by`. Consent taxonomy corrected in `ws5_1_u1_correct_consent_taxonomy` (stub).

**Deletion workflow (finding).** `app/api/user/delete-request/route.ts` only inserts an `account_deletion_requested` audit record and returns "scheduled within 30 days." **No automated erasure job, cascade, or admin deletion pipeline is present in the repository.** GDPR "right to erasure" is therefore **not technically implemented** — only requested/logged. Actual deletion is **Unable to verify from repository.**

**PHI handling.** RLS confines PHI to owners/authorised clinicians/admins; matview API exposure was revoked (Section 13). Gap: unscrubbed free‑text sent to Gemini from `ai-chat`/`clinical-notes` (Section 12). Gemini processing terms/BAA status are **Unable to verify from repository.**

**Audit logging.** Present for security‑relevant actions (Section 13); centralised aggregation absent.

**Retention.** `rate_limit_log` pruned (`cleanup_rate_limit_log`/`prune_rate_limit_log`, `schedule_rate_limit_cleanup` migration). Broader PHI retention policy is documented operationally in `docs/DISASTER_RECOVERY.md` (7‑day backup note) but **no automated data‑retention/expiry job for clinical data exists in the repo.**

**Healthcare privacy practices.** Crisis interception, disclaimers in AI prompts, emergency information (`mobile/app/emergency.tsx`, `components/crisis-banner.tsx`), clinician verification gating. HIPAA/SOC2/GDPR are **principles the code aligns toward in places**, not certifications.

---

## 15. Performance

**Current bottlenecks (documented).** `AUDIT_REPORT_2026_06_24.md`: AD‑001 admin analytics memory (open, P6‑1), AD‑002 export not streamed (open, P6‑2), P‑001 bundle size (open, P7‑2), P‑003 no RUM (open). `next.config.js` sets `poweredByHeader:false` but no explicit bundle‑analyzer/splitting config.

**Caching.** API responses set `Cache-Control: no-store` (correct for PHI). Admin aggregates precomputed via **materialized views** to avoid expensive live scans (Section 6.6), refreshed hourly per doc (scheduling unverified). No CDN/ISR caching config beyond Vercel defaults is present.

**Rendering.** App Router server components for data‑heavy pages; client components isolated to interactive islands (`*-content.tsx`).

**Database.** Composite/partial indexes for hot paths (Section 6.3); several dedicated index migrations; `submit_assessment_atomic` avoids N round‑trips by inserting submission + responses in one function.

**Bundle size.** Shared JS ≈ 87.6 kB per `KNOWN_ISSUES.md:89` (self‑reported build output). Independent measurement is **Unable to verify from repository.**

**API performance.** `vercel.json` raises `maxDuration` for heavy routes (clinical‑notes/synthesis 30/30s, ai‑chat 25s, admin export 60s, research 45s). Gemini calls have 15s timeouts + retry.

**Optimization history.** WS3 performance‑index migrations, `perf_indexes`, `compound_performance_indexes`, redundant‑index drop (`ws3_drop_redundant_duplicate_indexes`). Load‑test harness (`load-tests/`, k6, up to 1000 VUs) exists but **no result artifacts are committed** — measured throughput is **Unable to verify from repository.**

---

## 16. Testing

**Strategy.** Lightweight, security‑focused. `package.json` scripts: `test:security` (`tsx --test __tests__/security/*.test.ts`), `test:phi`, and k6 `load:100/250/500/1000`.

**Coverage.** Three security suites: `idor.test.ts` (14 cases), `phi.test.ts` (26 cases), `rls.test.ts` (11 cases). **No unit tests for business logic, no component tests, no E2E test suite wired into scripts.** `vw-test.js` is an ad‑hoc Playwright script (not in `package.json`, hard‑coded paths).

**Security tests.** IDOR boundaries, PHI scrubber behaviour, RLS expectations.

**Integration / RLS tests.** `rls.test.ts` documents/asserts RLS intent; whether it runs against a live DB or asserts policy text is defined by the file (Node `--test`). Coverage is narrow.

**Regression tests.** None beyond the security suites; no CI to run them automatically (Section 17).

**Known gaps.** No CI execution, no coverage reporting, no functional/E2E automation, no mobile tests. This is the weakest area relative to the platform's clinical sensitivity (Section 18/20).

---

## 17. DevOps

**GitHub workflow.** Branch‑and‑PR: history shows numerous merged PRs (`git log`: PR #16–#25). Branches follow `claude/<topic>` naming.

**Branch strategy.** Feature branches merged to the default branch via PRs; this work is on `claude/v-welfare-technical-dossier-fvah3o`.

**PR process.** Manual review + merge (per `git log` merge commits). **No repository‑defined CI:** `.github/` does not exist (no Actions workflows, no PR templates, no CODEOWNERS). CI referenced in docs ("Supabase Preview check", "Vercel build") is provided by the **Vercel/Supabase Git integrations**, not by repo‑committed pipelines. Absence of committed CI means `test:security`/`lint`/`build` are **not enforced automatically** on PRs from the repo itself.

**CI status.** `KNOWN_ISSUES.md` documents a persistent **Supabase Preview CI failure** ("Remote migration versions not found in local migrations directory"), attributed to remote/local migration drift, with the workaround "merge and deploy manually bypassing Vercel checks."

**Deployments.** Vercel (`vercel.json`); env vars set in Vercel/Supabase dashboards (documented in `.env.example`, `docs/DISASTER_RECOVERY.md §2.3`).

**Supabase migrations.** `supabase/migrations/` + `config.toml`; but 72 stubs + baseline snapshot + the drift issue make `supabase db push`/`reset` fragile (Section 6.9).

**Vercel.** Per‑route function durations; security headers via `next.config.js`.

**Rollback strategy.** Documented in `docs/DISASTER_RECOVERY.md §3, §6` (Vercel instant rollback to prior deployment; DB PITR restore; migration rollback guidance) and `DEPLOYMENT_ACTION_PLAN.md §Rollback Plan`.

---

## 18. Technical Debt

- **Architecture debt.** Dual clinician‑authorization models (`assigned_clinician_id` RLS vs consent `relationship_permissions`) not unified (Section 8). Service‑role client used in 39 routes — broad RLS‑bypass surface requiring perfect per‑route auth discipline.
- **Database debt.** Migration history mostly stubbed + single baseline snapshot; **migration‑sync failure** unresolved (`KNOWN_ISSUES.md`); admin matview migration references non‑existent columns and has SQL syntax errors (6.7); pg_cron refresh referenced but not defined.
- **Frontend debt.** `PermissionKey`/permission lists duplicated in ≥4 locations; assessment content duplicated across `assessment-content.ts` / `assessment-content-ar.ts`; open a11y items (contrast, aria‑live).
- **Backend/AI debt.** PHI scrubber applied to only 1 of 5 AI endpoints; account‑deletion endpoint is a stub (audit‑only).
- **Security debt.** CSP `style-src 'unsafe-inline'`; registration CAPTCHA gap; Next.js version/CVE item; no centralised logging.
- **Testing debt.** No CI enforcement; only 3 narrow security suites; no functional/E2E/mobile tests.
- **Documentation debt.** Internal docs drift from code (e.g. "Next 15.5.19" vs `next 14.2.35`; migration counts cited as 95/98 in `KNOWN_ISSUES.md` vs 100 files present). Multiple overlapping audit reports without a single source of truth (this dossier aims to consolidate).

---

## 19. Completed Milestones

*(Objectives/results per repository docs and `git log`; treat scores as self‑reported.)*

| Phase | Objective | Repository evidence | Result (self‑reported) |
|---|---|---|---|
| **Security 15‑phase programme** | Auth, authz, Supabase, OWASP, headers, uploads, deps, scanning | `SECURITY_AUDIT_REPORT.md` | 94/100, "GO LIVE WITH CONDITIONS". |
| **Phase 1 — Perf foundation** | Admin matviews, RPCs, indexes, 5 dashboard APIs, KPI components | `PHASE_1_COMPLETION_REPORT.md`, `KNOWN_ISSUES.md` | Code complete; deploy blocked by Supabase sync. |
| **Phase 2 — Executive KPI dashboard** | Real trend charts from `admin_daily_stats` | `git log` `8979aac`,`e6a921e`,`930b601` (PR #17) | Merged. |
| **Phase 3 — Clinical Risk Dashboard v1** | Risk views/RPCs | `git log` `fd88b51` (PR #18) | Merged. |
| **Phase 4 — Dashboards + audit fixes** | Dashboards + 3 critical audit‑bug fixes | `git log` `0331c08` (PR #21) | Merged. |
| **10‑Unit Security Remediation** | WCAG (Unit 10), CSP nonce, matview revoke, admin search i18n | `git log` `9cab460`,`97e2517`,`908011a` | Merged. |
| **Consent & collaboration system** | Verifications, access codes, invitations, relationships, granular permissions | `20260624120000_clinician_patient_consent_system.sql` | In schema. |
| **Pre‑go‑live hardening** | Clinician‑access hardening; audit blockers; RTL/responsive audit | `git log` `7bfbef3`,`2b5ef8e`,`fdd4742`,`a546ac8` | Latest commits. |
| **Functional audit 2026‑06‑24** | Full functional/security/perf/SEO/a11y sweep | `AUDIT_REPORT_2026_06_24.md` | 22 open, 0 critical open. |
| **DR plan** | Backup/restore/rollback runbook | `docs/DISASTER_RECOVERY.md` | Documented. |

---

## 20. Current Open Issues

**Critical (engineering‑blocking; from repository evidence — not the self‑audit).**
- **Supabase migration‑sync failure** — Preview/deploy blocked; workaround is manual bypass (`KNOWN_ISSUES.md`). Undermines reproducible deploys and DR.
- **Admin matview migration is invalid** against the baseline schema (non‑existent `user_type`/`email`/`full_name`, stray‑quote syntax errors) — `20260627220000_admin_dashboard_materialized_views.sql` (Section 6.7). If applied as‑is it fails; if the deployed DB has diverged, repo and prod are out of sync.

**High.**
- Dual/legacy clinician authorization model not unified (Section 8) — risk of over‑broad clinician access via `assigned_clinician_id` independent of consent grants.
- PHI sent unscrubbed to Gemini from `ai-chat` and `clinical-notes` (Section 12).
- Account deletion not implemented (audit‑only) — GDPR erasure gap (Section 14).
- No repository‑enforced CI; security/lint/build not gated on PRs (Section 17).
- `AUDIT_REPORT_2026_06_24.md` High‑severity open items: F‑010 (clinician‑verify admin UI), AE‑001 (mobile scoring verification).

**Medium.**
- CSP `style-src 'unsafe-inline'` (SEC‑001). Registration CAPTCHA gap (SEC‑003/A‑001). Session idle timeout (A‑002). Password‑strength validation (F‑003). Privacy/GDPR copy (F‑008). Admin analytics memory/export streaming (AD‑001/002). Next.js version/CVE posture (SEC‑004). Centralised logging absent. Demographics matview contains a pre‑existing SQL error (6.7).

**Low.**
- SEO: page titles/hreflang/robots/sitemap accessibility (SEO‑001..004, F‑007). Grammar "1 days" (D‑002). No RUM (P‑003). Stale doc claims (X‑Powered‑By SEC‑005; Next 15 references).

**Deferred / known limitations.**
- Storage buckets & storage RLS not in repo (document uploads implied but unverifiable). Offline mobile support unverifiable. pg_cron matview refresh unverifiable. Billing/monetisation not in repo.

---

## 21. Roadmap

*(Effort estimates are engineering judgement; risk/dependency noted. Items map to repository evidence.)*

**Immediate (launch‑blocking) priorities.**
1. **Resolve migration sync + fix the admin matview migration** so repo ↔ prod are consistent and `supabase db reset` reproduces prod. *Effort: M (1–2 days). Risk: High if skipped. Depends on: Supabase dashboard access.*
2. **Wire PHI scrubbing into `ai-chat` and `clinical-notes`** (reuse `scrubPHI`). *Effort: S (½ day). Risk: privacy/compliance. Depends on: none.*
3. **Implement (or clearly gate) account deletion** end‑to‑end. *Effort: M. Risk: GDPR. Depends on: retention policy decision.*
4. **Add repository CI** (GitHub Actions: `lint`, `build`, `test:security`, migration validation). *Effort: S–M. Risk: regressions. Depends on: none.*

**Short‑term.**
5. Unify clinician authorization on the consent model; retire/clearly bound `assigned_clinician_id` RLS reliance. *Effort: L. Risk: access‑control regressions — needs strong RLS tests.*
6. Centralised logging + alerting (Datadog/Splunk) per `SECURITY_AUDIT_REPORT.md`. *Effort: M.*
7. Close functional audit High items (F‑010 clinician‑verify UI, AE‑001 mobile scoring). *Effort: M.*
8. De‑duplicate `PermissionKey` into a single shared source. *Effort: S.*

**Medium‑term.**
9. Registration CAPTCHA, session idle timeout, password‑strength policy. *Effort: S each.*
10. Streaming exports & admin analytics memory fixes (AD‑001/002). *Effort: M.*
11. Bundle‑size reduction + enable RUM (Vercel Speed Insights). *Effort: S–M.*
12. Expand automated testing (functional/E2E + mobile), publish load‑test results. *Effort: L.*

**Long‑term.**
13. Formalise data‑retention/erasure automation and DR test cadence (`docs/DISASTER_RECOVERY.md §7`). *Effort: M.*
14. Decide Next.js upgrade path (14 → 15) with CVE review. *Effort: M. Risk: breaking changes.*
15. Storage bucket + upload pipeline with RLS for clinician‑verification documents. *Effort: M.*

---

## 22. CTO Summary

*(Concise, machine‑readable summary for downstream AI/architectural review.)*

- **Platform.** Bilingual (AR/EN, RTL) mental‑health assessment SaaS. Stack: Next.js 14.2.35 (App Router) on Vercel + Supabase Postgres 15 (Auth/RLS/Realtime) + Google Gemini 1.5 Flash; Expo mobile app; Cloudflare Turnstile; optional Upstash Redis.
- **Maturity.** Feature‑broad and security‑conscious, but operationally fragile. ~39k LOC app/lib/components/mobile; 55 API routes; 44 pages; 22 components; 43 tables; 100 migrations (72 stubbed + baseline); 5 matviews; ~24 Postgres functions; 6 triggers; 103 RLS policies.
- **Architecture quality.** Good separation (RLS in DB, auth re‑checked in handlers, server‑side scoring). Main structural debt: **dual clinician‑authorization model** (`assigned_clinician_id` vs consent `relationship_permissions`) and heavy service‑role usage (39 routes).
- **Security maturity.** Strong primitives (per‑request CSP nonce, HSTS, admin PIN+HMAC bound to role, IDOR‑guarded RPC, fail‑closed rate limiting, AI budget breaker, crisis interception, matview API‑grant revocation). Self‑audit: 94/100 "GO‑LIVE‑WITH‑CONDITIONS" — **not independently certified here**. Open: PHI unscrubbed to Gemini on 2 endpoints, CSP `unsafe-inline` styles, no centralised logging, registration CAPTCHA gap.
- **Scalability.** Precomputed admin matviews + composite indexes + atomic submission RPC; heavy routes have raised Vercel durations. Load‑test harness exists but no committed results. Admin analytics memory/streaming flagged.
- **Maintainability.** Duplicated permission definitions; duplicated bilingual content; documentation drift; **no repo‑enforced CI**; narrow test coverage (3 security suites only).
- **Clinical readiness.** Governance gates on assessment activation and article publication; verified‑clinician gating; consent‑based sharing; crisis handling. Gaps: PHI‑to‑AI scrubbing, erasure not implemented, mobile‑scoring parity unverified.
- **Production readiness.** **Cannot be confirmed from the repository** due to the unresolved migration‑sync failure and an invalid admin‑matview migration. Self‑audits say "GO LIVE WITH CONDITIONS"; repository evidence adds must‑fix engineering blockers.
- **Top priorities.** (1) Fix migration sync + admin matview; (2) scrub PHI on all AI endpoints; (3) implement/gate account deletion; (4) add CI + migration validation.
- **Top risks.** (1) Repo↔prod schema drift; (2) over‑broad legacy clinician access; (3) PHI leakage to third‑party AI; (4) unenforced quality gates on a clinical platform.
- **Recommended next actions.** Execute Section 21 "Immediate" list before any go‑live decision; then unify authorization and add centralised logging + expanded tests.

---

## Appendices

### A. Repository statistics
| Metric | Value | Source |
|---|---|---|
| `app/` TS/TSX LOC | 23,261 | `wc -l` |
| `lib/` LOC | 6,198 | `wc -l` |
| `components/` LOC | 3,344 | `wc -l` |
| `mobile/` LOC | 6,204 | `wc -l` |
| Migration SQL LOC (combined) | 3,943 | `wc -l` |
| Commits (HEAD) | 70 | `git rev-list --count` |
| First / last commit | 2026‑06‑06 / 2026‑07‑13 | `git log` |
| Contributors | Claude (48), alhazayed (21), Cursor Agent (1) | `git shortlog -sne` |

### B. Folder statistics (top level)
`app/`, `lib/`, `components/`, `mobile/`, `supabase/`, `__tests__/`, `load-tests/`, `docs/`, `public/`, `.agents/` + 13 root `*.md`/config files.

### C. Migration statistics
100 files; 72 two‑line stubs; 1 baseline snapshot (`20260619120000`, 1,188 lines); remainder are packages/consent/admin/perf/security migrations. Range `20260524202222` → `20260628071704`.

### D. Counts
- **API routes:** 55 (`route.ts`/`route.tsx`).
- **Pages:** 44 (`page.tsx`).
- **Components:** 22 (`components/*.tsx`), excluding admin subcomponents.
- **Tables (public):** 43.
- **Postgres functions:** ~24 (Section 6.4).
- **Triggers:** 6 named + `packages_updated_at`.
- **Materialized views:** 5.
- **RLS policies:** 103 `CREATE POLICY` (45 tables RLS‑enabled).
- **Security test cases:** 51 (`14 + 26 + 11`).

### E. Tables (public)
profiles, patient_profiles, clinician_profiles, assessment_definitions, assessment_items, assessment_governance, assessment_interpretation_templates, assessment_submissions, assessment_assignments, assessment_responses, ai_insights, personality_results, packages, package_assessments, package_sessions, package_results, clinician_verifications, patient_access_codes, clinician_invitations, clinician_patient_relationships, relationship_permissions, clinical_notes, session_notes, messages, invitations, mood_logs, journal_entries, gratitude_entries, wellness_plans, medications, medication_alerts, content_articles, cms_sections, platform_announcements, dismissed_announcements, feature_flags, consent_documents, user_consents, platform_settings, audit_log, notifications, notification_events, notification_log, push_tokens, rate_limit_log, chat_sessions, pdf_reports.

### F. Functions
get_my_role, is_admin, current_user_role, handle_new_user, handle_updated_at, prevent_role_self_escalation, expire_stale_invitations, cleanup_rate_limit_log, prune_rate_limit_log, enforce_governance_before_activation, enforce_article_review, generate_patient_access_code, check_relationship_permission, check_and_record_rate_limit, submit_assessment_atomic, get_admin_dashboard_stats, get_assessment_completion_funnel, get_assessment_performance_comparison, get_demographics_breakdown, get_high_risk_patients, get_patient_risk_profile, get_top_assessments, get_user_engagement_metrics.

### G. Triggers
on_auth_user_created, prevent_role_escalation, set_profiles_updated_at, set_patient_profiles_updated_at, set_chat_sessions_updated_at, enforce_governance_on_activation, enforce_article_review_before_publish, packages_updated_at.

### H. Policies (pattern reference)
Ownership (`auth.uid() = patient_id/user_id`), admin bypass (`get_my_role() = ANY('admin','superadmin')`), legacy clinician scope (`profiles.assigned_clinician_id = auth.uid()`), consent read (`rp_parties_read`/`rp_patient_manage`), public‑read reference tables (`defs_read`, `items_read`, `clin_prof_read`, `cms_read`, `flags_read`, `ann_read`, `settings_read` = `USING(true)`). Full text: `schema_baseline.sql:770‑1188` + `…consent_system.sql`.

### I. Security history (condensed)
15‑phase security programme (`SECURITY_AUDIT_REPORT.md`) → 94/100. Notable fixes: clinical‑notes auth (SEC‑006, was Critical), rate‑limit race → atomic RPC (SEC‑002), messages/notes RLS (CW‑002/003), matview Data‑API grant revocation (`20260628071704`), CSP nonce via Web Crypto in edge middleware (`97e2517`), admin search i18n + matview revoke (`908011a`). Open: migration sync, matview schema mismatch, PHI‑to‑AI on 2 endpoints, CSP inline styles, centralised logging, deletion workflow.

### J. Architecture diagram
See Section 3 (ASCII).

### K. Glossary
- **RLS** — Row‑Level Security (Postgres policies restricting row access by `auth.uid()`/role).
- **PermissionKey** — canonical 10‑value capability enum for clinician↔patient sharing (`lib/types.ts`).
- **`check_relationship_permission()`** — DB function that authorizes a clinician for a specific capability on a specific patient via an active, granted relationship.
- **`has_clinician_access()`** — **not present in the repository** (see 6.4).
- **Service‑role client** — Supabase client using the secret key that bypasses RLS; server‑only.
- **Matview** — materialized view; precomputed admin aggregates (cannot enforce RLS).
- **Turnstile** — Cloudflare CAPTCHA.
- **Wafi** — the AI chat companion persona (`app/api/ai-chat`).
- **Guest submission** — anonymous assessment path (`api/submit-assessment-guest`) behind CAPTCHA.

---

*End of dossier. All statements are supported by the cited repository evidence at commit `a546ac8`. Items that could not be confirmed from the repository are explicitly marked "Unable to verify from repository." No code was modified in producing this document.*
