# V Welfare — Architecture Report

**Audit date:** 2026-07-13
**Scope:** Full repository at `/workspace` (branch `claude/project-functionality-UDm55`)
**Method:** Independent, evidence-based code review (fresh read of source, migrations, and config — not a restatement of prior self-audits in the repo root). File:line references are cited wherever possible.

> This report is part of a set of 8 audit deliverables in `/audit/`. See `implementation-roadmap.md` for the prioritized fix list and `bug-report.md` / `security-report.md` / `database-report.md` / `performance-report.md` / `ui-report.md` / `accessibility-report.md` for detailed findings.

---

## 1. Technology Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | Next.js (App Router) | 14.2.35 | Not yet on Next.js 15 despite a prior audit claiming an upgrade — `package.json` still pins `14.2.35` |
| UI | React / ReactDOM | 18.x | |
| Language | TypeScript | 5.x, `strict: true` | |
| Styling | Tailwind CSS 3.x + custom CSS variables | | Dark mode via `.dark` class + CSS vars |
| Data / Auth | Supabase (Postgres + Auth + Storage + Realtime) | `@supabase/ssr` 0.6.0, `supabase-js` 2.45.4 | |
| AI | Google Gemini (`gemini.ts`) | REST via `fetch` | Server-only key |
| PDF | `@react-pdf/renderer` | 4.5.1 | Used both server-side (`/api/reports`) and client-side (packages result) |
| Charts | `recharts` 2.13.0 | | Heavy client bundle contributor |
| Mobile | Expo / React Native | | Partial companion app, see `mobile/` |
| Hosting | Vercel | | `vercel.json` sets per-route `maxDuration` |
| CAPTCHA | Cloudflare Turnstile | Optional | Enforced inconsistently (see Security Report) |

**Correction of a claim in prior repo docs:** `SECURITY_AUDIT_REPORT.md` (dated 2026-06-27) states Next.js was upgraded to `15.5.19`. The current `package.json` (`14.2.35`) and `package-lock.json` do not reflect this. Either the upgrade was reverted, never merged to this branch, or the prior report is aspirational rather than verified. **Treat all "✅ COMPLETE / 100/100" claims in the repo's other markdown reports with skepticism — this audit found several of them to be inaccurate on re-verification (see Security Report §0).**

---

## 2. Folder Organization

```
/workspace
├── app/                          Next.js App Router
│   ├── (app)/                    Authenticated app shell (patient/clinician/admin shared layout)
│   │   ├── dashboard/            Patient home
│   │   ├── assessments/          Catalog + [id] assessment flow
│   │   ├── mood/ journal/ insights/   Patient self-tracking
│   │   ├── messages/             Patient↔clinician messaging
│   │   ├── patients/             Clinician patient list & detail (legacy assignment model)
│   │   ├── patient/clinicians/   Patient-side consent/access management (new model)
│   │   ├── clinician/            Clinician verification + connect (new model)
│   │   ├── packages/             Assessment "battery" bundles (no payment)
│   │   ├── admin/                Orphaned admin pages (kpi-dashboard, settings) — NOT the main admin panel
│   │   ├── adhd-zones/           Standalone, unpersisted self-regulation tool
│   │   └── profile/              Account & demographics
│   ├── (auth)/                   Login, register, forgot/reset password
│   ├── auth/confirm/              Email confirmation (PKCE/OTP) handler
│   ├── x/control/                 **The actual admin panel** (separate route tree from `(app)/admin`)
│   │   ├── login/                 Admin PIN login
│   │   └── (panel)/               Overview, analytics, users, results, assessments, packages,
│   │                              announcements, audit, platform, risk
│   ├── connect/[token]/            Clinician invitation link accept flow
│   ├── api/                       54 route.ts files — see Security Report for full inventory
│   ├── clinicians/ contact/ privacy/ terms/ sample-result/   Public marketing/legal pages
│   └── layout.tsx                 Root layout: theme script, fonts, metadata, nonce plumbing
├── components/                    Shared UI (sidebar, notification-bell, admin/*, etc.)
├── lib/                           Business logic: assessment-content, i18n, gemini, admin-auth,
│                                  rate-limit, security/ (PHI scrub, Turnstile, AI budget), supabase/, types/
├── middleware.ts                  Session refresh, route protection, CSP nonce, security headers
├── supabase/migrations/           100 migration files (68 are stubs — see Database Report)
├── mobile/                        Expo/React Native companion app (~50% complete, see below)
├── __tests__/security/            PHI + IDOR test scaffolding (requires live server + seeded IDs)
├── load-tests/                    k6 scenarios (100/250/500/1000 VUs)
└── docs/                          (mostly empty / placeholder)
```

**Notable structural finding:** There are **two separate, non-integrated admin surfaces**:
1. `app/x/control/**` — the real, fully-featured admin panel (PIN + HMAC gated).
2. `app/(app)/admin/**` — an orphaned page pair (`kpi-dashboard`, `settings`) reachable only by direct URL, not linked from any nav, and inconsistently guarded (`kpi-dashboard` calls `requireAdmin()`; `settings` has **no** admin check at all — see Security Report Finding ADM-1).

This is architecturally confusing and a security smell: a second, weakly-guarded "admin" tree exists in parallel with the real one.

---

## 3. Request / Data Flow

### 3.1 High-level flow

```
┌────────────────────────────────────────────────────────────────┐
│ Client (browser / Expo app)                                    │
└───────────────────────────┬──────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│ middleware.ts (Edge runtime)                                     │
│  • Generates per-request CSP nonce (Web Crypto, not Node crypto) │
│  • Refreshes Supabase session cookie                             │
│  • Redirects unauthenticated users away from private routes      │
│  • Redirects authenticated users away from auth pages             │
│  • Sets security headers (CSP, X-Frame-Options, nosniff)         │
│  • Does NOT gate /api/* beyond header injection — auth is        │
│    per-route (see Security Report)                                │
└───────────────────────────┬──────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│ App Router pages (Server Components) + Route Handlers (/api/**)  │
│  • Server Components call lib/supabase/server.ts (cookie-scoped, │
│    RLS-enforced client)                                          │
│  • Route handlers mix: cookie session, Bearer token (mobile),     │
│    and admin HMAC (requireAdmin())                                │
│  • Mutations mostly go through createAdminClient() (service role, │
│    RLS bypassed) AFTER an app-level authorization check           │
└───────────────────────────┬──────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│ Supabase Postgres                                                 │
│  • ~46 tables, RLS enabled on all sensitive tables                │
│  • SECURITY DEFINER helpers: get_my_role(), submit_assessment_    │
│    atomic(), check_and_record_rate_limit()                        │
│  • 5 materialized views for admin dashboards (admin_*)            │
│  • 8 admin dashboard RPCs — see Database/Security Reports for a   │
│    Critical finding on their authorization                        │
└────────────────────────────────────────────────────────────────────┘
```

### 3.2 Assessment submission flow (web — the correct path)

```
assessment-content.tsx (client)
  → localStorage autosave per keystroke (resume support, client-only)
  → POST /api/submit-assessment { definition_id, responses[], assignment_id? }
  → Server: validate each response value against assessment_items.response_options
  → Server: sum score, compute severity band, evaluate is_safety_item + high_risk_threshold
  → RPC submit_assessment_atomic() (SECURITY DEFINER, checks auth.uid() = p_patient_id)
  → INSERT assessment_submissions + assessment_responses (atomic)
  → Fire-and-forget notifyAdminsHighRisk() if high_risk (no await, .catch(()=>{}))
  → Response → client renders score/severity/recommendations
```

**Architectural gap:** the mobile app (`mobile/app/(app)/assessments/[id].tsx`) does **not** follow this flow — it computes the score client-side and inserts directly into `assessment_submissions`/`assessment_responses` via the Supabase JS client, relying on RLS that only checks row ownership, not score integrity. This is a Critical finding — see Security Report SEC-M1/M2 and Bug Report.

### 3.3 Two parallel clinician-access data models

The codebase contains **two coexisting authorization models** for clinician↔patient relationships that were never unified:

1. **Legacy model:** `profiles.assigned_clinician_id` — a single FK per patient, set only via admin user-management UI (role change), never written by the newer consent flow. Powers: `/patients` (clinician patient list), `/messages`, `clinical_notes` RLS/API checks, `/api/assignments`, and the `assessment_submissions`/`clinical_notes`/`messages` RLS policies.
2. **New consent model (added later):** `clinician_patient_relationships` + `relationship_permissions` + `patient_access_codes` + `clinician_invitations` — a granular, patient-controlled consent system with per-permission grants, exposed through `/patient/clinicians`, `/clinician/connect`, `/connect/[token]`, and `/api/access-requests`, `/api/relationships/**`.

**The two models never talk to each other.** Approving a clinician through the new consent flow does not set `assigned_clinician_id`, so the clinician still cannot see the patient in `/patients`, cannot message them, and cannot write clinical notes for them — the features that depend on the legacy column remain empty/blocked even after a successful "connect." This is the single largest architectural defect found in this audit; see `implementation-roadmap.md` R-1.

---

## 4. Authentication Flow

```
Patient/Clinician:
  /register or /login (client)
    → supabase.auth.signUp()/signInWithPassword() — DIRECT client call, not proxied through
      an API route that enforces CAPTCHA/rate-limit server-side
    → Optional client-side pre-check: POST /api/auth/check-login-limit or check-signup-limit
      (these are ADVISORY ONLY — they don't gate the actual Supabase auth call)
    → Supabase issues session, @supabase/ssr writes cookies (no explicit cookieOptions override
      found — defaults apply, see Security Report AUTH-2)
    → middleware.ts refreshes session every request
    → Server Components call getUser() to gate route content

Admin:
  /x/control/login → POST /api/admin/login
    → Validates email/password via Supabase, checks profiles.role ∈ {admin, superadmin}
    → Validates 6-8 digit ADMIN_PIN (plain !== comparison, not constant-time)
    → Issues HMAC-signed `admin_session` cookie (httpOnly, secure, sameSite=lax, maxAge=8h) —
      HMAC key = ADMIN_SESSION_SECRET only (no PIN fallback in current code)
    → requireAdmin() on protected admin routes re-verifies the HMAC
    → TWO admin API routes (clinician-verifications, kpis/[id]/alert) use a WEAKER local
      role check that skips the HMAC step entirely — see Security Report ADM-1/ADM-2
```

This is architecturally sound in concept (defense in depth: Supabase auth + role + PIN + HMAC), but the CAPTCHA/rate-limit-as-advisory-only pattern and the two HMAC-skipping routes undermine it in practice.

---

## 5. Authorization Flow

- **Route-level:** `middleware.ts` gates whole path prefixes for "is there a logged-in user at all" — it does not check role.
- **Page-level:** Server Components under `app/x/control/(panel)/` call `requireAdmin()`. Pages under `app/(app)/**` generally do not re-check role beyond what the sidebar renders — role-specific pages rely on **API-level** checks, not page-level redirects, for the security boundary (e.g., a patient visiting `/patients` would see the clinician UI shell render, but API calls would 403).
- **API-level:** Each route handler independently re-implements auth/authz. There is no shared authorization middleware or decorator, which is why the audit found **inconsistent enforcement** (some routes check clinician assignment, others don't; some admin routes require the HMAC cookie, two don't).
- **Database-level (RLS):** The last line of defense. Generally well-implemented, with one **duplicate-policy defect** on `clinical_notes` and `messages` where an older, stricter policy and a newer, looser policy coexist (both apply, OR'd) — see Database Report.

---

## 6. Database Relationships (Summary — full detail in database-report.md)

Core entity relationships:

```
auth.users ──1:1── profiles (role: patient|clinician|admin|superadmin)
profiles ──1:1── patient_profiles / clinician_profiles (role-specific extension)
profiles(patient) ──1:N── assessment_submissions ──1:N── assessment_responses
assessment_definitions ──1:N── assessment_items, assessment_submissions
profiles(patient) ──1:N── mood_logs, journal_entries, medications
profiles(clinician) ──1:N── clinical_notes, messages (legacy: via assigned_clinician_id)
profiles(patient) ──1:N── clinician_patient_relationships ──1:N── relationship_permissions (new model)
packages ──1:N── package_assessments ──N:1── assessment_definitions
profiles ──1:N── package_results, package_sessions
profiles ──1:N── notifications, audit_log(actor_id), rate_limit_log(key)
```

No `payments`, `subscriptions`, `invoices`, or `appointments` tables exist. "Packages" is a content-bundling feature, not a commerce feature (see §9).

---

## 7. Role System

| Role | Set by | Enforced where |
|---|---|---|
| `patient` | Default on signup | RLS (`patient_id = auth.uid()`), API ownership checks |
| `clinician` | Admin-only, via `/x/control/users` role dropdown | RLS via `assigned_clinician_id` (legacy) or relationship checks (new); no self-serve clinician signup exists |
| `admin` | Superadmin-only (API-enforced) | `requireAdmin()` (session + role + HMAC) — except 2 routes (see §4) |
| `superadmin` | Not assignable via any UI found in this repo — must be set directly in DB | Distinguished from `admin` in some routes (e.g., announcement edit-by-others, profile delete), inconsistently in others (KPI alert route excludes `superadmin` entirely — likely a bug, not a deliberate restriction) |

There is **no clinician self-registration path**. A clinician account only comes into existence when an admin manually promotes an existing patient-role user via `/x/control/users`. The `/clinician/verification` submission flow assumes the user already has the `clinician` role, which is a chicken-and-egg gap in the onboarding story (see Bug Report / Workflow findings).

---

## 8. Supabase Usage Pattern

- **`lib/supabase/client.ts`** — browser client (anon key), used for direct client-side reads (mood, journal, dashboard, realtime subscriptions for messages/notifications).
- **`lib/supabase/server.ts`** — SSR client bound to request cookies, RLS-enforced, used in Server Components and most route handlers for auth (`getUser()`).
- **`lib/supabase/admin.ts`** — service-role client, RLS bypassed. Used in nearly every mutation-heavy API route (assessment submission, notifications, admin operations, exports). This is a common and reasonable pattern *if and only if* every route that uses it performs its own authorization check first — the audit found this holds true in most, but not all, routes (see Security Report for exceptions).
- **Realtime** is used for the notification bell and messages page (`supabase.channel(...).on('postgres_changes', ...)`), with proper cleanup (`removeChannel` in effect cleanup) — no memory leak found there.
- **Materialized views** (`admin_*`) back the admin KPI/risk dashboards; PostgREST/Data-API access to them was partially revoked in a later migration, but one view (`admin_demographics_summary`) was missed — see Database Report DB-C3.
- **RPCs** are used for: rate limiting (`check_and_record_rate_limit`), atomic assessment submission (`submit_assessment_atomic`), and 8 admin dashboard aggregation functions — several of the latter are `GRANT EXECUTE TO authenticated` with **no in-function role check**, meaning any logged-in user could call them directly via PostgREST and retrieve aggregate (and in one case, per-patient) data intended for admins only — see Database Report DB-C1 (Critical).

---

## 9. API Structure

54 route handlers under `app/api/`, organized by domain: `auth/*`, `admin/*` (23 routes), `user/*`, `patient/*`, `clinician/*`, `packages/*`, `access-requests/*`, `relationships/*`, `connect/*`, plus feature-specific top-level routes (`submit-assessment`, `submit-assessment-guest`, `score-assessment`, `reports`, `notifications`, `notify-message`, `notify-high-risk`, `check-rescreening`, `synthesis`, `ai-chat`, `recommend-assessments`, `clinical-notes`, `assignments`, `health`).

There is no shared request-validation library (e.g., zod schemas) — validation is hand-rolled per route with varying rigor. There is no shared authorization middleware — every route re-implements its own auth check by calling `supabase.auth.getUser()` (or `requireAdmin()`) at the top of the handler. This duplication is the direct cause of the inconsistencies catalogued in the Security Report (e.g., two admin routes forgetting the HMAC check; clinician assignment checks present on some clinical routes but not others).

---

## 10. State Management

- No global client state library (no Redux/Zustand/Jotai). State is local `useState`/`useEffect` per page, with Supabase as the source of truth fetched on mount.
- Server Components fetch data directly (no client-side data-fetching library like React Query/SWR) — this means most list pages have hand-rolled loading/error/empty state logic, leading to the inconsistency documented in the UI Report.
- `localStorage` is used for assessment-in-progress autosave (`vw_assessment_${id}_${userId}`), which is a reasonable client-only UX affordance but has no server-side counterpart on web (mobile uses a DB table, `assessment_sessions`, that doesn't actually exist in migrations — see Bug Report).

---

## 11. Caching

- No explicit `revalidate`/`fetch` caching strategy found on the public marketing pages (home, clinicians, contact) — they are dynamically rendered by default in the App Router unless configured otherwise, which is a missed, low-effort performance win (see Performance Report).
- No HTTP caching headers are set on API responses beyond `Cache-Control: no-store` for `/api/*` (set blanket in `middleware.ts`), which is appropriate for PHI-bearing endpoints but also prevents caching for cacheable ones (e.g., `assessment_definitions` catalog, `recommend-assessments`).
- No Vercel Data Cache / ISR usage found for the assessment catalog, which is static-ish reference data reloaded on every page visit.
- No Redis-backed caching for admin analytics (an Upstash Redis wrapper `lib/rate-limit/redis.ts` exists but is imported nowhere — dead code, used for rate limiting only in theory).

---

## 12. File Uploads

Notably, **no working file/document upload exists** for clinician credential/certificate verification. The clinician verification form (`app/(app)/clinician/verification/page.tsx`) explicitly displays a "document upload coming soon" placeholder — `clinician_verifications.document_urls` is a schema column with no producer. This means the "Certificate Upload" step required by the audit brief (Seventh Task) **does not exist as a real feature** today.

Other file-adjacent features are exports, not uploads: CSV/JSON exports from admin and self-service GDPR export, all server-generated, not user-uploaded.

---

## 13. Notifications

Two notification surfaces:
1. **In-app** (`notifications` table + `notification-bell.tsx`, realtime-subscribed, RLS-scoped to `user_id`).
2. **`notification_events`** (newer, powers the consent/connect workflow — access request created/approved/rejected, invitation accepted).

There is no email/SMS notification channel implemented in this codebase (no SendGrid/Twilio/etc. integration found) despite `notification_log`/`push_tokens` tables existing — push notification *registration* exists (`/api/user/push-token`), but no code path was found that actually sends a push via Expo's push service. This means the "notify clinician of high-risk patient" flow is **in-app only**, and if the clinician isn't logged in and looking at the bell, there is no guaranteed delivery — a material clinical-safety gap for a mental-health platform (see Security Report / Bug Report — High severity).

---

## 14. Payments

**There is no payment/billing system in this codebase.** No Stripe, PayPal, or other payment SDK; no `payments`, `invoices`, `subscriptions`, or `orders` tables in any migration. The "Packages" feature (multi-assessment bundles with composite scoring) is the closest analog to a monetizable product, but it is currently free and open to any authenticated user with no purchase/entitlement gate (RLS: `packages_authenticated_read` grants read to any `authenticated` role). If the business intends to charge for packages, this is unbuilt, not broken — a Product/Roadmap gap rather than a bug.

---

## 15. Assessments Engine

- **Content:** `lib/assessment-content.ts` (~209 KB) + `lib/assessment-content-ar.ts` (~50 KB) hold interpretive text/recommendations per severity band, keyed by assessment code. Actual scoring logic (bands, thresholds) lives in the database (`assessment_definitions.scoring_logic`, `high_risk_threshold`), not in this file — the file is presentation-layer content, not the scoring engine itself.
- **Scoring:** Server-side in `/api/submit-assessment` for the web path (see §3.2). Validated evidence shows the web path correctly rejects invalid response values and computes score/band/high-risk server-side.
- **Guest flow:** `/api/submit-assessment-guest` is a hardened, unauthenticated endpoint (Turnstile + multi-tier rate limits + circuit breaker) but has **no corresponding UI** — it's callable but the product doesn't expose it to end users today. It is also inconsistent with a migration that adds `NOT NULL` to `assessment_submissions.patient_id` — guest submissions store `patient_id: null`, which the constraint would reject if applied (see Database Report / Bug Report).
- **High-risk handling:** Detected server-side (safety-item flag or score threshold) but the notification path is fire-and-forget to admins only — not the assigned clinician, and not any external channel.
- **Mobile:** Bypasses all of the above — see §3.2 and Security Report.

---

## 16. Clinician / Admin / Patient / Research Workflow Summaries

Full step-by-step completeness tables are in the workflow audit that fed this report; headline findings:

- **Patient workflow:** ~75% complete for its stated scope. Missing: appointments/scheduling (does not exist at all), payments (does not exist), and messaging/notes are gated on the legacy `assigned_clinician_id` field that the new consent flow never populates.
- **Clinician workflow:** ~40% complete end-to-end. No self-serve registration; verification submission has no document upload; **admin approval exists only as an API with zero UI**; and even after a patient approves a clinician through the new consent system, the clinician's patient list, messaging, and notes remain empty because those features read the legacy field.
- **Admin workflow:** ~85% complete. Strong: users, results (paginated), analytics, risk, packages, announcements, audit log, platform settings. Missing/broken: no UI for clinician verification approval (API-only), an orphaned KPI dashboard not linked from any nav, and no confirmation dialogs on several destructive actions (role change, deactivate user, assessment visibility toggle, note delete).
- **Research workflow:** A "Research" tab exists embedded inside `/x/control/analytics` (backed by `/api/admin/research`), not a standalone dashboard. It loads up to 5,000 submission rows into server memory for in-process aggregation — a performance concern at scale, not a correctness bug today.

---

## 17. Mobile App Architecture

Expo/React Native app under `mobile/`, connecting **directly to Supabase** for most reads/writes and to a small number of Next.js API routes (`EXPO_PUBLIC_WEB_URL`) for AI chat, push token registration, PDF export (route does not exist — 404), and GDPR export/delete (cookie-only routes called with Bearer — likely 401).

Estimated completeness: **~50%** of a production-parity companion app. The single most severe issue: assessment scoring happens entirely client-side with a direct Supabase insert, which — combined with RLS that only checks row ownership — allows a modified client to submit arbitrary scores, suppress high-risk flags, or fabricate results. Several other screens (mood, journal, messages) use column names that don't match the actual Postgres schema and are hidden from the tab bar, suggesting they were scaffolded but never finished/tested against the real database.

---

## Summary: What's Actually Solid vs. What's Aspirational

| Claim in repo's own prior audits | Verified status |
|---|---|
| "Next.js 15.5.19, 8 CVEs fixed" | ❌ **False on this branch** — `package.json` shows `14.2.35` |
| "100/100 Authentication, 100/100 Authorization" | ❌ **Overstated** — CAPTCHA/rate-limit is client-triggered and bypassable server-side; two admin routes skip the HMAC check |
| "RLS coverage 29/30 tables" | ⚠️ **Coverage yes, correctness no** — `clinical_notes`/`messages` have conflicting duplicate policies that widen access beyond intent |
| "Clinician-patient consent system implemented (PR #16)" | ⚠️ **Implemented but not integrated** — coexists with, does not replace, the legacy model that the rest of the app still depends on |
| "Mobile scoring parity" listed as an open item in `AUDIT_REPORT.md` | ✅ **Confirmed still open** — this audit independently verified the same gap with current code |

This report's companion documents provide exact file:line evidence for every finding referenced above.
