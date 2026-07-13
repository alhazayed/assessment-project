# V Welfare — Bug & Code‑Quality Report

**Audit date:** 2026-07-13
**Method:** Static code review of web + mobile + SQL. Runtime reproduction was not possible (no DB/build env with credentials). Items marked *(unverified at runtime)* are inferred from code and should be confirmed.

This report covers functional bugs, logic errors, race conditions, dead code, edge cases, and workflow defects. Security‑specific issues are in `security-report.md`; schema issues in `database-report.md`.

Severity key: **Critical / High / Medium / Low**.

---

## 1. Critical Bugs

### BUG‑C1: Guest assessment submission may fail (schema conflict)
`submit-assessment-guest/route.ts:296` inserts `patient_id: null`, but `20260627220200_assessment_submissions_constraints.sql:16-17` sets `patient_id NOT NULL`. If applied to prod, **every guest assessment errors**. *(Behavior depends on whether that migration is live — see `KNOWN_ISSUES.md` migration‑sync blocker.)* Also `database-report.md` DB‑C1 / `security-report.md` SEC‑C3.

### BUG‑C2: New‑user profile creation may not fire (missing trigger)
`20260619210813_fix_duplicate_auth_trigger.sql` drops `on_auth_user_created` and never recreates a trigger; profile creation depends on an out‑of‑repo trigger. If absent, **signups create no `profiles` row** → app unusable for new users. `database-report.md` DB‑C2.

### BUG‑C3 (mobile): Client‑side scoring inserted directly to DB
`mobile/app/(app)/assessments/[id].tsx:115-131` computes and inserts `total_score`/`severity_band`/`high_risk_flag` on device. Tamperable clinical data; also diverges from server scoring. Route mobile through `/api/submit-assessment`.

### BUG‑C4 (mobile): Auth tokens in unencrypted AsyncStorage
`mobile/lib/supabase.ts:7-14` uses `AsyncStorage` (SecureStore is installed but unused). Token theft → full PHI access.

---

## 2. High Bugs

### BUG‑H1: `clinician/patients` queries a non‑existent column
`app/api/clinician/patients/route.ts:85-86` filters `assessment_submissions.user_id` (the column is `patient_id`) → last‑assessment enrichment is **always empty**. *Fix:* use `patient_id`.

### BUG‑H2: Admin materialized views / RPCs error at runtime
Views reference `user_type`/`full_name`/`email` that don't exist (`20260627220000_...:52-88`); the risk route documents this and hand‑rolls base‑table queries (`admin/dashboard/risk/route.ts:10-13`). Any code still calling the views/RPCs 500s. `database-report.md` DB‑C4.

### BUG‑H3: Consent bypass via stale legacy field
`clinical-notes`, `notify-message`, `assignments` authorize on `assigned_clinician_id` not the consent graph — a clinician can act on a patient who revoked consent. `security-report.md` SEC‑H7.

### BUG‑H4: Erasure request does nothing
`user/delete-request/route.ts:17-25` writes an audit row and returns "scheduled within 30 days" but there is **no queue, admin action, or deletion job**. GDPR non‑compliance and user‑trust bug. `security-report.md` SEC‑H1.

### BUG‑H5 (mobile): Password‑reset deep link broken
`mobile/app/reset-password.tsx:25-28` only checks an existing session; no `exchangeCodeForSession`/URL handling, and `detectSessionInUrl:false`. Reset links land on "invalid/expired."

### BUG‑H6 (mobile): Assessment resume + category filter broken
Resume never loads `assessment_sessions.answers_snapshot` (only saves); category filter UI doesn't apply `activeCategory` (`mobile/app/(app)/assessments/index.tsx`); PDF button on the assessment screen only shows an alert.

### BUG‑H7 (mobile): Message sent to self when no clinician assigned
`mobile/app/(app)/messages.tsx:71-75` falls back to `recipient_id = userId` — creates self‑addressed PHI messages.

---

## 3. Medium Bugs

- **BUG‑M1: Guest audit inserts likely fail silently.** `audit_log.actor_id` is NOT NULL but guest inserts omit it (`submit-assessment-guest:331`); fire‑and‑forget hides the error. `database-report.md` DB‑M4.
- **BUG‑M2: `connect/[token]` accept is not atomic / not rate‑limited** — possible double‑accept race (`connect/[token]/route.ts:172-179`). `security-report.md` SEC‑M3.
- **BUG‑M3: `access-requests/[id]` approve lacks a `status='pending'` guard** — revoked/rejected relationships can be re‑approved (`:115-123`).
- **BUG‑M4: Mass assignment in `admin/packages` PATCH** (`:46-48`) — malformed payloads can overwrite unexpected columns.
- **BUG‑M5: `admin/kpis/[kpiId]/alert` checks `role==='admin'` only** — superadmins are locked out (`:25-27,109-111`).
- **BUG‑M6: Language preference doesn't apply** until save and never sets the `lang` cookie (`profile/page.tsx:194-198`) — UI stays in the old language. `ui-report.md` UI‑M3.
- **BUG‑M7 (mobile): Login/register leave `loading=true` on success** (`login.tsx:43-49`, `register.tsx:58-63`) — stuck spinner if navigation stalls.
- **BUG‑M8 (mobile): `fetchProfile` ignores errors** → silent null profile / role‑less UI (`mobile/lib/useAuth.ts:30-37`).
- **BUG‑M9 (mobile): Two competing locale systems** (`LocaleContext` vs `hooks.useLocale`) with separate state — language changes don't propagate consistently.
- **BUG‑M10: PHI scrubber not applied to AI chat / note drafts** — functional/compliance defect (`security-report.md` SEC‑H2).

---

## 4. Low / Dead Code / Cleanup

- **BUG‑L1: Two rate‑limit implementations** — `lib/rate-limit.ts` (Postgres, used) and `lib/rate-limit/redis.ts` (referenced in `.env.example` but not wired). Remove or document the unused path.
- **BUG‑L2: Duplicate/pointer migrations** (`assessment_submissions_constraints`, `package_results_fk_fix` ×3 each) clutter history. `database-report.md` DB‑L4.
- **BUG‑L3: `admin/login` DELETE is unauthenticated** (low impact — only clears the caller's cookie) (`:69-75`).
- **BUG‑L4: 500 responses leak `error.message`** in a few admin routes (`admin/kpis/history:47-49`).
- **BUG‑L5 (mobile): Non‑functional profile privacy link** (no `onPress`) (`mobile/app/(app)/profile.tsx:263-268`); US‑only emergency numbers (`emergency.tsx:13-18`); sign‑out doesn't unregister push token.
- **BUG‑L6: Inconsistent canonical host** across `robots.ts`/`sitemap.ts` vs `auth/confirm` (`security-report.md` SEC‑M5).
- **BUG‑L7: `.env` not git‑ignored** (`security-report.md` SEC‑M4).

---

## 5. Edge Cases & Error Handling (observations)

- Web APIs generally validate inputs and fail closed; several client screens (mobile especially) swallow Supabase errors with no user feedback (mood save, profile save, assessment load) → silent failures.
- No global error boundary in mobile root; web has only a root `error.tsx` (no segment boundaries) — `ui-report.md` UI‑H7.
- No offline handling on mobile (assessments/mood hang without network); AI has a static fallback only.
- Fire‑and‑forget audit/notification writes hide failures (acceptable for non‑critical, but pair with monitoring — `security-report.md` SEC‑H8).

---

## 6. Test Coverage

- Only three security test files exist (`__tests__/security/{idor,phi,rls}.test.ts`) run via Node's `--test` + `tsx`; **no unit/integration/e2e coverage of business logic** (scoring, consent, packages, admin). No `typecheck` script. No CI workflow found. *Recommendation:* add a `typecheck` script, expand tests around scoring/consent, and wire CI (lint + typecheck + tests + `npm audit`).
- **Verified tooling baseline (2026-07-13, this audit):** `npm run lint` → *"No ESLint warnings or errors"*; `npx tsc --noEmit` → *exit 0 (no type errors)*. The security tests were not executed here (they require Supabase env/DB). So the current codebase is lint‑ and type‑clean; the defects in this audit are logic/design/data‑layer issues, not compiler errors.

---

## 7. Prioritized Bug Fix Order

| Priority | Bugs |
|---|---|
| P0 | BUG‑C1, BUG‑C2, BUG‑C3, BUG‑C4, BUG‑H2, BUG‑H4 |
| P1 | BUG‑H1, BUG‑H3, BUG‑H5, BUG‑H6, BUG‑H7, BUG‑M1–M6, BUG‑M10 |
| P2 | BUG‑M7–M9, BUG‑L1–L7, test coverage |

See `implementation-roadmap.md` for the cross‑cutting sequence combining bugs, security, DB, UI, and accessibility.
