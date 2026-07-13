# V Welfare Architecture Report

**Audit date:** 2026-07-13  
**Audited checkout:** `claude/project-functionality-UDm55` at `2b5ef8e`  
**Production deployment observed:** Vercel `dpl_5NZ83mAKTFW9ymEcdeZ7WRnhyDCi`, commit `004ff281` on `main`

## Scope and confidence

This report is based on review of all 337 tracked files in the checkout, including application and mobile source, 100 local Supabase migrations, configuration, tests, load scenarios, and project documentation. Live read-only checks were also run against Supabase project `wyzezyctpvlohuuhzyof` and `https://app.vwelfare.com`.

The production source is **45 commits ahead** of this checkout and the production database has **17 migrations not present locally** (20260630153450 through 20260706085904). Therefore:

- source statements describe this checkout;
- findings explicitly marked “live verified” describe the deployed database or site;
- this branch cannot reproduce the production system and is not a valid disaster-recovery source of truth.

No authenticated destructive, payment, or clinician workflow was executed against production.

## Executive architecture

V Welfare is a Next.js App Router application deployed on Vercel, backed by Supabase Auth, Postgres, RLS, Realtime, and scheduled database maintenance. It includes a separate Expo mobile client. Google Gemini supports chat, synthesis, interpretation, and clinical-note drafting. PDF reports use `@react-pdf/renderer`.

```text
Web / Expo clients
  ├─ Supabase Auth (browser cookies on web; tokens on mobile)
  ├─ Next.js App Router pages
  ├─ Next.js route handlers (/app/api)
  │    ├─ user-authenticated Supabase client (RLS)
  │    ├─ service-role client after application authorization
  │    ├─ Gemini API
  │    └─ PDF generation
  └─ direct Supabase access (messages, realtime, some mobile writes)
       └─ Postgres tables, RPCs, RLS, triggers, pg_cron
```

There are no Server Actions. Mutations use route handlers or direct Supabase calls.

## Folder organization

| Path | Responsibility |
|---|---|
| `app/` | Next.js App Router pages, layouts, metadata, route handlers |
| `app/(auth)/` | Login, registration, password reset |
| `app/(app)/` | Authenticated patient/clinician application shell |
| `app/x/control/` | Separate admin console |
| `app/api/` | Approximately 55 API route files |
| `components/` | Shared UI, navigation, charts, assessment helpers |
| `lib/` | Supabase clients, types, scoring content, i18n, security utilities |
| `supabase/migrations/` | Local migration history/baseline; materially behind live |
| `mobile/` | Expo Router companion application |
| `__tests__/security/` | PHI unit tests and environment-dependent security tests |
| `load-tests/` | k6 scenarios for 100–1000 virtual users |
| `docs/` | Disaster-recovery documentation |

There is no root `README.md`, CI workflow, checked-in storage policy, or local payment migration/API implementation in this checkout.

## Request and data flow

1. `middleware.ts:17-36` refreshes the Supabase session using `getUser()`.
2. It applies a nonce CSP and authentication redirects (`middleware.ts:39-84`).
3. `(app)/layout.tsx:11-42` repeats user validation, loads profile/feature flags, and renders the app shell.
4. Client pages read through the browser Supabase client or call `/api/*`.
5. Route handlers authenticate with `auth.getUser()`.
6. Handlers either rely on RLS or use `createAdminClient()` after explicit checks.
7. Realtime subscriptions update messages/notifications.

The architecture has a risky split: authorization is partly in route handlers, partly in layouts, and partly in RLS. Direct browser/mobile Supabase access means RLS is the ultimate security boundary and cannot be treated as secondary.

## Authentication flow

### Patient and clinician

1. Registration calls Supabase Auth from `app/(auth)/register/page.tsx`.
2. Confirmation is exchanged in `app/auth/confirm/route.ts:47-73`.
3. `app/onboarding/page.tsx` captures profile/demographic/consent data.
4. Supabase cookies are refreshed by middleware.
5. Logout uses Supabase sign-out through the sidebar.

The live `auth.users` trigger is `trg_on_auth_user_created`, calling `handle_new_user()`. The function derives `profiles.role` from user-editable `raw_user_meta_data`. This is a critical architectural defect covered in the security report.

### Admin

Admin console authentication is intended as:

1. Supabase email/password;
2. role lookup;
3. `ADMIN_PIN`;
4. HMAC `admin_session` cookie bound to user ID and role.

`lib/admin-auth.ts:15-29` implements `requireAdmin()`. Most `/x/control` pages inherit this check. Some admin APIs use only the Supabase role and bypass the PIN/HMAC layer.

## Authorization and role model

`lib/types.ts:1` defines `patient | clinician | admin | superadmin`. Live Postgres has a matching role CHECK constraint.

| Layer | Effective purpose |
|---|---|
| Middleware | Presence of authenticated session; not business role |
| Layout | Clinician/admin section gates |
| Route handler | Operation-level checks |
| RLS | Row ownership/relationship enforcement for direct and API data access |
| Admin HMAC cookie | Additional admin-console factor |

Known page-gate gaps include `/patients` and `/admin/settings`, which inherit only generic authentication in this checkout. RLS may reduce disclosure but does not make role-inappropriate pages acceptable.

## Database relationships

```text
auth.users 1─1 profiles
profiles 1─1 patient_profiles / clinician_profiles
assessment_definitions 1─N assessment_items
assessment_definitions 1─N assessment_submissions
profiles(patient) 1─N assessment_submissions
assessment_submissions 1─N assessment_responses
profiles(patient/clinician) 1─N assessment_assignments
packages N─N assessment_definitions via package_assessments
packages 1─N package_results / package_sessions
clinician_patient_relationships 1─N relationship_permissions
profiles 1─N messages / clinical_notes / notifications
```

Live production additionally contains Stripe catalog/payment/purchase tables, ADHD check-ins, and assessment drafts. These are absent from local migrations.

## Two clinician–patient relationship systems

This is the dominant architectural inconsistency.

### Legacy model

`profiles.assigned_clinician_id` controls messages, assignments, clinical notes, and several RLS policies. Evidence includes:

- `app/(app)/messages/page.tsx:55-67`
- `app/api/assignments/route.ts:73-81`
- `app/api/clinical-notes/route.ts:26-31`
- `app/api/notify-message/route.ts:52-64`

### Consent model

`20260624120000_clinician_patient_consent_system.sql` adds verification, access codes, invitations, relationships, granular permissions, and notification events.

The models are not bridged. Creating a consent relationship does not set the legacy assignment field, while legacy access can exist without the granular consent record. Permission names also differ between:

- database constraint: migration lines 172-183;
- `lib/types.ts:271-294`;
- `lib/permissions.ts:3-14`;
- `app/api/access-requests/[id]/route.ts:8-19`.

This causes both workflow failures and contradictory authorization.

## API structure

| Domain | Representative routes |
|---|---|
| Auth | `/api/auth/check-*-limit`, captcha, forgot password |
| Assessments | submit, guest submit, score, rescreening, recommendations, high-risk |
| Packages | compute and AI interpretation |
| AI | chat, synthesis, clinical-note draft |
| Clinician relationship | verification, invites, access requests, relationships |
| Legacy clinical | assignments, notes, message notification, reports |
| User rights | export-data, delete-request, push-token |
| Admin | users, assessments, packages, results, analytics, research, exports, flags |
| Operations | `/api/health` |

Production health returned HTTP 200 on 2026-07-13. Vercel reported no grouped runtime errors in the last 24 hours.

## State management and caching

- React local state is the primary UI state mechanism; no Redux/Zustand.
- Assessment drafts use `localStorage` in `assessment-content.tsx:58-65`.
- Language, admin session, and Supabase session use cookies.
- Realtime powers messages and notification inserts.
- APIs receive `Cache-Control: no-store` from middleware.
- No application data cache, cache tags, or ISR strategy was found.
- Static public resources are cached by Vercel.

The current strategy favors confidentiality/freshness over read performance, but large client bundles and repeated auth checks add latency.

## File uploads

This checkout has no end-to-end upload pipeline and no version-controlled `storage.objects` policies. Clinician verification stores caller-supplied `document_urls` (`app/api/clinician/verification/route.ts:56-71`). Production storage configuration could not be certified from source. License/certificate uploads must not be considered production-ready.

## Notifications

Two systems exist:

- `notifications`, consumed by `/api/notifications` and `components/notification-bell.tsx`;
- `notification_events`, written by consent workflows.

Consent events are not surfaced by the bell. Some generated links point to `/clinician/patients`, while the actual page is `/patients`.

## Payments

No payment application code or local migrations exist in this checkout. Live Supabase contains `stripe_products`, `stripe_prices`, `payments`, `package_purchases`, `promo_codes`, configuration, and webhook-event tables from later migrations. Production source is therefore materially different and payment behavior cannot be certified from this branch.

For real payments, certification still requires webhook signature verification, idempotency, amount/currency authority, refund/dispute handling, entitlements, audit records, and Stripe test-mode E2E evidence.

## Assessment engine

Web flow:

1. definitions/items load;
2. one-question UI stores local progress;
3. handler validates answers and scores;
4. `submit_assessment_atomic` writes submission/responses transactionally;
5. high-risk results create admin notifications;
6. packages aggregate constituent scales and optionally call Gemini.

The mobile app writes assessment rows directly (`mobile/app/(app)/assessments/[id].tsx:115-131`), bypassing web validation, rate limits, atomic RPC usage, and high-risk notification behavior.

The guest route writes `patient_id: null` (`app/api/submit-assessment-guest/route.ts:293-307`), but the live column is NOT NULL. The guest workflow is therefore incompatible with the deployed schema.

## Workflow summaries

### Patient

Signup → email flow → onboarding → dashboard → assessments → results/history → mood/journal/insights → clinician connection → messages/reports. Packages are feature-flagged. Payments cannot be assessed from this checkout.

### Clinician

Signup → verification record → certificate/document URL submission → admin approval → connect via code/invite → patient list → assignments/messages/notes/reports. The dual relationship model breaks continuity between connection and clinical tools.

### Admin

Supabase login + PIN/HMAC → `/x/control` → overview, analytics/research, users, assessments, packages, results/risk, platform settings, announcements, audit. Authorization implementation is inconsistent on two API families.

### Research

There is no participant/researcher workflow. Admin research analytics aggregate up to 5,000 submissions in application memory (`app/api/admin/research/route.ts:89-106`). This is an administrative analytics feature, not a governed research platform with protocol, cohort, consent-purpose, or export controls.

## Architectural strengths

- Clear App Router domain separation.
- Service-role key remains server-only.
- Strong baseline headers and nonce CSP.
- Atomic assessment RPC and atomic rate limiter.
- Audit log, high-risk notification, consent ledger, and governance concepts exist.
- Bilingual/RTL foundation is centralized.
- Admin console has a sound additional-factor design when consistently used.

## Architectural blockers

1. Production source/database drift prevents reproducible deployment and recovery.
2. Role assignment trusts user-editable signup metadata.
3. RLS grants broad cross-patient clinician access.
4. Legacy assignment and granular consent systems conflict.
5. Guest assessment and live NOT NULL schema conflict.
6. Payment and upload implementations cannot be certified from this checkout.

