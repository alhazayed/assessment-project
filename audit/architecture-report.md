# V Welfare — Architecture Report

**Platform:** V Welfare Mental Healthcare Platform  
**Audit Date:** 2026-07-13  
**Repository:** `/workspace`  
**Stack:** Next.js 14.2.35 · React 18 · TypeScript 5 · Supabase (Auth + Postgres + Realtime) · Vercel · Gemini API · Cloudflare Turnstile · Expo Mobile  
**Scope:** Full repository read-only architecture analysis — no code changes applied

---

## Executive Summary

V Welfare is a bilingual (English/Arabic) mental health assessment and care-coordination platform serving **patients**, **clinicians**, and **admins**. The web application uses Next.js App Router with Supabase SSR authentication, a service-role API layer for privileged writes, and an obfuscated admin control panel at `/x/control`. A separate Expo mobile app shares the Supabase backend but diverges significantly in API integration patterns.

The architecture is **mature for a limited beta** on web, with strong security primitives (CSP nonces, HMAC admin sessions, rate limiting, PHI scrubbing, atomic assessment submission RPC). However, **dual clinician–patient authorization models**, **mobile/web schema drift**, and **incomplete feature surfaces** (payments, appointments) create operational and scaling risks for production healthcare deployment.

**Architecture Readiness Score: 72/100**

---

## Overall Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
├──────────────────────────────┬──────────────────────────────────────────┤
│  Next.js 14 Web App          │  Expo Mobile App (mobile/)               │
│  App Router · SSR + Client   │  Expo Router · Direct Supabase client    │
│  EN/AR · RTL · Dark mode     │  EN/AR · RTL · Push notifications        │
└──────────────┬───────────────┴──────────────────┬───────────────────────┘
               │                                    │
┌──────────────▼────────────────────────────────────▼───────────────────────┐
│                         EDGE / MIDDLEWARE LAYER                              │
│  middleware.ts — Session refresh · CSP nonce · Route guards · API headers   │
└──────────────┬──────────────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                                    │
├──────────────────────────────┬──────────────────────────────────────────────┤
│  Pages (44 routes)           │  API Routes (56 handlers)                    │
│  Route groups: (auth)(app)   │  No Server Actions — fetch('/api/*') only   │
│  Admin: /x/control           │  Admin APIs: requireAdmin() + service role   │
└──────────────┬───────────────┴──────────────────┬───────────────────────────┘
               │                                    │
┌──────────────▼──────────────┐         ┌───────────▼───────────────────────────┐
│  Supabase SSR Client        │         │  Supabase Admin Client (service role)   │
│  lib/supabase/server.ts     │         │  lib/supabase/admin.ts                │
│  lib/supabase/client.ts     │         │  Used in 38+ API routes after auth    │
│  RLS enforced on reads      │         │  Bypasses RLS — app-layer auth required │
└──────────────┬──────────────┘         └───────────┬───────────────────────────┘
               │                                    │
┌──────────────▼────────────────────────────────────▼───────────────────────────┐
│                    SUPABASE (PostgreSQL + Auth + Realtime)                   │
│  45 tables · 5 materialized views · RLS on all tables · 24+ functions       │
│  Triggers · Atomic RPCs · Rate limit log · Audit log · Consent system        │
└─────────────────────────────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                    │
│  Gemini API (AI chat, synthesis, package interpretation, clinical drafts)   │
│  Cloudflare Turnstile (CAPTCHA) · Vercel (hosting, serverless functions)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Folder Organization

| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router — pages, layouts, API routes, metadata routes |
| `app/(auth)/` | Login, register, forgot/reset password |
| `app/(app)/` | Authenticated patient/clinician shell with sidebar |
| `app/x/control/` | Obfuscated admin panel (overview, analytics, users, audit, etc.) |
| `app/api/` | 56 REST route handlers — all mutations flow through here |
| `components/` | 21 shared React components (sidebar, crisis banner, notifications, etc.) |
| `lib/` | Core utilities — Supabase clients, i18n, assessment content, security, rate limits |
| `lib/security/` | PHI anonymization, Turnstile verification, AI budget guard, file export |
| `lib/supabase/` | Server, client, and admin Supabase factory functions |
| `supabase/migrations/` | 100 migration files (~21 with executable SQL; remainder are remote stubs) |
| `mobile/` | Expo SDK 53 app — separate package.json, shares Supabase project |
| `__tests__/security/` | RLS, IDOR, PHI scrubber unit tests |
| `load-tests/` | k6 scenarios (100–1000 VUs) |
| `docs/` | Disaster recovery documentation |

**Notable absence:** No `hooks/` directory at root — client hooks live in `lib/use-lang.ts`. No `actions/` directory — no Server Actions used anywhere.

---

## Data Flow

### Patient Assessment (Web — Correct Path)

```
User → /assessments/[id] (assessment-content.tsx)
  → localStorage progress save on each answer
  → POST /api/submit-assessment
      → getUser() auth check
      → checkRateLimit (20/hour/user)
      → Validate responses against assessment_items.response_options
      → Score server-side (sum values, match scoring_logic bands)
      → Flag high_risk (safety items OR total_score ≥ threshold)
      → RPC submit_assessment_atomic(patient_id = user.id)
      → Update assignment status if applicable
      → Async: admin high-risk notifications + audit_log
  → Client renders score, severity band, static interpretation content
```

### Package Assessment Flow

```
/packages/[id] → POST /api/packages/[id]/compute
  → Weighted composite from latest submissions per assessment code
  → package_results row upserted
/packages/[id]/result → POST /api/packages/[id]/interpret (optional Gemini)
  → lib/package-interpret.ts rule-based narrative
  → PDF via client-side @react-pdf/renderer (pdf-download-button.tsx)
```

### Clinician–Patient Connection (New Consent Model)

```
Clinician (verified) → POST /api/clinician/invite → token URL /connect/[token]
Patient → /connect/[token]/accept → POST /api/connect/[token]
  → clinician_patient_relationships (status: active)
  → relationship_permissions (granular keys)
Patient manages permissions → /patient/clinicians + PATCH /api/relationships/[id]/permissions
```

**Legacy parallel path:** `profiles.assigned_clinician_id` still drives messaging, assignments, and several API authorization checks.

---

## Authentication Flow

### Patient / Clinician (Supabase Auth)

| Step | Component | Details |
|------|-----------|---------|
| Register | `app/(auth)/register/page.tsx` | Email/password, Turnstile CAPTCHA, pre-check rate limit |
| Email confirm | `app/auth/confirm/route.ts` | PKCE code exchange or OTP; open-redirect blocked via allowlist |
| Profile creation | `handle_new_user()` trigger | Creates `profiles` + `patient_profiles` on auth.users INSERT |
| Login | `app/(auth)/login/page.tsx` | signInWithPassword → httpOnly SSR cookies |
| Session refresh | `middleware.ts` | createServerClient refreshes JWT on every matched request |
| Logout | Client-side | supabase.auth.signOut() in sidebar/profile |
| Password reset | forgot-password → confirm → reset-password | Always-200 forgot-password API (anti-enumeration) |

### Admin (Dual-Layer)

```
/x/control/login
  → POST /api/admin/login
      1. Verify ADMIN_PIN (shared static secret)
      2. supabase.auth.signInWithPassword
      3. profiles.role ∈ {admin, superadmin}
      4. Set admin_session cookie = HMAC-SHA256(userId:role, ADMIN_SESSION_SECRET)
  → requireAdmin() on every admin page/API
      → Re-verify Supabase user + role + HMAC cookie match
```

**File:** `lib/admin-auth.ts`

---

## Authorization Flow

### Middleware (`middleware.ts`)

- Checks **Supabase session presence only** — not role
- Private routes: dashboard, profile, assessments, packages, clinician, patient, admin, etc.
- Admin area `/x/control/*`: requires session; PIN/HMAC verified per-page
- Logged-in users on auth pages → redirect to `/dashboard`

### Application-Layer RBAC

| Role | Enforcement |
|------|-------------|
| **patient** | RLS owns PHI rows; patient-only API checks |
| **clinician** | Role check in API routes; `assigned_clinician_id` or relationship checks |
| **admin** | `requireAdmin()` + service role for bulk operations |
| **superadmin** | Can assign admin roles; can delete profiles |

### Database RBAC

- `get_my_role()` SECURITY DEFINER — breaks RLS recursion
- `prevent_role_self_escalation` trigger on profiles UPDATE
- `check_relationship_permission()` — consent-based access (defined but **not used in app code**)

---

## Database Relationships

### Core Entity Graph

```
auth.users
  └── profiles (1:1)
        ├── patient_profiles (1:0..1)
        ├── clinician_profiles (1:0..1)
        ├── clinician_verifications (1:0..1)
        └── assigned_clinician_id → profiles (self-FK)

assessment_definitions
  ├── assessment_items
  ├── assessment_governance
  ├── assessment_interpretation_templates
  ├── assessment_submissions → assessment_responses
  └── assessment_assignments

clinician_patient_relationships
  └── relationship_permissions

packages
  ├── package_assessments
  ├── package_interpretations
  ├── package_results
  └── package_sessions
```

**45 tables total.** See `database-report.md` for full schema audit.

---

## Role System

| Role | Creation | Capabilities |
|------|----------|--------------|
| `patient` | Default on signup | Own assessments, mood, journal, messaging, clinician connections |
| `clinician` | Admin assigns via `/x/control/users` | Patient list, assignments, clinical notes, verification flow |
| `admin` | Superadmin assigns | Full platform control via `/x/control` after PIN + HMAC |
| `superadmin` | Manual DB or superadmin UI | Admin role assignment, profile deletion |

**Critical gap:** `handle_new_user()` accepts `role` from signup metadata — client could inject privileged roles on INSERT (see security-report.md).

---

## Supabase Usage

| Pattern | Usage | Files |
|---------|-------|-------|
| SSR cookies | Session management | `middleware.ts`, `lib/supabase/server.ts` |
| Browser client | Realtime, client reads | `lib/supabase/client.ts`, notification bell, messages |
| Service role | API writes bypassing RLS | 38+ routes via `createAdminClient()` |
| Realtime | Messages, notifications | `messages/page.tsx`, `notification-bell.tsx` |
| RPC | Atomic submit, rate limits, admin dashboard | `submit_assessment_atomic`, `check_and_record_rate_limit` |
| Storage | Clinician verification documents | `/api/clinician/verification` |

---

## API Structure

**56 route handlers** organized by domain:

| Domain | Routes | Auth Pattern |
|--------|--------|--------------|
| Auth | `/api/auth/*` | Public + rate limited |
| Assessments | submit, score, guest, rescreening, recommend | User auth or public (guest) |
| Admin | 20+ routes under `/api/admin/*` | requireAdmin() |
| Clinician | patients, invite, verification | Role check + RLS/service role |
| Patient | code, relationships | Role check |
| User | export-data, delete-request, push-token | User auth |
| Packages | compute, interpret | User auth |
| AI | ai-chat, synthesis | User auth + budget guard |
| Clinical | clinical-notes, reports | Role-scoped |
| Connect | `/api/connect/[token]` | Patient auth for accept |

**No Server Actions.** All mutations via `fetch('/api/...')` from client components or direct Supabase client calls (mobile).

---

## State Management

| Concern | Approach |
|---------|----------|
| Auth state | Supabase SSR cookies (web); `useAuth()` hook (mobile) |
| Language | Cookie `lang` → server `getLanguage()`, client `useLang()` |
| Dark mode | localStorage `vw-theme` + CSS class on `<html>` |
| Assessment progress | localStorage `vw_assessment_{id}_{userId}` (web) |
| Notifications | Supabase Realtime subscription + polling |
| Feature flags | `feature_flags` table → loaded in `(app)/layout.tsx` |
| Admin session | httpOnly `admin_session` HMAC cookie |

No Redux, Zustand, or React Context for global app state beyond locale (mobile has `LocaleContext`).

---

## Caching

| Layer | Strategy |
|-------|----------|
| API responses | `Cache-Control: no-store` on all `/api/*` (middleware) |
| Next.js | Default App Router caching; authenticated pages use dynamic rendering |
| Static assets | Vercel CDN for `_next/static`, images |
| Admin mat views | Materialized views refreshed (pg_cron stub — not in repo SQL) |
| Rate limits | Postgres `rate_limit_log` with advisory locks |
| Redis | Optional backend in `lib/rate-limit/redis.ts` — Postgres is primary |

---

## File Uploads

| Feature | Mechanism |
|---------|-----------|
| Clinician verification | Supabase Storage via `/api/clinician/verification` |
| Message attachments | `messages.attachments` jsonb column (schema exists) |
| PDF export | Generated server-side via `@react-pdf/renderer` — no user upload |
| Admin export | CSV/HTML generated server-side |

Upload validation should be verified per-route (see security-report.md).

---

## Notifications

| System | Table | Consumer |
|--------|-------|----------|
| In-app bell | `notifications` | `notification-bell.tsx`, `/api/notifications` |
| Consent events | `notification_events` | Access requests, connect flow — **may not appear in bell** |
| Push tokens | `push_tokens` | Mobile registration via `/api/user/push-token` |
| High-risk alerts | Insert to `notifications` | Async after assessment submit |
| Local reminders | Expo scheduled notifications | Mobile mood/assessment reminders |

**Gap:** No server-side Expo push dispatch for incoming messages or high-risk alerts.

---

## Payments

**Not implemented.** No Stripe, PayPal, or billing integration exists in the codebase. Platform operates as free-access. KPI dashboard marks payment-related metrics as unavailable.

---

## Assessments Engine

| Component | Location |
|-----------|----------|
| Question content (EN) | `lib/assessment-content.ts` (~209KB static content) |
| Question content (AR) | `lib/assessment-content-ar.ts` |
| Scoring logic | Server-side in submit/score routes; bands in `assessment_definitions.scoring_logic` |
| Atomic submission | `submit_assessment_atomic()` RPC |
| Interpretation | Static content by code + severity band; package rules in `lib/package-interpret.ts` |
| High-risk detection | Safety items + threshold comparison |
| Guest flow | `/api/submit-assessment-guest` — API exists, no frontend UI |
| Rescreening | `/api/check-rescreening` + `rescreening-trigger.tsx` |

---

## Clinician Workflow

```
Admin assigns role=clinician
  → /clinician/verification (license upload → clinician_verifications)
  → Admin approval (API exists, NO UI)
  → /clinician/connect (invite patients via token)
  → /patients (view assigned patients, submissions, notes, assignments)
  → /api/assignments POST (assign assessments)
  → /api/clinical-notes (CRUD + AI draft)
```

**Issues:** Dual assignment model; verification approval has no admin UI; `/api/clinician/patients` queries wrong column `user_id` instead of `patient_id`.

---

## Admin Workflow

```
/x/control/login (email + password + PIN)
  → Overview, Analytics, Users, Results, Risk
  → Assessments, Packages, Announcements, Audit, Platform settings
  → Exports (CSV, anonymized research, HTML "PDF")
  → KPI dashboard at /admin/kpi-dashboard (legacy entry)
```

**Auth:** `requireAdmin()` on all panel pages and admin API routes.

---

## Patient Workflow

```
Register → Email confirm → /onboarding (3-step profile wizard)
  → /dashboard (recent activity, mood, assignments)
  → /assessments (take assessments, view history)
  → /packages (multi-assessment bundles, feature-flagged)
  → /mood, /journal, /insights, /adhd-zones
  → /messages (requires assigned_clinician_id)
  → /patient/clinicians (consent-based clinician management)
  → /profile (settings, data export, delete request)
```

**Gaps:** No appointments; no payments; messaging not wired to consent model.

---

## Research Workflow

```
/api/admin/research — Anonymized exports via lib/security/anonymizePHI.ts
/api/admin/export — CSV/detailed/stats/risk/demographics formats
Admin mat views — Population-level analytics (security concerns — see database-report.md)
```

PHI scrubbing rules tested in `__tests__/security/phi.test.ts`.

---

## Mobile Architecture

| Aspect | Status |
|--------|--------|
| Framework | Expo SDK 53, Expo Router, NativeWind |
| Auth | Direct Supabase client (`mobile/lib/supabase.ts`) |
| Data access | Direct Supabase queries — **bypasses web API layer** |
| Parity | Partial — missing packages, onboarding, clinician flows, connect |
| Critical bugs | Wrong messages schema, missing PDF endpoint, missing assessment_sessions table, direct DB submit |

**Recommendation:** Mobile should call web API routes for all mutations to inherit rate limits, audit logging, and server-side validation.

---

## Deployment Configuration

| File | Purpose |
|------|---------|
| `vercel.json` | Extended function timeouts (AI routes 25–30s, export 60s) |
| `next.config.js` | Security headers (HSTS, X-Frame-Options, Referrer-Policy) |
| `supabase/config.toml` | Local Supabase CLI config |
| `load-tests/` | k6 performance scenarios |

**Known issue:** Supabase migration sync failure blocking Vercel preview deployments (see `KNOWN_ISSUES.md`).

---

## Technical Debt Summary

| Item | Severity | Location |
|------|----------|----------|
| Dual clinician–patient authorization models | High | Messaging, assignments vs relationships |
| Service-role bypass pattern (38+ routes) | High | All admin + many user APIs |
| Mobile/web schema drift | Critical | `mobile/app/(app)/messages.tsx`, assessments |
| No Server Actions | Low | Architectural choice — consistent API pattern |
| 79 migration stubs (non-reproducible) | High | `supabase/migrations/` |
| Assessment content monolith (209KB) | Medium | `lib/assessment-content.ts` |
| No payments/appointments | Medium | Product gap |
| Admin RPCs exposed to all authenticated users | Critical | Database layer |

---

## Final Architecture Verdict

The web platform demonstrates **sound architectural patterns** for a healthcare SaaS: SSR auth, defense-in-depth security headers, atomic database operations, bilingual RTL support, and separation of admin controls. The primary architectural risks are **authorization model fragmentation**, **mobile bypass of the API security layer**, and **database-layer exposure of admin analytics to non-admin users**.

**Recommended next step:** Address Critical items in `implementation-roadmap.md` before production launch. No code changes have been made — awaiting approval.
