# V Welfare — Security Report

**Audit date:** 2026-07-13  
**Standards referenced:** OWASP Top 10 (2021), OWASP ASVS 4.0 (selected), GDPR principles, HIPAA-inspired privacy practices  
**Method:** Full source review of auth, middleware, API routes, RLS migrations, security utilities, and `__tests__/security/*`  
**Scope note:** No live penetration test against production; findings are code-evidence based.

---

## Executive Summary

Security hardening is real and substantial (CSP nonces, HSTS, rate-limit RPC, admin HMAC, Turnstile hooks, PHI scrubber unit tests, guest abuse controls). However, **healthcare-grade access control is incomplete**:

1. Admin PIN step-up is bypassable for PHI via RLS and several APIs.
2. Login/signup rate limits and CAPTCHA are client-advisory only.
3. Clinician authorization is split across two models; consent permissions are not enforced on PHI APIs.
4. AI routes send mental-health content to Gemini **without** calling `scrubPHI()`.
5. GDPR deletion is a log entry only.
6. Password-reset `redirectTo` is not allowlisted.

**Security Score: 52/100**

| Severity | Count |
|----------|-------|
| Critical | 5 |
| High | 9 |
| Medium | 12 |
| Low | 8 |

**Verdict contribution:** ❌ Launch blocker for clinician-connected / regulated use. Patient-only limited beta possible only with conditions listed in `implementation-roadmap.md`.

---

## 1. Authentication

### Strengths
- Supabase SSR cookie sessions with middleware `getUser()` refresh.
- Admin login: PIN + password + role + HMAC cookie (`HttpOnly`, `Secure`, `SameSite=lax`, 8h).
- Forgot-password anti-enumeration pattern.
- Register password hint (letters + numbers); login uses generic error message.
- Open-redirect protection on login `next` and auth confirm `safeNext()`.

### Weaknesses

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| SEC-C1 | Critical | Admin JWT alone grants PHI via RLS without PIN | Baseline RLS `get_my_role() = admin`; `/api/reports` role check without `requireAdmin()` |
| SEC-H1 | High | Login/signup CAPTCHA + rate limits bypassable | `signInWithPassword` / `signUp` called from browser after optional pre-checks |
| SEC-H2 | High | Shared static `ADMIN_PIN` for all admins | `.env.example`, `app/api/admin/login/route.ts` |
| SEC-H3 | High | `forgot-password` accepts arbitrary `redirectTo` | `app/api/auth/forgot-password/route.ts` |
| SEC-M1 | Medium | Deactivated users (`is_active=false`) not blocked | Layout loads flag; middleware never checks |
| SEC-M2 | Medium | `admin_session` HMAC is deterministic (no session id) | `lib/admin-auth.ts` `computeHmac(userId, role)` |
| SEC-L1 | Low | Reset password only `minLength=8` (weaker than register) | `app/(auth)/reset-password/page.tsx` |

---

## 2. Authorization / Access Control

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| SEC-C2 | Critical | Dual model: relationships vs `assigned_clinician_id` | Consent APIs never set `assigned_clinician_id`; messages/assignments/notes require it |
| SEC-C3 | Critical | Broad clinician SELECT on `patient_profiles` | Migration baseline policy `patient_prof_clinician` — any clinician |
| SEC-H4 | High | `/api/admin/clinician-verifications` skips HMAC | Custom `requireAdminUser()` role-only |
| SEC-H5 | High | KPI alert routes exclude `superadmin` / skip HMAC | `app/api/admin/kpis/[kpiId]/alert/route.ts` |
| SEC-H6 | High | Admin matview RPCs granted to `authenticated` without admin assert | `20260627220100_admin_dashboard_rpcs.sql` |
| SEC-M3 | Medium | `relationship_permissions` not enforced on clinical APIs | `check_relationship_permission` unused in app |
| SEC-M4 | Medium | Permission key schema drift (UI vs API) | `lib/permissions.ts` vs `access-requests/[id]` |
| SEC-M5 | Medium | Messages/notes RLS migration weakens assignment checks | `20260624190200_clinical_notes_and_messages_rls.sql` |

### IDOR / BOLA notes
- Reports: patient self or admin only — clinicians with consent cannot export (functional gap + inconsistent with permission keys).
- Clinical notes: gated by `assigned_clinician_id` (legacy), not consent.
- `__tests__/security/idor.test.ts` exists but requires live credentials.

---

## 3. Injection

| Class | Assessment |
|-------|------------|
| SQL Injection | Low risk — PostgREST/Supabase parameterized queries |
| XSS | Mitigated by CSP nonce on scripts; `style-src 'unsafe-inline'` remains; React escaping default |
| SSRF | Limited outbound (Turnstile, Gemini, Upstash); forgot-password `redirectTo` is open redirect, not SSRF |
| Command injection | Not observed |

---

## 4. Cryptography & Session Security

| Control | Status |
|---------|--------|
| HTTPS / HSTS | ✅ `next.config.js` 2-year preload |
| Cookie flags (admin) | ✅ HttpOnly Secure SameSite=lax |
| Service role exposure | ✅ Server-only (`createAdminClient`) |
| JWT validation | ✅ `getUser()` (not `getSession()` alone) in middleware |
| Admin session revocation | ⚠️ Deterministic HMAC; revoke role invalidates; no server session store |
| Encryption at rest | Relies on Supabase/Vercel platform defaults |

---

## 5. Rate Limiting

**Implementation:** Atomic RPC `check_and_record_rate_limit` via service role — sound design.  
**Fail mode:** Fail-closed on DB error (`lib/rate-limit.ts`) — secure but can DoS auth availability.  
**Redis:** `lib/rate-limit/redis.ts` unused despite `.env.example`.

| Endpoint class | Limit quality |
|----------------|---------------|
| Guest submit | Strong (burst + daily + circuit breaker) |
| AI endpoints | Good |
| Admin export | Good |
| Login/signup | Weak (client pre-check only) |
| Public score-assessment | IP only, no CAPTCHA |

---

## 6. Data Protection / PHI

| ID | Severity | Finding |
|----|----------|---------|
| SEC-C4 | Critical | GDPR delete does not delete (`/api/user/delete-request` audit-only) |
| SEC-H7 | High | AI chat / synthesis / clinical-notes AI draft skip `scrubPHI()` |
| SEC-H8 | High | Admin risk dashboard returns patient names |
| SEC-M6 | Medium | GDPR export incomplete (missing messages, packages, relationships, consents) |
| SEC-M7 | Medium | Guest demographics co-mingled in `assessment_submissions` |
| SEC-L2 | Low | `/api/health` reveals AI key configuration state |

`lib/security/anonymizePHI.ts` is well-tested but only used in `recommend-assessments`.

---

## 7. Secrets & Configuration

| Variable | Exposure | Verdict |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_*` | Client | Expected |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | ✅ |
| `ADMIN_PIN` / `ADMIN_SESSION_SECRET` | Server | ✅ present; shared PIN weak |
| `GEMINI_API_KEY` / `TURNSTILE_SECRET_KEY` | Server | ✅ |
| `.env.example` | Docs | Good placeholders |

No service role key found in client bundles via source patterns.

---

## 8. Security Headers / CSP

From `middleware.ts` + `next.config.js`:

- ✅ CSP with per-request script nonce
- ⚠️ `style-src 'unsafe-inline'` (documented React tradeoff)
- ✅ `frame-ancestors 'none'`, `X-Frame-Options: DENY`
- ✅ `X-Content-Type-Options: nosniff`
- ✅ Referrer-Policy, Permissions-Policy
- ✅ API `Cache-Control: no-store`

---

## 9. File Upload Security

Certificate upload not implemented. API accepts unvalidated `document_urls` — **High** if abused once storage is added without validation (MIME, size, path, signed URLs).

---

## 10. OWASP Top 10 Mapping

| # | Category | Status |
|---|----------|--------|
| A01 | Broken Access Control | ❌ Critical gaps (admin PIN bypass, clinician dual model, matview grants) |
| A02 | Cryptographic Failures | ⚠️ Shared PIN; platform TLS OK |
| A03 | Injection | ✅ Mostly OK |
| A04 | Insecure Design | ❌ Client-side auth gates; dual authZ models |
| A05 | Security Misconfiguration | ⚠️ Stub migrations; unused Redis; CSP style inline |
| A06 | Vulnerable Components | ⚠️ Next 14.2.35 — prior audits cite CVEs; upgrade branch exists remotely |
| A07 | Identification/Auth Failures | ❌ Bypassable rate limit/CAPTCHA; inactive users |
| A08 | Software/Data Integrity | ⚠️ Audit forge risk; guest/auth atomicity split |
| A09 | Security Logging Failures | ⚠️ Partial; some admin auth failures return 500 |
| A10 | SSRF | ✅ Low |

---

## 11. OWASP ASVS Highlights

| Area | Gap |
|------|-----|
| V2 Authentication | No server-side login with enforced CAPTCHA/RL |
| V3 Session | Admin session not uniquely bound / revocable |
| V4 Access Control | RLS and API disagree; permissions unused |
| V8 Data Protection | PHI to third-party AI unsanitized; delete incomplete |
| V14 Config | Migration stubs; secrets OK |

---

## 12. Security Test Coverage

| Test file | Coverage | Gap |
|-----------|----------|-----|
| `rls.test.ts` | Unauth → 401/403 samples | No admin PIN / RLS live asserts |
| `idor.test.ts` | Cross-user (needs env cookies) | Skips without credentials |
| `phi.test.ts` | Unit scrubber | Does not assert AI routes scrub |

---

## 13. Critical & High Findings (detail)

### SEC-C1 — Admin PIN bypass for PHI
Admin users who authenticate via normal `/login` obtain a Supabase JWT. RLS policies grant `admin`/`superadmin` broad SELECT. `/api/reports` allows PDF download with role check only. **PIN is UI theater for data access.**

**Fix:** Require step-up claim for all admin PHI paths; narrow RLS or force service-role-only admin reads after `requireAdmin()`.

### SEC-C2 — Dual clinician authorization
Consent creates relationships; care APIs require `assigned_clinician_id` (never written). Result: broken care path or future unsafe sync if naively filled without permission checks.

### SEC-C3 — Clinician can read all `patient_profiles`
Baseline policy allows any clinician role SELECT without relationship EXISTS.

### SEC-C4 — Account deletion non-functional
Returns “scheduled within 30 days” but only inserts `audit_log`. No job, no anonymization, no `auth.admin.deleteUser`.

### SEC-C5 — Admin analytics exposure (DB)
`GRANT EXECUTE ... TO authenticated` on admin dashboard RPCs without `is_admin()` guard; matview SELECT grants incompletely revoked (`admin_demographics_summary` omitted).

*(C5 also in database report.)*

### SEC-H7 — Unscrubbed AI PHI egress
`app/api/ai-chat`, `synthesis`, `clinical-notes` PUT send patient content to Gemini without `scrubPHI()`.

---

## 14. Recommended Security Hardening Order

1. Unify admin authorization + revoke public admin RPC grants (Critical).
2. Server-side login/register with Turnstile + rate limit (High).
3. Allowlist password-reset redirects (High).
4. Apply `scrubPHI` to all Gemini payloads; vendor BAA review (High).
5. Implement real deletion + complete export (Critical/High compliance).
6. Rewrite clinician RLS to consent permissions (Critical).
7. Per-admin MFA replacing shared PIN (High).
8. Expand automated security tests (Medium).

---

## Security Scorecard

| Domain | Score |
|--------|-------|
| Authentication | 58 |
| Authorization | 42 |
| Session / cookies | 70 |
| API hardening | 65 |
| RLS / DB authZ | 40 |
| PHI / privacy | 45 |
| Headers / CSP | 85 |
| Secrets management | 88 |
| Logging / audit | 60 |
| Dependency hygiene | 55 |
| **Overall** | **52** |
