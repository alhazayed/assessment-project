# V Welfare — Security Audit Report

**Audit Date:** 2026-07-13  
**Standards:** OWASP Top 10 (2021) · OWASP ASVS Level 2 (healthcare target) · HIPAA-inspired principles · GDPR  
**Method:** Static code review, migration analysis, middleware/header inspection, test file review  
**Verdict:** ❌ **DO NOT GO LIVE** until Critical and High findings are remediated

---

## Security Score: 58/100

| Severity | Count |
|----------|-------|
| Critical | 5 |
| High | 12 |
| Medium | 14 |
| Low | 8 |

---

## OWASP Top 10 Mapping

| OWASP Category | Status | Key Findings |
|----------------|--------|--------------|
| A01 Broken Access Control | ❌ FAIL | Role injection on signup; admin RPCs exposed; RLS policy stacking; mobile bypass |
| A02 Cryptographic Failures | ⚠️ PARTIAL | HSTS enabled; admin PIN is plaintext compare; sessions use Supabase defaults |
| A03 Injection | ✅ PASS | Parameterized Supabase queries; response validation on assessments |
| A04 Insecure Design | ⚠️ PARTIAL | Dual auth models; optional CAPTCHA bypass; service-role pattern |
| A05 Security Misconfiguration | ❌ FAIL | Admin mat views partially exposed; migration stubs; CVEs in Next.js |
| A06 Vulnerable Components | ❌ FAIL | next@14.2.35 — 4 HIGH CVEs; eslint@8 deprecated |
| A07 Auth Failures | ⚠️ PARTIAL | Rate limits bypassable; deactivated accounts not blocked |
| A08 Data Integrity Failures | ⚠️ PARTIAL | Audit log self-insert allowed; no CSRF tokens on state-changing APIs |
| A09 Logging Failures | ⚠️ PARTIAL | Audit log exists; PII in some audit entries; no centralized SIEM |
| A10 SSRF | ✅ PASS | No user-controlled URL fetching identified |

---

## Critical Findings

### SEC-C01: Privilege Escalation via Signup Metadata

**Location:** `supabase/migrations/20260619210813_fix_duplicate_auth_trigger.sql` lines 17–20

**Problem:** `handle_new_user()` sets `profiles.role` from `auth.users.raw_user_meta_data->>'role'` on INSERT. The `prevent_role_self_escalation` trigger only blocks UPDATE, not INSERT.

**Evidence:**
```sql
v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
INSERT INTO public.profiles (id, role, full_name_en)
VALUES (NEW.id, v_role, ...)
```

**Attack:** Modified client calls `supabase.auth.signUp({ options: { data: { role: 'superadmin' } } })`.

**Risk:** Full platform compromise — admin panel access after PIN guess or insider knowledge.

**Fix:** Hardcode `v_role := 'patient'` in trigger; strip role from client-writable metadata.

**Effort:** 1 hour

---

### SEC-C02: Admin RPCs Callable by Any Authenticated User

**Location:** `supabase/migrations/20260627220100_admin_dashboard_rpcs.sql` lines 235–243

**Problem:** Eight admin dashboard RPCs granted to `authenticated` role with **no in-function authorization check**. Functions return patient names, emails, high-risk data, demographics.

**Affected functions:**
- `get_high_risk_patients()` — returns `patient_name`, `patient_email`
- `get_demographics_breakdown()` — population demographics
- `get_patient_risk_profile(UUID)` — any patient ID accepted
- `get_admin_dashboard_stats()`, `get_top_assessments()`, etc.

**Attack:** Any logged-in patient calls RPC via Supabase client with anon key + JWT.

**Risk:** Mass PHI exfiltration; horizontal privilege escalation.

**Fix:** Add `IF NOT is_admin() THEN RAISE EXCEPTION` in each function OR `REVOKE EXECUTE FROM authenticated; GRANT TO service_role`.

**Effort:** 4 hours

---

### SEC-C03: RLS Policy Stacking Weakens Messages and Clinical Notes

**Location:** `supabase/migrations/20260624190200_clinical_notes_and_messages_rls.sql`

**Problem:** New policies added without dropping baseline policies. PostgreSQL OR-combines permissive policies.

**Evidence — messages INSERT:**
```sql
-- New policy allows insert if clinician_id = auth.uid() WITHOUT assignment check
CREATE POLICY "msg_participant_insert" ...
  WITH CHECK (patient_id = auth.uid() OR clinician_id = auth.uid());
```

Baseline `messages_insert` required assignment verification — now bypassed via OR.

**Risk:** Clinicians can insert messages for any patient; clinical notes writable without assignment.

**Fix:** DROP conflicting baseline policies; single consolidated policy set using `check_relationship_permission()`.

**Effort:** 6 hours

---

### SEC-C04: Admin Demographics Materialized View Exposed

**Location:** `supabase/migrations/20260627220000_admin_dashboard_materialized_views.sql`, partial fix in `20260628071704_revoke_admin_matview_api_access.sql`

**Problem:** Revoke migration omits `admin_demographics_summary`. Still has `GRANT SELECT TO authenticated`.

**Risk:** Population-level patient demographic data readable by any authenticated user via PostgREST.

**Fix:** `REVOKE ALL ON admin_demographics_summary FROM authenticated, anon;`

**Effort:** 1 hour

---

### SEC-C05: Mobile App Bypasses Server Security Layer

**Location:** `mobile/app/(app)/assessments/[id].tsx` lines 115–131, `mobile/app/(app)/messages.tsx`

**Problem:** Mobile writes directly to Supabase, bypassing:
- Rate limiting
- Audit logging
- High-risk admin notifications
- Atomic submission RPC
- Server-side response validation

**Risk:** Inconsistent security posture; schema mismatch causes data corruption; no audit trail for mobile submissions.

**Fix:** Route all mobile mutations through web API endpoints.

**Effort:** 16 hours

---

## High Findings

### SEC-H01: Auth Rate Limits Bypassable

**Location:** `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`

**Problem:** Rate limit pre-check APIs (`/api/auth/check-login-limit`) are optional. Actual auth calls `supabase.auth.signInWithPassword` directly — attackers skip pre-check.

**Fix:** Supabase Auth hook, Edge Function, or server-side auth proxy.

**Effort:** 8 hours

---

### SEC-H02: CAPTCHA Fail-Open When Turnstile Unavailable

**Location:** `app/(auth)/login/page.tsx` (captchaUnavailable flag), `app/(auth)/register/page.tsx`

**Problem:** If Turnstile script fails to load, login/register proceeds without CAPTCHA.

**Fix:** Fail closed in production when `TURNSTILE_SECRET_KEY` is configured.

**Effort:** 2 hours

---

### SEC-H03: Widespread Service-Role Usage (38+ Routes)

**Location:** All routes importing `createAdminClient()` from `lib/supabase/admin.ts`

**Problem:** Security depends entirely on application-layer auth checks before service-role queries. One missed check = full database access.

**Fix:** Prefer user-scoped client where RLS applies; audit every service-role route; add automated test for auth on each.

**Effort:** 24 hours (audit + refactor priority routes)

---

### SEC-H04: Over-Broad Clinician RLS on PHI Tables

**Location:** `supabase/migrations/20260619120000_schema_baseline.sql`

**Problem:** Policies allow **any authenticated clinician** to SELECT all rows on:
- `patient_profiles`
- `ai_insights`
- `chat_sessions`
- `medications`, `medication_alerts`
- `personality_results`, `pdf_reports`, `gratitude_entries`

**Risk:** Minimum-necessary access violation for HIPAA-style compliance.

**Fix:** Scope to `assigned_clinician_id` OR `check_relationship_permission()`.

**Effort:** 12 hours

---

### SEC-H05: Dual Authorization Models (Legacy vs Consent)

**Location:** Messaging (`app/(app)/messages/page.tsx`), assignments (`app/api/assignments/route.ts`), notify-message

**Problem:** Legacy `assigned_clinician_id` vs new `clinician_patient_relationships`. SQL helper `check_relationship_permission()` defined but **unused in TypeScript**.

**Risk:** Inconsistent access; consent grants may not enable expected features.

**Effort:** 20 hours

---

### SEC-H06: Next.js 14.2.35 — Known CVEs

**Location:** `package.json`

**Problem:** npm audit reports 4 HIGH severity CVEs (DoS, request smuggling, cache poisoning, middleware bypass).

**Fix:** Upgrade to latest patched 14.2.x or 15.x with full regression.

**Effort:** 8 hours

---

### SEC-H07: Deactivated Accounts Not Blocked

**Location:** `middleware.ts`, login flow

**Problem:** `profiles.is_active` loaded in layout but not checked in middleware or post-login. Deactivated users retain session.

**Fix:** Check `is_active` in middleware or `(app)/layout.tsx` → force logout.

**Effort:** 2 hours

---

### SEC-H08: Admin PIN — Shared Static Secret

**Location:** `app/api/admin/login/route.ts` line 24

**Problem:** Single `ADMIN_PIN` env var shared by all admins. Plain string comparison (not timing-safe).

**Fix:** Per-admin MFA or TOTP; use `crypto.timingSafeEqual`.

**Effort:** 16 hours

---

### SEC-H09: `/x/control` Middleware Does Not Verify Admin Role

**Location:** `middleware.ts` lines 47–52

**Problem:** Any authenticated user can reach admin URLs before `requireAdmin()` redirect.

**Fix:** Optional middleware check for admin_session cookie presence.

**Effort:** 2 hours

---

### SEC-H10: generate_patient_access_code() — Unrevoked SECURITY DEFINER

**Location:** Consent system migration

**Problem:** SECURITY DEFINER function may be callable by authenticated users unless explicitly revoked.

**Fix:** `REVOKE EXECUTE FROM PUBLIC, authenticated; GRANT TO service_role`.

**Effort:** 1 hour

---

### SEC-H11: get_patient_risk_profile(UUID) — IDOR at Database Layer

**Location:** `supabase/migrations/20260627220100_admin_dashboard_rpcs.sql` lines 204–233

**Problem:** Accepts arbitrary `p_patient_id` with no caller authorization.

**Effort:** Included in SEC-C02 fix

---

### SEC-H12: AI Draft PUT Handler Missing (405)

**Location:** `app/(app)/patients/patients-content.tsx` → `PUT /api/clinical-notes`

**Problem:** Clinician AI draft feature calls non-existent PUT handler — may fall back to error exposing stack info.

**Fix:** Implement PUT handler per REMEDIATION_BACKLOG.md P1-1.

**Effort:** 4 hours

---

## Medium Findings

| ID | Finding | Location | Effort |
|----|---------|----------|--------|
| SEC-M01 | Password reset weaker than registration (8 chars only) | `reset-password/page.tsx` | 1h |
| SEC-M02 | PII (email) stored in audit log details | `app/api/user/delete-request/route.ts` | 2h |
| SEC-M03 | Mobile uses getSession() not getUser() | `mobile/lib/useAuth.ts` | 2h |
| SEC-M04 | No CSRF tokens on POST APIs (mitigated by SameSite cookies) | All API routes | 8h |
| SEC-M05 | CSP style-src allows unsafe-inline | `middleware.ts` line 103 | Documented tradeoff |
| SEC-M06 | Guest assessment endpoints public by design | `/api/score-assessment`, guest submit | Monitor |
| SEC-M07 | Health endpoint exposes Gemini config state | `app/api/health/route.ts` | 1h |
| SEC-M08 | Audit log allows authenticated self-insert | RLS policy | 4h |
| SEC-M09 | profiles.role unconstrained text (no CHECK) | Schema | 2h |
| SEC-M10 | Assessment definitions public SELECT | Intentional for instruments | Accept |
| SEC-M11 | Connect accept redirects to /auth/login (404) | `connect/[token]/accept/page.tsx:89` | 0.5h |
| SEC-M12 | No Content-Security-Policy report-uri | middleware.ts | 2h |
| SEC-M13 | Service role key in server env only — verify no client leak | Env audit | 1h |
| SEC-M14 | Split notification tables may leak workflow state | notification_events | 4h |

---

## Low Findings

| ID | Finding | Location |
|----|---------|----------|
| SEC-L01 | Turnstile script loaded without nonce (host allowlisted) | `app/layout.tsx:74` |
| SEC-L02 | No Subresource Integrity on Turnstile CDN script | `app/layout.tsx` |
| SEC-L03 | Admin export "PDF" is HTML print view | `app/api/admin/export/route.ts` |
| SEC-L04 | localStorage stores assessment progress (XSS vector if XSS exists) | assessment-content.tsx |
| SEC-L05 | No explicit session timeout configuration | Supabase defaults |
| SEC-L06 | Error pages may expose route structure | error.tsx |
| SEC-L07 | robots.txt allows /clinicians but sitemap omits it | robots.ts vs sitemap.ts |
| SEC-L08 | recharts@2.x deprecated — supply chain note | package.json |

---

## Authentication Security Detail

### Strengths
- Supabase SSR cookie pattern (httpOnly, secure in production)
- `getUser()` preferred over `getSession()` on server
- HMAC admin session bound to role (invalidates on role revocation)
- Open redirect protection in auth confirm and login
- Forgot-password anti-enumeration (always 200)

### Weaknesses
- No MFA for any role
- No account lockout beyond rate limits
- No device/session management UI
- Password policy inconsistent between register and reset

---

## Authorization Security Detail

### Strengths
- `requireAdmin()` consistently applied on admin APIs
- Clinical notes GET/POST assignment checks (POST was fixed)
- Atomic submission RPC enforces `auth.uid() = patient_id`
- Relationship permissions PATCH restricted to patients

### Weaknesses
- `/admin/settings` page lacks `requireAdmin()` (informational links only)
- RLS and app-layer checks diverge on multiple tables
- Clinician verification approval has API but no UI enforcement path

---

## Session & Cookie Security

| Cookie | Attributes | Purpose |
|--------|------------|---------|
| Supabase auth cookies | httpOnly, secure (prod), SameSite=Lax | JWT session |
| admin_session | httpOnly, secure, SameSite=Lax, 8h maxAge | HMAC admin proof |
| lang | Standard cookie | i18n preference |

**Missing:** Explicit `__Host-` prefix on admin_session; no rotation on privilege change beyond role binding.

---

## XSS Analysis

| Vector | Mitigation | Status |
|--------|------------|--------|
| Stored XSS in messages/journal | React auto-escaping; no dangerouslySetInnerHTML in user content | ✅ Low risk |
| CSP script-src nonce | middleware.ts nonce on inline scripts | ✅ Good |
| CSP style unsafe-inline | Required for React inline styles | ⚠️ Accepted |
| PDF generation | Server-side @react-pdf/renderer | ✅ Low risk |
| AI-generated content | Rendered as text in React | ✅ Low risk |

---

## CSRF Analysis

- Supabase auth cookies use SameSite=Lax — mitigates cross-site POST for most cases
- Admin session cookie SameSite=Lax
- No explicit CSRF tokens on API routes
- **Risk:** Medium for state-changing APIs if SameSite bypass found

---

## SSRF Analysis

- Gemini API calls use fixed endpoint (`lib/gemini.ts`)
- No user-controlled URL fetching in server routes identified
- PDF/report generation uses internal data only
- **Status:** ✅ No SSRF vectors found

---

## SQL Injection Analysis

- All database access via Supabase client (parameterized)
- RPC functions use typed parameters
- No raw SQL string concatenation in application code
- **Status:** ✅ No SQL injection vectors found

---

## Secrets & Environment Variables

| Variable | Exposure | Risk |
|----------|----------|------|
| NEXT_PUBLIC_SUPABASE_URL | Client | ✅ Expected |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Client | ✅ Expected (RLS protects) |
| SUPABASE_SERVICE_ROLE_KEY | Server only | ⚠️ Verify never in client bundle |
| ADMIN_SESSION_SECRET | Server only | ✅ |
| ADMIN_PIN | Server only | ⚠️ Shared secret |
| GEMINI_API_KEY | Server only | ✅ |
| TURNSTILE_SECRET_KEY | Server only | ✅ |

**Action:** Run production bundle analysis to confirm service role key not leaked.

---

## PII & Sensitive Logging

| Location | Issue |
|----------|-------|
| `app/api/user/delete-request/route.ts` | Email in audit details |
| `console.error` in API routes | May log Supabase error objects with query details |
| Admin mat views | Aggregate PHI in materialized views |

**Recommendation:** Structured logging with PHI redaction; never log request bodies in production.

---

## Rate Limiting Coverage

| Endpoint | Limited | Bypass Risk |
|----------|---------|-------------|
| Login pre-check | 5/15min | Direct Supabase auth |
| Signup pre-check | 3/hour | Direct Supabase auth |
| Forgot password | 3/15min | ✅ Server-side |
| Admin login | 5/15min | ✅ Server-side |
| Assessment submit | 20/hour/user | ✅ Server-side |
| Guest submit | 3/min + 5/day/IP | ✅ Server-side |
| AI chat | 20/min + 100/day | ✅ Server-side |
| Clinical notes | Per REMEDIATION_BACKLOG | ✅ |
| Admin export | 10/hour | ✅ |

---

## Security Test Coverage

| Test File | Coverage |
|-----------|----------|
| `__tests__/security/rls.test.ts` | RLS policy verification |
| `__tests__/security/idor.test.ts` | IDOR on submissions |
| `__tests__/security/phi.test.ts` | PHI scrubber rules |

**Gap:** No automated tests for admin RPC exposure, signup role injection, or rate limit bypass.

---

## OWASP ASVS Gap Summary (Selected)

| ASVS Section | Status | Gap |
|--------------|--------|-----|
| V2 Authentication | Partial | No MFA, bypassable rate limits |
| V3 Session Management | Partial | No explicit timeout, no session list |
| V4 Access Control | Fail | Role injection, RPC exposure, RLS gaps |
| V5 Validation | Good | Assessment response validation |
| V8 Data Protection | Partial | Broad clinician read policies |
| V9 Communication | Good | HSTS, CSP, secure cookies |
| V13 API Security | Partial | No CSRF tokens, service-role pattern |
| V14 Config | Fail | CVEs, migration sync issues |

---

## Final Security Verdict

**❌ DO NOT GO LIVE**

Five Critical findings represent immediate exploitation paths for privilege escalation and PHI exfiltration. The web application has strong foundational security (CSP, HMAC admin, rate limiting, PHI scrubbing), but database-layer exposure and signup role injection are **launch blockers** for a healthcare platform handling real patient data.

**Minimum bar for ⚠️ GO LIVE WITH CONDITIONS:**
1. Fix SEC-C01 through SEC-C04
2. Upgrade Next.js (SEC-H06)
3. Scope clinician RLS (SEC-H04)
4. Block deactivated accounts (SEC-H07)

**No fixes applied — awaiting approval per audit instructions.**
