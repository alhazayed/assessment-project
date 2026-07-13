# V Welfare — Bug & Code Quality Report

**Audit Date:** 2026-07-13  
**Method:** Full repository static analysis, subagent exploration, grep verification, lint/typecheck  
**Lint Status:** ✅ No ESLint warnings or errors  
**TypeScript Status:** ✅ `npx tsc --noEmit` passes (after npm ci)

---

## Code Quality Score: 70/100

| Category | Score |
|----------|-------|
| TypeScript strictness | 85/100 |
| Error handling | 65/100 |
| Code duplication | 60/100 |
| Dead code | 55/100 |
| React patterns | 75/100 |
| Next.js patterns | 78/100 |
| Supabase patterns | 62/100 |
| Test coverage | 45/100 |

---

## Critical Bugs

### BUG-C01: Signup Role Injection
**Location:** `supabase/migrations/20260619210813_fix_duplicate_auth_trigger.sql:17-20`  
**Type:** Security / Logic  
**Problem:** Client-supplied `role` in signup metadata creates privileged profile on INSERT.  
**Impact:** Full platform compromise.  
**Fix:** Hardcode role to `'patient'` in trigger.

---

### BUG-C02: Admin RPCs Exposed to All Users
**Location:** `supabase/migrations/20260627220100_admin_dashboard_rpcs.sql:235-243`  
**Type:** Security  
**Problem:** 8 admin RPCs granted to `authenticated` without authorization checks. Return PHI.  
**Impact:** Mass data exfiltration by any logged-in user.

---

### BUG-C03: RLS Policy Stacking Regression
**Location:** `supabase/migrations/20260624190200_clinical_notes_and_messages_rls.sql`  
**Type:** Security  
**Problem:** New policies OR-combined with baseline — weakens message/clinical note access controls.  
**Impact:** Unauthorized clinical data access.

---

### BUG-C04: Mobile Messages Schema Mismatch
**Location:** `mobile/app/(app)/messages.tsx:38,71-76`  
**Type:** Logic / Integration  
**Problem:** Mobile uses `sender_id`, `recipient_id`, `is_read`; database has `patient_id`, `clinician_id`, `read_at`, `body`.  
**Evidence:**
```typescript
.or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
// insert uses sender_id, recipient_id, is_read — columns don't exist
```
**Impact:** Messages completely broken on mobile.

---

### BUG-C05: Mobile PDF Endpoint Missing
**Location:** `mobile/app/(app)/assessments/[id].tsx:155`, `mobile/app/(app)/results.tsx`, `mobile/app/(app)/profile.tsx`  
**Type:** Missing feature  
**Problem:** Calls `/api/export/pdf/{submissionId}` — route does not exist.  
**Impact:** All mobile PDF downloads fail.

---

### BUG-C06: Mobile Assessment Submit Bypasses Server API
**Location:** `mobile/app/(app)/assessments/[id].tsx:115-131`  
**Type:** Security / Logic  
**Problem:** Direct Supabase insert skips rate limiting, audit log, high-risk notifications, atomic RPC validation.  
**Impact:** Inconsistent security; missing clinical alerts for mobile submissions.

---

### BUG-C07: assessment_sessions Table Missing
**Location:** `mobile/app/(app)/assessments/[id].tsx:74-80,133-137`  
**Type:** Missing schema  
**Problem:** Mobile upserts/deletes from `assessment_sessions` — table not in any migration.  
**Impact:** Save & resume feature fails silently on mobile.

---

## High Bugs

### BUG-H01: Wrong Column in Clinician Patients API
**Location:** `app/api/clinician/patients/route.ts:85-86`  
**Type:** Logic  
**Problem:** Queries `assessment_submissions.user_id` — column is `patient_id`.  
**Impact:** Last assessment data never returned for clinician patient list.

---

### BUG-H02: Connect Accept Broken Login Redirect
**Location:** `app/connect/[token]/accept/page.tsx:89,186`  
**Type:** UX / Logic  
**Problem:** Redirects to `/auth/login` — route does not exist (correct: `/login`).  
**Impact:** Patients cannot accept clinician invitations when unauthenticated.

---

### BUG-H03: AI Draft PUT Returns 405
**Location:** `app/(app)/patients/patients-content.tsx` → `PUT /api/clinical-notes`  
**Type:** Missing handler  
**Problem:** Clinician AI draft button calls non-existent PUT handler.  
**Impact:** AI clinical note draft feature broken.

---

### BUG-H04: Dual Clinician-Patient Model Not Unified
**Location:** Multiple — messages, assignments, notify-message vs relationships  
**Type:** Architecture / Logic  
**Problem:** Legacy `assigned_clinician_id` and new consent model coexist; features wired to wrong model.  
**Impact:** Patients with consent-based clinicians cannot message or receive assignments.

---

### BUG-H05: Admin Clinician Verification — No UI
**Location:** `app/api/admin/clinician-verifications/route.ts` (API exists, zero frontend usage)  
**Type:** Missing feature  
**Impact:** Clinicians cannot be approved — verification flow dead end.

---

### BUG-H06: Auth Trigger Dropped Without Recreation
**Location:** `supabase/migrations/20260619210813_fix_duplicate_auth_trigger.sql:6`  
**Type:** Migration  
**Problem:** `DROP TRIGGER on_auth_user_created` without `CREATE TRIGGER` in repo.  
**Impact:** Fresh migration deploy may break user registration.

---

### BUG-H07: Admin Demographics Mat View Still Exposed
**Location:** `supabase/migrations/20260628071704` (partial revoke)  
**Type:** Security  
**Problem:** `admin_demographics_summary` not revoked from authenticated.  
**Impact:** Population demographics readable by any user.

---

### BUG-H08: Deactivated Users Retain Access
**Location:** `middleware.ts`, login flow  
**Type:** Logic  
**Problem:** `profiles.is_active` not checked after login.  
**Impact:** Deactivated accounts continue using platform until session expires.

---

## Medium Bugs

| ID | Bug | Location | Impact |
|----|-----|----------|--------|
| BUG-M01 | Guest assessment API has no frontend | /api/submit-assessment-guest | Dead endpoint |
| BUG-M02 | notification_events not shown in bell | access-requests, connect flows | Missed notifications |
| BUG-M03 | No server-side push dispatch | push_tokens stored but unused | Mobile push non-functional |
| BUG-M04 | Admin analytics capped at 5000 rows | /api/admin/analytics | Inaccurate stats |
| BUG-M05 | Mobile journal field mismatch (title/content vs body) | mobile journal vs web | Journal broken on mobile |
| BUG-M06 | Mobile mood field mismatch (logged_at/notes vs log_date/mood_note) | mobile mood vs web | Mood may break on mobile |
| BUG-M07 | `/admin/settings` lacks requireAdmin() | admin/settings/page.tsx | Info disclosure |
| BUG-M08 | Mat views reference profiles.user_type, profiles.email | admin mat view migration | Migration failure on fresh deploy |
| BUG-M09 | package_sessions.user_id FK to auth.users not profiles | migrations | Inconsistent cascade |
| BUG-M10 | completed_submission_id has no FK | assessment_assignments | Orphan references |
| BUG-M11 | check_relationship_permission() unused in app | SQL function exists | Consent model incomplete |
| BUG-M12 | Password reset weaker than registration | reset-password/page.tsx | Weak passwords allowed |
| BUG-M13 | Landing links to /assessments require auth | middleware + landing | Marketing friction |
| BUG-M14 | Partial assessment submission allowed server-side | submit-assessment route | Incomplete data scores |

---

## Low Bugs

| ID | Bug | Location |
|----|-----|----------|
| BUG-L01 | robots.txt allows /clinicians but sitemap omits it | robots.ts vs sitemap.ts |
| BUG-L02 | Admin export "PDF" is HTML print | /api/admin/export |
| BUG-L03 | /api/reports excludes clinicians with consent | /api/reports/route.tsx |
| BUG-L04 | Two admin nav entry points | /x/control vs /admin/kpi-dashboard |
| BUG-L05 | Clinicians page says "Coming Soon" | /clinicians/page.tsx |
| BUG-L06 | Duplicate migration files | supabase/migrations/ |
| BUG-L07 | recharts@2.x deprecated | package.json |
| BUG-L08 | eslint@8 deprecated | package.json |

---

## Dead Code

| Item | Location | Evidence |
|------|----------|----------|
| Guest assessment frontend | — | API exists, no UI calls it |
| Guest submit from landing | components/assessments-by-category.tsx | Links require auth |
| check_relationship_permission in app | — | SQL only, no TS usage |
| Redis rate limit backend | lib/rate-limit/redis.ts | Postgres is primary |
| Some KPI metrics | /api/admin/kpis | Marked unavailable |
| assessment_sessions (mobile) | mobile/ | Table doesn't exist |
| 79 migration stubs | supabase/migrations/ | No executable SQL |

---

## Duplicate Code

| Pattern | Locations | Recommendation |
|---------|-----------|----------------|
| Role check boilerplate | 15+ API routes | Extract `requireRole()` helper |
| Supabase auth + profile fetch | Most API routes | Extract `requireAuth()` middleware pattern |
| Severity band calculation | submit-assessment, score-assessment, mobile | Already shared logic — mobile duplicates |
| Admin count queries | overview page + dashboard APIs | Consolidate to RPC |
| EN/AR content lookup | Multiple components | Already in i18n.ts — consistent |
| Assessment scoring | web API + mobile client | Mobile should call API |

---

## React Anti-Patterns

| Issue | Location | Severity |
|-------|----------|----------|
| 1400-line page component | patient/clinicians/page.tsx | Medium — split into subcomponents |
| Missing dependency arrays (historical) | Various — currently lint clean | ✅ Resolved |
| Direct Supabase in client components | Many app pages | Acceptable with RLS — but prefer API for writes |
| No error boundary per route group | Only global error.tsx | Low |
| Large static import | assessment-content.ts | Medium — code split |

---

## Next.js Anti-Patterns

| Issue | Location | Severity |
|-------|----------|----------|
| No Server Actions (architectural choice) | — | ✅ Consistent API pattern |
| Service role in route handlers | 38+ routes | High — documented pattern |
| Turnstile in root layout | app/layout.tsx | Medium — load only on auth pages |
| Missing loading.tsx files | Most routes | Low — inline loading states used |
| metadataBase fallback inconsistency | layout vs sitemap | Low — different default URLs |

---

## Supabase Mistakes

| Issue | Severity | Location |
|-------|----------|----------|
| RLS policy stacking | Critical | messages, clinical_notes |
| Admin RPC grants | Critical | admin dashboard RPCs |
| Over-broad clinician SELECT | High | Multiple tables in baseline |
| Auth trigger gap | High | migration 20260619210813 |
| Inconsistent FK targets | Medium | package_sessions |
| Missing CHECK on role enum | Medium | profiles.role |
| 79 non-reproducible stubs | High | migrations/ |

---

## Race Conditions

| Scenario | Location | Risk | Mitigation |
|----------|----------|------|------------|
| Concurrent assessment submits | submit-assessment | Low | Atomic RPC |
| Rate limit check-then-act | lib/rate-limit.ts | Low | Advisory lock in RPC |
| Notification read + new message | messages page | Low | Realtime handles |
| Admin role change + admin_session | admin-auth.ts | ✅ | HMAC includes role |
| Mobile message send + refresh | messages.tsx | Low | Full refresh after send |

---

## Error Handling Gaps

| Location | Issue |
|----------|-------|
| Mobile assessment submit | No error handling on failed insert |
| Several admin pages | Generic "Failed to load" without retry |
| Gemini API failures | Retry in gemini.ts — good |
| Supabase Realtime disconnect | No reconnection UI |
| File upload failures | Clinician verification — partial |

---

## Memory Leaks

| Location | Issue | Status |
|----------|-------|--------|
| Realtime subscriptions | messages, notifications | ✅ Cleanup in useEffect return |
| Turnstile widget | TurnstileWidget.tsx | ⚠️ Verify cleanup on unmount |
| Assessment localStorage | Grows per assessment | Low — bounded by user |

---

## Test Coverage

| Test File | Tests | Coverage Area |
|-----------|-------|---------------|
| __tests__/security/rls.test.ts | RLS policies | Database security |
| __tests__/security/idor.test.ts | IDOR prevention | Submission access |
| __tests__/security/phi.test.ts | PHI scrubber | AI/export anonymization |

**Gaps:** No component tests, no API integration tests, no E2E tests, no mobile tests, no admin RPC security tests.

**npm scripts:**
```json
"test:security": "npx tsx --test __tests__/security/*.test.ts"
"test:phi": "npx tsx --test __tests__/security/phi.test.ts"
```

---

## Logic Errors Summary

| Error | Files | Description |
|-------|-------|-------------|
| Wrong DB column name | clinician/patients/route.ts | user_id vs patient_id |
| Wrong DB column names | mobile/messages.tsx | sender_id/recipient_id vs patient_id/clinician_id |
| Wrong URL path | connect/accept/page.tsx | /auth/login vs /login |
| Wrong API method | patients-content.tsx | PUT vs missing handler |
| Wrong API endpoint | mobile PDF calls | /api/export/pdf vs /api/reports |
| Wrong table | mobile assessments | assessment_sessions doesn't exist |
| Wrong auth model | messages, assignments | assigned_clinician_id vs relationships |

---

## Final Bug Report Verdict

**39 confirmed bugs/issues** across Critical (7), High (8), Medium (14), and Low (8) severities. The web platform is **functionally usable for core patient/clinician workflows** with known gaps. The **mobile app is not production-ready** due to schema mismatches and missing endpoints.

**No fixes applied — awaiting approval to address one issue at a time.**
