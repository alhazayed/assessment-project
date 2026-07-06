# Security Assessment — app.vwelfare.com

**Date:** 2026-07-06
**Scope:** Full-repository security review (authentication, authorization, API surface,
database/RLS, Supabase configuration, security headers, input validation) plus the
Supabase security advisor against the live production project.
**Method:** Source-level review of all 69 API routes, middleware, the admin-auth
boundary, RLS policies and database functions, and the Supabase security linter.

> **Testing note.** This was performed as a **code + database + configuration review
> against the repository and the Supabase advisor**, not black-box penetration testing
> against the live site. Firing injection / brute-force / credential-stuffing payloads
> at a production healthcare database risks corrupting real patient data or causing a
> denial of service. Source-level review is both safer and more complete — every route,
> policy, and header is inspected directly rather than inferred from the outside.

---

## Executive Summary

The application layer is **well hardened** — the result of several prior audit passes.
All 38 admin API routes enforce a role check; IDOR-prone routes verify ownership before
acting; the guest submission path re-scores server-side and is aggressively rate-limited;
security headers (HSTS+preload, CSP with per-request nonce, `nosniff`, `Referrer-Policy`,
`Permissions-Policy`, `X-Frame-Options: DENY`) are comprehensive; and the middleware
validates JWTs with `auth.getUser()` (not the spoofable `getSession()`).

The findings this round were at the **database layer**, surfaced by the Supabase security
advisor and confirmed against the live schema. The headline issue was **migration drift**:
a previously-committed hardening migration had never actually deployed to production
because it was versioned in the past relative to production HEAD, leaving 9 functions with
a mutable `search_path`. Both database findings were fixed and verified against production.

**Security Score: 92 / 100**
**Risk Rating: LOW** (post-fix)
**Go / No-Go: GO** — no launch-blocking issues remain.

---

## Findings

### SEC-1 — Migration drift left 9 functions with a mutable `search_path` (FIXED)

- **Severity:** Medium
- **OWASP:** A05:2021 Security Misconfiguration · **CWE-426** (Untrusted Search Path)
- **CVSS (est.):** 4.4 (AV:N/AC:H/PR:H/UI:N/S:U/C:L/I:L/A:N)

**Description.** Nine `public` functions (`get_admin_dashboard_stats`,
`get_assessment_completion_funnel`, `get_assessment_performance_comparison`,
`get_demographics_breakdown`, `get_high_risk_patients`, `get_patient_risk_profile`,
`get_top_assessments`, `get_user_engagement_metrics`, and the trigger
`packages_set_updated_at`) ran without a pinned `search_path`. A mutable `search_path`
lets a caller who controls their session search path shadow built-in objects and
influence how unqualified names resolve inside the function.

**Root cause.** A correct fix already existed in the repo
(`20260702194500_pin_function_search_paths.sql`) but was **versioned earlier than
migrations already applied to production** (e.g. `20260704085517_assessment_drafts`).
Supabase's migration runner only applies versions newer than the latest applied one, so
the file was permanently skipped ("out-of-order" drift) and the functions on production
kept a `null` (mutable) `search_path`. Verified via `pg_proc.proconfig = null` on the
live database and the advisor's `function_search_path_mutable` lint.

**Fix (implemented + verified on production).** New migration
`20260706085712_repin_function_search_paths.sql`, carrying a timestamp newer than
production HEAD, pins all nine to `search_path = public, pg_temp`. Verified:
`pg_proc.proconfig` now shows `search_path=public, pg_temp` for all nine, and the advisor
no longer reports any `function_search_path_mutable` warnings. These are SECURITY INVOKER
analytics/trigger helpers that take no resolution-altering user input, so the change is
additive and cannot alter behavior.

---

### SEC-2 — `generate_patient_access_code()` executable by `anon`/`authenticated` over REST (FIXED)

- **Severity:** Low
- **OWASP:** A01:2021 Broken Access Control · **CWE-732** (Incorrect Permission Assignment)
- **CVSS (est.):** 3.1 (AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:L/A:N)

**Description.** The SECURITY DEFINER function `generate_patient_access_code()` carried
`EXECUTE` for `PUBLIC`, `anon`, and `authenticated`, so any signed-in (or anonymous)
caller could invoke it directly via `/rest/v1/rpc/generate_patient_access_code` —
burning access-code space or probing the generator outside the intended flow.

**Root cause.** Default `PUBLIC` execute grant on the function was never tightened.

**Fix (implemented + verified on production).** Migration
`20260706085904_revoke_public_execute_generate_patient_access_code.sql` revokes `EXECUTE`
from `PUBLIC`, `anon`, and `authenticated`. The only legitimate caller —
`app/api/patient/code/route.ts` — invokes it through the **service-role** client
(`createAdminClient`, both call sites confirmed), which bypasses these grants, so the real
code path is unaffected. Verified: `role_routine_grants` now shows only `postgres` and
`service_role` retain `EXECUTE`.

---

### SEC-3 — Leaked-password protection disabled (RECOMMENDATION — owner action)

- **Severity:** Low · **OWASP:** A07:2021 Identification & Authentication Failures · **CWE-521**

Supabase Auth can reject passwords found in the HaveIBeenPwned corpus; it is currently
off. This is a **project Auth setting**, not code — enable it in the Supabase dashboard
(Authentication → Policies → "Leaked password protection"). One toggle, no code change.
Remediation: https://supabase.com/docs/guides/auth/password-security

---

## Reviewed and Intentional (no action)

- **`get_my_role()` and `check_relationship_permission()` executable by `authenticated`.**
  The advisor flags these SECURITY DEFINER functions as role-executable. Both are
  referenced **inside RLS policies** (`get_my_role()` gates dozens of `USING`/`WITH CHECK`
  clauses; `check_relationship_permission` has an explicit `GRANT ... TO authenticated`),
  so the querying role *must* retain `EXECUTE` for those policies to evaluate. Revoking
  would break row-level security app-wide. This is the standard, correct RLS-helper
  pattern — left as-is by design.
- **`submit_assessment_atomic` executable by `authenticated`.** By design — this is the
  RPC authenticated users submit assessments through. `anon` was already revoked in
  `20260702193507`.
- **Security headers.** `next.config.js` sets HSTS (`max-age=63072000; includeSubDomains;
  preload`), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`,
  `X-Frame-Options: DENY`; middleware adds a per-request nonce CSP with
  `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`. Comprehensive.
- **Admin API authorization.** All 38 `/api/admin/*` routes enforce an
  `['admin','superadmin']` role check (via `requireAdmin` or an inline equivalent).
  Middleware gates `/x/control` *pages*; each admin *API* route guards itself.
- **IDOR-prone routes.** `relationships/[id]/permissions` (patient-only mutation, membership
  check on read), `access-requests/[id]`, `packages/[id]/*` verify ownership before acting.
- **Guest submission (`submit-assessment-guest`).** Server-side re-scoring (never trusts a
  client-supplied score), dual-window IP rate limits (3/min, 5/day), per-definition daily
  cap, a global 500/24h circuit breaker, Turnstile fail-closed in production, and strict
  enum/range input validation.
- **Guest scoring (`score-assessment`).** Stateless, reads only public definitions, writes
  nothing, rate-limited 10/hr/IP.

---

## OWASP Top 10 Coverage

| Category | Status |
|---|---|
| A01 Broken Access Control | Reviewed — admin/role checks and ownership verified; SEC-2 fixed |
| A02 Cryptographic Failures | HTTPS enforced (HSTS preload); admin session HMAC-bound to userId+role |
| A03 Injection | Parameterized Supabase queries; strict server-side input validation |
| A04 Insecure Design | Server-side re-scoring; rate limits; circuit breaker |
| A05 Security Misconfiguration | SEC-1 fixed (search_path); headers/CSP comprehensive |
| A06 Vulnerable Components | Prior Next.js CVE mitigations in place (see NEXTJS_CVE_REMEDIATION.md) |
| A07 Auth Failures | `getUser()` JWT validation; Turnstile; rate limits; SEC-3 recommendation |
| A08 Data Integrity | Stripe webhook signature verification; audit logging |
| A09 Logging Failures | `audit_log` on privileged/guest actions |
| A10 SSRF | No user-controlled outbound fetch; remote image optimization disabled |

---

## Remaining Risks

- **SEC-3** (leaked-password protection) requires a one-click dashboard toggle by the owner.
- **Process risk:** the out-of-order migration that caused SEC-1 indicates migration
  versions can be committed with timestamps behind production HEAD and silently never
  deploy. Recommend a CI check that fails when a new migration's version is ≤ the latest
  applied production version.

## Production Readiness

**GO.** Both database findings are fixed and verified on production; the remaining item is
a low-severity dashboard toggle. No launch-blocking issues.
