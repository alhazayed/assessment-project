# V Welfare Architecture Report
**Audit date:** 2026-07-13 · **Method:** static review of current repository source, 54 API routes, 100 migrations, web and Expo clients. Runtime/cloud configuration was not independently verified.

## Executive architecture
V Welfare is a bilingual Arabic/English mental-health platform with a Next.js 14.2.35 App Router web application, Expo mobile client, Supabase Auth/Postgres/Realtime, Gemini integration, and Vercel deployment configuration. The web request path is:

`browser → middleware (session refresh, route redirect, CSP) → Server Component/client component or route handler → Supabase user client (RLS) or server-only service-role client → PostgreSQL`.

The mobile client authenticates directly to Supabase using a persisted AsyncStorage session, and also calls web APIs. This makes database RLS a primary security boundary, not merely defense in depth.

## Organization
| Area | Location | Responsibility |
|---|---|---|
| Web routes | `app/` | App Router public, authenticated, clinician, and `/x/control` admin pages |
| APIs | `app/api/**/route.ts` | 54 HTTP route handlers for clinical, admin, auth, assessment, exports, and AI |
| Shared UI | `components/` | navigation, charts, crisis, language/theme, assessment widgets |
| Domain/utilities | `lib/` | scoring content, i18n, auth, Gemini, rate limits, PHI redaction, exports |
| Database | `supabase/migrations/` | baseline schema plus incremental RLS, consent, package, analytics migrations |
| Mobile | `mobile/` | Expo Router companion app, own i18n/theme/auth hooks |
| Tests/load | `__tests__/security/`, `load-tests/` | security HTTP test scaffolding and k6 scenarios |

## AuthN and AuthZ
- Web: `@supabase/ssr` creates cookie-backed sessions; `middleware.ts` refreshes `getUser()` and redirects unauthenticated private routes.
- Mobile: `mobile/lib/supabase.ts` persists tokens in AsyncStorage. The app therefore exposes every permissive RLS policy directly to an installable client.
- Admin console: Supabase account role (`profiles.role`) plus `ADMIN_PIN` login creates HMAC `admin_session`; `requireAdmin()` checks user, role, and cookie.
- Authorization is split between route-level checks, legacy `profiles.assigned_clinician_id`, newer relationship/permission tables, and RLS. This split is unsafe until a single relationship-permission model is authoritative; see Security and Database reports.

## Data model and flow
Core identity is `auth.users → profiles`, with optional `patient_profiles` and `clinician_profiles`. Clinical data includes assessments (`assessment_definitions`, `assessment_items`, `assessment_submissions`, `assessment_responses`, `assessment_assignments`), mood/journal/notes/messages, packages, notifications/audit logs, and clinician-patient relationships with granular permissions.

Authenticated assessment submission calls `POST /api/submit-assessment`, which validates and scores then calls `submit_assessment_atomic`. Guest submission uses a service-role route. Results feed dashboards, PDF reports, notifications, and optional Gemini synthesis. Local assessment progress is stored in browser localStorage.

## Roles and workflows
| Role | Current workflow |
|---|---|
| Patient | Register, consent/onboard, assessment, history/PDF, mood/journal, messages, clinician relationship management, export/delete request |
| Clinician | Credential submission, request/invite patient relationship, patient list, assessment assignment, messages, clinical notes/AI draft |
| Admin/superadmin | Separate control panel for users, assessments, packages, analytics, research, export, flags, settings and audit views |
| Research | Admin research endpoint aggregates submissions/demographics; no repository evidence of participant research consent enforcement |

There is no implemented appointment scheduler or payment processor: no payment schemas, Stripe/provider SDK, billing routes, or appointment domain model were found. These must not be represented as production-ready workflows.

## State, caching, uploads, notifications
- State: React local hooks and Supabase client fetches; no centralized client state manager.
- Caching: no clear application cache strategy. API responses are `no-store`; database has materialized views, but their definitions are currently inconsistent with schema.
- Uploads: clinician verification accepts document URLs; no committed storage bucket/policy definition or server-side file ingestion flow was found.
- Notifications: `notifications` feeds the UI; relationship flows also write `notification_events`, for which no UI/API consumer was found. Push tokens are stored, but no Expo push delivery worker was found.

## Deployment and operational posture
`vercel.json` sets extended durations for AI/export handlers. `next.config.js` supplies baseline headers; middleware supplies nonce CSP. Local Supabase config specifies one-hour JWTs and email confirmation disabled. The committed configuration is not proof of production configuration. Disaster recovery documentation requires explicit verification of PITR, backups, secrets management, and restore drills.

## Architectural conclusions
The domain separation and database-first integrity primitives are promising, especially atomic assessment submission and rate-limit RPCs. Production readiness is blocked by the identity role trigger, consent-model drift, inconsistent RLS/migrations, and ungoverned third-party AI PHI paths. These must be corrected before feature expansion.
