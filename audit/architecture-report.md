# V Welfare — Architecture Report

**Audit date:** 2026-07-13
**Auditor role:** Lead Software Architect / Full‑Stack Engineer
**Scope:** Entire repository at `/workspace` (web app, mobile app, Supabase backend, deployment config)
**Method:** Full static read of source, migrations, config, and existing documentation. No runtime/browser testing was performed in this environment (no credentials/DB available); dynamic findings are noted as such.

> This document describes *how the system is built*. Defects and risks are catalogued in the companion reports (`security-report.md`, `database-report.md`, `performance-report.md`, `ui-report.md`, `accessibility-report.md`, `bug-report.md`) and prioritized in `implementation-roadmap.md`.

---

## 1. Overall Architecture

V Welfare is a **bilingual (English/Arabic, RTL‑aware) mental‑health assessment platform** with three surfaces sharing one Supabase backend:

| Surface | Stack | Location |
|---|---|---|
| **Web app** | Next.js 14.2.35 (App Router), React 18, TypeScript (strict), Tailwind CSS 3.4 | `/app`, `/components`, `/lib` |
| **Mobile app** | Expo SDK 54 / Expo Router 5, React Native, NativeWind | `/mobile` |
| **Backend** | Supabase (Postgres 15, Auth, Realtime, Storage), Row Level Security | `/supabase` |
| **AI** | Google Gemini 1.5 Flash via REST | `/lib/gemini.ts` + `/app/api/*` |

Supporting infrastructure:
- **Hosting:** Vercel (serverless functions; `vercel.json` sets `maxDuration` for AI/export routes).
- **Rate limiting:** Postgres RPC (`check_and_record_rate_limit`) via `rate_limit_log` table; optional Upstash Redis path referenced in `.env.example` but the active implementation (`lib/rate-limit.ts`) uses Postgres only.
- **CAPTCHA:** Cloudflare Turnstile (optional; fail‑closed in production).
- **PDF:** `@react-pdf/renderer` server‑side (`app/api/reports/route.tsx`).
- **Charts:** Recharts.

**Architectural style:** Server‑Component‑first Next.js App Router. Pages are largely React Server Components that read Supabase directly with the user's session cookie; mutations and privileged reads go through Route Handlers under `app/api/**`. Many privileged routes use the **service‑role admin client** (`createAdminClient()`), bypassing RLS after performing their own auth checks — a deliberate but risk‑concentrating pattern (see `security-report.md`).

```
Browser (RSC + client components)
   │  cookies (Supabase SSR session)
   ▼
Next.js middleware.ts  ── sets CSP nonce, security headers, route gating
   │
   ├── Server Components ── createClient() (anon key + user JWT) ── Postgres (RLS enforced)
   │
   └── Route Handlers app/api/** ──┬─ createClient() (RLS enforced)
                                    └─ createAdminClient() (service role, RLS bypassed) ── Postgres
                                                 │
                                                 ▼
                                    Gemini REST · Turnstile · Realtime
```

---

## 2. Folder Organization

```
/app
  /(app)              Authenticated patient/clinician shell (sidebar layout)
    dashboard, assessments/[id], packages/[id], mood, journal, insights,
    messages, profile, patients, patient/clinicians, clinician/*, admin/*
  /(auth)             login, register, forgot-password, reset-password (+ layout)
  /api                ~55 Route Handlers (see §8)
  /auth/confirm       Email OTP / PKCE callback + redirect handling
  /x/control          Admin console (login + (panel) group: overview, users,
                      results, risk, analytics, assessments, packages,
                      announcements, audit, platform)
  /connect/[token]    Public clinician-invitation acceptance flow
  page.tsx, layout.tsx, error.tsx, not-found.tsx, robots.ts, sitemap.ts,
  privacy, terms, contact, clinicians, sample-result, onboarding
/components           Shared UI (sidebar, crisis-banner, notification-bell,
                      dark-mode-toggle, language-toggle, radar, kpi cards, …)
/lib
  /supabase           client.ts (browser), server.ts (SSR), admin.ts (service role)
  /security           anonymizePHI, verifyTurnstile, aiBudgetGuard, file-export
  /rate-limit         redis.ts (+ rate-limit.ts at lib root, Postgres-based)
  admin-auth.ts, permissions.ts, i18n.ts, assessment-content(.ar).ts,
  severity-labels(.ar), gemini.ts, package-interpret.ts, types.ts, use-lang.ts
/supabase/migrations  ~100 SQL migrations (many are empty "stubs") + config.toml
/mobile               Expo app (screens, lib, eas.json, app.json)
/__tests__/security   idor / phi / rls test files (Node's built-in test runner via tsx)
/load-tests           k6 scenarios (100/250/500/1000 VUs)
/docs                 DISASTER_RECOVERY.md
Root *.md             Multiple prior audit/plan reports (see §16)
```

**Observation:** The folder layout is coherent and role‑segmented. Two notable smells: (a) `lib/rate-limit.ts` and `lib/rate-limit/redis.ts` present two rate‑limit implementations; (b) root contains ~10 large historical markdown reports that overlap with this audit and should be consolidated.

---

## 3. Data Flow

**Read (typical page):** RSC → `createClient()` (SSR, forwards the user's JWT as the Supabase anon client) → Postgres with RLS → rendered HTML. Example: `app/(app)/dashboard/page.tsx`.

**Assessment submission (authenticated):**
1. Client posts `{definition_id, responses[], assignment_id?}` to `POST /api/submit-assessment`.
2. Handler validates the session (`getUser()`), rate‑limits (20/hr/user), fetches the definition + items with the **admin client**, validates each response value against `response_options`, deduplicates item IDs, computes `totalScore`, bands, and `high_risk` (safety‑item aware).
3. Persists atomically via RPC `submit_assessment_atomic(p_patient_id = user.id, …)` (single transaction inserting submission + responses).
4. Fires idempotent high‑risk admin notification + audit‑log entry (fire‑and‑forget).
   Evidence: `app/api/submit-assessment/route.ts:73-234`.

**Assessment submission (guest/anonymous):** `POST /api/submit-assessment-guest` — Turnstile + dual‑window IP rate limits + global circuit breaker + per‑definition/IP daily cap; validates demographics enums; inserts with `patient_id: null` and `guest_*` columns. Evidence: `app/api/submit-assessment-guest/route.ts:114-349`. **⚠ This conflicts with a migration that sets `patient_id NOT NULL`** — see `database-report.md` DB‑C1.

**Live scoring preview:** `POST /api/score-assessment` — public, no persistence, returns score/band only (`app/api/score-assessment/route.ts`).

**AI chat (Wafi):** `POST /api/ai-chat` — cookie **or** Bearer (mobile) auth, rate‑limited, emergency‑keyword intercept, then forwards the message + last 10 turns to Gemini. **PHI is *not* scrubbed here** (see `security-report.md` SEC‑H2).

**Multi‑assessment synthesis:** `POST /api/synthesis` — aggregates the user's latest score per scale (requires ≥3 scales) and asks Gemini for a JSON clinical synthesis.

**PDF report:** `GET /api/reports?patient_id=` — owner or admin only; renders A4 PDF from profile + submissions + mood.

---

## 4. Authentication Flow

- **Provider:** Supabase Auth (email/password). Sessions are cookie‑based via `@supabase/ssr` (`lib/supabase/server.ts`, `middleware.ts`).
- **Signup:** `app/(auth)/register/page.tsx` → `supabase.auth.signUp`. A Postgres trigger (`handle_new_user`) creates the `profiles` (and `patient_profiles`) row from `raw_user_meta_data.role` (default `patient`). **⚠ The `fix_duplicate_auth_trigger` migration drops `on_auth_user_created` and never recreates a trigger** — profile creation depends on a trigger name (`trg_on_auth_user_created`) not present in the repo (`database-report.md` DB‑C2).
- **Email confirmation:** `supabase/config.toml` sets `enable_confirmations = false` (email is *not* verified at signup) — a compliance/enumeration concern for healthcare (`security-report.md` SEC‑H5).
- **Email link handling:** `app/auth/confirm/route.ts` handles both PKCE (`?code=`) and OTP (`token_hash`) flows and exchanges for a session; `next` is passed through an allowlist `safeNext()` that blocks external URLs, `/api`, and `/x/control` — **open‑redirect‑safe**.
- **Login brute‑force:** Pre‑flight `POST /api/auth/check-login-limit` enforces 5/15min per‑IP and per‑email; `admin/login` enforces 5/15min per IP. There is **no account lockout** (rate limit only) and **no credential‑stuffing/breached‑password check**.
- **Password reset:** `POST /api/auth/forgot-password` — always returns success (no enumeration), IP rate‑limited; but `redirectTo` is client‑controlled and not allowlisted (`security-report.md` SEC‑M for open redirect via reset email).
- **Session storage (web):** httpOnly Supabase cookies (good). **Session storage (mobile):** unencrypted `AsyncStorage` (`security-report.md` SEC‑C, mobile).
- **JWT:** `jwt_expiry = 3600` (1h) with refresh tokens (Supabase default). Multi‑tab behaviour relies on Supabase's `autoRefreshToken`.

### Route gating (`middleware.ts`)
- Admin area `/x/control/**` (except `/x/control/login`) requires a Supabase session (PIN/HMAC is verified per page via `requireAdmin`).
- A hard‑coded list of private prefixes (`/dashboard`, `/assessments`, `/clinician`, `/admin`, …) requires a session, else redirect to `/login?next=`.
- Logged‑in users are bounced off auth pages to `/dashboard`.
- Middleware sets CSP (nonce for scripts; `unsafe-inline` retained for styles — documented trade‑off), HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Cache-Control: no-store` on API responses.

---

## 5. Authorization Flow

Three enforcement layers exist; they are **not uniformly applied**:

1. **Middleware** — coarse "is there a session?" gating by path prefix. It does **not** distinguish roles (a patient can pass the middleware check for `/clinician` or `/admin` prefixes; role is enforced deeper).
2. **Row Level Security (RLS)** — the primary data‑level control for RSC/`createClient()` reads. Policies key on `(select auth.uid()) = patient_id`, a `SECURITY DEFINER get_my_role()` helper, and (newer) `clinician_patient_relationships`.
3. **Route‑handler checks** — explicit `getUser()` + role/ownership checks. **Admin console API routes** mostly use `requireAdmin()` (Supabase session + `role ∈ {admin,superadmin}` + `admin_session` HMAC cookie), but **two admin routes use a weaker inline role check without the HMAC second factor** (`admin/clinician-verifications`, `admin/kpis/[kpiId]/alert`) — see `security-report.md` SEC‑H3.

**Admin second factor:** `lib/admin-auth.ts` binds `HMAC(userId + ':' + role)` into the `admin_session` cookie so that revoking a role invalidates the cookie. Login requires email+password+PIN (`app/api/admin/login/route.ts`).

**Clinician↔patient authorization is bifurcated** (major architectural debt):
- **Legacy model:** `profiles.assigned_clinician_id` (used by `clinical-notes`, `notify-message`, `assignments`).
- **New consent model:** `clinician_patient_relationships` + `relationship_permissions` (used by `connect/[token]`, `access-requests`, `relationships/[id]/permissions`, `clinician/patients`).
These two models can disagree; several routes authorize on the stale legacy field, bypassing granular consent (`security-report.md` SEC‑H7).

**Role escalation guard:** trigger `prevent_role_self_escalation()` on `profiles`; `admin/users` PATCH requires superadmin to grant admin roles.

---

## 6. Database Relationships (high level)

Core entity graph (see `database-report.md` for the full inventory of ~44 tables + 5 materialized views):

```
auth.users ──1:1── profiles ──1:1── patient_profiles / clinician_profiles
   profiles ──< assessment_submissions >── assessment_definitions ──< assessment_items
                     │                                   └──< assessment_interpretation_templates
                     └──< assessment_responses
   profiles ──< mood_logs, journal_entries, gratitude_entries, medications,
                personality_results, wellness_plans, chat_sessions, ai_insights
   profiles ──< clinical_notes / session_notes (clinician-authored)
   profiles(clinician) ──< clinician_patient_relationships >── profiles(patient)
                                    └──< relationship_permissions
   clinician_invitations, patient_access_codes  (connection bootstrap)
   packages ──< package_assessments / package_interpretations ; package_results, package_sessions
   notifications / notification_log / notification_events  (three parallel systems)
   audit_log, rate_limit_log, consent_documents, user_consents, feature_flags,
   platform_settings, platform_announcements, cms_sections, content_articles, pdf_reports
```

**Design flaws** (detailed in `database-report.md`): dual clinician models; guest data mixed into the main submissions table; chat stored both in `messages` and `chat_sessions.messages` JSONB; three notification tables; demographics duplicated across `profiles`, `patient_profiles`, and `guest_*`; PHI stored in plaintext.

---

## 7. Role System

Roles live in `profiles.role` (a `text` column **without a CHECK constraint** — `database-report.md` DB‑M):

| Role | Capabilities |
|---|---|
| `patient` (default) | Own assessments, mood/journal, packages, messaging with connected clinicians, GDPR export/delete requests, consent management |
| `clinician` | Verification workflow, assigned/consented patient data, clinical notes, assignments, messaging; gated by verification + relationship/permissions |
| `admin` | Admin console (`requireAdmin`): users, results, analytics, packages, announcements, exports, KPIs |
| `superadmin` | Admin + role management (grant admin), announcement ownership overrides |

Role is set at signup via `raw_user_meta_data.role` (trigger) and can be changed by superadmin. Self‑escalation is blocked by a trigger.

---

## 8. API Structure

~55 Route Handlers under `app/api/**`. Categories:

- **Auth helpers (public):** `auth/check-login-limit`, `auth/check-signup-limit`, `auth/forgot-password`, `auth/verify-captcha`, `auth/confirm`.
- **Assessments:** `submit-assessment`, `submit-assessment-guest`, `score-assessment` (preview), `recommend-assessments` (public, PHI‑scrubbed), `check-rescreening`, `assignments`.
- **AI:** `ai-chat`, `synthesis`, `clinical-notes` (PUT = AI draft).
- **Packages:** `packages/[id]/compute`, `packages/[id]/interpret`.
- **Clinician:** `clinician/invite`, `clinician/patients`, `clinician/verification`.
- **Patient/consent:** `patient/code`, `patient/relationships`, `access-requests`, `access-requests/[id]`, `relationships/[id]/permissions`, `connect/[token]`.
- **User/GDPR:** `user/export-data`, `user/delete-request`, `user/push-token`.
- **Notifications:** `notifications`, `notify-high-risk`, `notify-message`.
- **Reports:** `reports` (PDF).
- **Admin:** `admin/*` (analytics, announcements, assessments[/id], clinician-verifications, dashboard/{stats,risk,demographics,engagement,assessments}, export, flags, kpis[/history,/[kpiId]/alert], packages[/analytics,/export], research, results, settings, users, login).
- **Ops:** `health`.

**Auth/authorization matrix** is provided in full in `security-report.md`. Summary: 22 admin routes use `requireAdmin()`, 8 routes are intentionally public, 28 routes use the service‑role admin client, 32 routes have rate limiting.

---

## 9. State Management

- **No global client store** (no Redux/Zustand/Jotai). State is local `useState`/`useEffect` in client components, with the server as the source of truth (RSC + Route Handlers).
- **Server state** is fetched per‑request in Server Components; client components fetch via `fetch()` to Route Handlers or the Supabase browser client.
- **Language** is a cookie (`lang`) read server‑side (`lib/get-language.ts`) and client‑side (`lib/use-lang.ts`); toggling calls `router.refresh()`. The DB `profiles.language_preference` is **not synced** to the cookie (`ui-report.md`).
- **Theme** is `localStorage['vw-theme']` + a `dark` class on `<html>` with an anti‑FOUC inline script.
- **Realtime** is enabled for `messages` (migration `enable_realtime_messages`).

---

## 10. Caching

- **Route Handlers:** middleware sets `Cache-Control: no-store` on all `/api/*` responses (correct for PHI).
- **Server Components:** rely on Next.js defaults; most read live user data so are effectively dynamic. No explicit `revalidate`/`unstable_cache`/Next 15 `use cache` usage found.
- **Admin analytics:** intended to be served from **materialized views** refreshed by pg_cron — but the refresh job exists only as a stubbed migration, and the views contain schema errors (`database-report.md` DB‑C4).
- **Static assets/images:** Next.js Image not heavily used; `next.config.js` does not configure `images` domains (logos are local). `X-DNS-Prefetch-Control: on` is set.
- **No CDN‑level caching of dynamic content** (appropriate given PHI).

---

## 11. File Uploads

- **Clinician verification** uploads license/certificate documents; `clinician_verifications.document_urls` stores a JSONB array of URLs, reviewed via the admin console.
- Storage buckets/policies are **not present in the committed migrations** (they live in stubbed migrations "applied directly to remote"), so bucket privacy and Storage RLS **cannot be verified from the repo** — a launch‑blocking evidence gap for a PHI platform (`security-report.md`, `database-report.md`).
- `lib/security/file-export.ts` supports admin data exports; PDFs are generated server‑side and streamed (not stored on the web side). Mobile downloads PHI PDFs to unencrypted device storage (`security-report.md` mobile H‑M2).

---

## 12. Notifications

Three overlapping mechanisms:
- **`notifications`** — in‑app bell (`components/notification-bell.tsx`, `GET/PATCH /api/notifications`); high‑risk admin alerts written here by submit routes.
- **`notification_log`** — server‑only delivery log.
- **`notification_events`** — consent‑workflow events (e.g. invitation accepted).
- **Push:** Expo push tokens registered via `POST/DELETE /api/user/push-token`; local reminders scheduled on device. Push registration is incomplete (missing valid EAS `projectId`; see mobile findings).

Consolidating these three systems is recommended (`database-report.md`, `implementation-roadmap.md`).

---

## 13. Payments

**No payment integration exists in the codebase.** There is no Stripe/PayPal/Tap/HyperPay client, no checkout Route Handler, no webhook handler, and no billing tables in the migrations. "Packages" are **clinical assessment bundles**, not paid products — `packages` tables model assessment groupings and interpretation bands, not pricing or transactions. A branch `fix/packages-checkout-auth-layout` exists remotely but no checkout/payment code is present on the audited branch.

> **Gap vs. product brief:** The task states the platform handles "real payments." If paid packages/subscriptions are in scope for launch, the entire payments subsystem (provider integration, PCI‑compliant checkout, webhooks, refunds, invoices, entitlement enforcement, reconciliation, tax) is **not yet built**. This is flagged as a launch blocker in `implementation-roadmap.md`.

---

## 14. Assessments Engine

- **Definitions** (`assessment_definitions`) carry `code`, bilingual names/descriptions, `scoring_logic` (JSONB bands: `{min,max,severity_en,severity_ar}`), `high_risk_threshold`, `total_questions`, `is_active`, plus a governance record (`assessment_governance`) gating activation via trigger.
- **Items** (`assessment_items`) carry bilingual text, `response_options` (JSONB `{value,label_en,label_ar}`), `subscale`, `is_safety_item`.
- **Seeded instruments** include PHQ‑9‑style, GAD‑style, DASS‑21, ASRS (ADHD), ISI (insomnia), DAST‑10 (addiction), plus personality/wellness content (migrations `2026053019*`).
- **Scoring** is **server‑side** on web (`submit-assessment`, `score-assessment`): value validation against allowed options, dedup, sum, band lookup, and safety‑item‑aware high‑risk. **Scoring is client‑side on mobile** (integrity flaw — `bug-report.md`, `security-report.md`).
- **Interpretation:** `assessment_interpretation_templates` (approved templates) + optional AI synthesis; `lib/package-interpret.ts` and `packages/[id]/interpret` produce package‑level narratives.
- **Progress/resume:** package sessions and (mobile) `assessment_sessions` snapshots exist; mobile resume is broken (`bug-report.md`).
- **Localization:** `lib/assessment-content.ts` / `assessment-content-ar.ts` and `severity-labels(.ar)` provide bilingual content.

---

## 15. Workflows

### Clinician workflow
Register (role=clinician) → email (unconfirmed by default) → complete profile → submit **verification** (`clinician/verification`: license, specialty, organization, `document_urls`) → **admin approval** (`admin/clinician-verifications`) → connect to patients via **invitation** (`clinician/invite` → `connect/[token]`) or patient **access code** → view consented patient data, write **clinical notes** (+ AI draft), create **assignments**, **message** patients, receive **notifications**. *Gaps:* verification review route lacks the admin HMAC factor; several clinician actions authorize on the legacy `assigned_clinician_id` rather than consent.

### Patient workflow
Sign up (role=patient) → onboarding (consent, health & safety, demographics) → dashboard → take **assessments** (self‑initiated or clinician‑assigned) → view **results/history**, radar, **synthesis** → **mood**/**journal**/**gratitude** tracking → connect to a **clinician** (accept invite or share access code) with **granular permissions** → **messaging** → **PDF export** and **GDPR** data export / deletion request. *Note:* deletion request only writes an audit row — no processing pipeline (`bug-report.md`).

### Admin workflow
Admin login (email+password+PIN → HMAC session) → **overview/KPIs**, **users** (roles, superadmin‑gated), **clinician verifications**, **results** (anonymized), **risk** dashboard (high‑risk patients), **analytics/demographics/engagement**, **assessments** governance, **packages** management, **announcements**, **audit** log, **exports** (anonymized CSV/JSON), **research** dashboard, **settings/feature flags**. *Gaps:* several dashboard RPCs/materialized views are broken or over‑granted at the DB layer (`database-report.md`).

### Research workflow
`admin/research` and `admin/export` produce de‑identified aggregate/row exports for research use, applying anonymization (`lib/security/*`, `admin/export` filters). RLS/grant issues on the demographic materialized view weaken the de‑identification guarantee at the DB layer (`database-report.md` DB‑H).

---

## 16. Existing Documentation (context)

The repo already contains prior audits and plans (summarized for cross‑reference; this new audit supersedes and consolidates them): `AUDIT_REPORT.md` (68/100, "not ready for regulated production"), `AUDIT_REPORT_2026_06_24.md` (75/100, "GO LIVE WITH CONDITIONS"), `SECURITY_AUDIT_REPORT.md` (85/100, web "safe to launch with conditions"), `REMEDIATION_BACKLOG.md`, `KNOWN_ISSUES.md` (active Supabase migration‑sync blocker), `DEPLOYMENT_ACTION_PLAN.md`, `PHASE_1_COMPLETION_REPORT.md`, `PHASE_2_SPECIFICATION.md`, `ADMIN_DASHBOARD_REDESIGN_PLAN.md`, `docs/DISASTER_RECOVERY.md` (RPO 4h / RTO 8h). Notably, prior reports repeatedly flag the same open items this audit confirms: mobile client‑side scoring, migration/schema drift, and consent‑model duplication.

---

## 17. Technology & Deployment Configuration

- **Next.js:** `14.2.35` in `package.json` (a `nextjs15-upgrade` branch exists remotely; `SECURITY_AUDIT_REPORT.md` claims 15.5.19 — **the audited branch is on 14.2.35**, which affects the CVE posture in `security-report.md`).
- **Build/CI:** `next build`; `eslint.ignoreDuringBuilds: false`. No `typecheck` script and **no unit/integration test framework** beyond three security test files run with Node's `--test` via `tsx`. No CI workflow files were found in the repo.
- **Env:** `.env.example` documents Supabase keys, `ADMIN_PIN`, `ADMIN_SESSION_SECRET`, Turnstile, Gemini, Upstash. `.gitignore` ignores `.env*.local` but **not** a plain `.env` (weakness).
- **Load tests:** k6 scenarios present (100–1000 VUs) but require a running target.
- **Observability:** no Sentry/OpenTelemetry/log drain integration found; errors go to `console.*` (Vercel logs only).

---

## 18. Architectural Strengths & Risks (summary)

**Strengths**
- Server‑side assessment scoring on web with strict response validation and atomic persistence.
- Layered security headers + nonce CSP; Turnstile fail‑closed; fail‑closed Postgres rate limiting.
- Thoughtful anti‑enumeration on password reset/login; admin HMAC second factor; open‑redirect‑safe email callback.
- Rich, governed, bilingual assessment engine; granular clinician‑patient consent model (where used).

**Top architectural risks** (see companion reports for severity/fixes)
1. **Migration/schema drift** — ~71 empty stub migrations; the repo cannot reproduce production; guest `patient_id NOT NULL` conflict; auth trigger not recreated; broken admin materialized views. *(Highest systemic risk.)*
2. **Service‑role concentration** — 28 routes bypass RLS; correctness depends entirely on hand‑written checks, two of which are weaker admin gates.
3. **Dual clinician authorization models** causing consent bypass on legacy‑field routes.
4. **PHI to third‑party AI without scrubbing** in `ai-chat`/clinical‑note drafts.
5. **Mobile app not production‑ready** (client scoring, AsyncStorage tokens, broken reset deep link).
6. **No payments subsystem** despite it being in the stated scope.
7. **No observability/monitoring**, no test coverage of business logic, and unverifiable Storage/RLS policies from the repo.
