# V Welfare — Security Audit Report

**Audit date:** 2026-07-13
**Standard(s) applied:** OWASP Top 10 (2021), OWASP ASVS (conceptually), GDPR principles, HIPAA-inspired best practices
**Method:** Fresh, independent code review with exact file:line evidence. Findings were verified against the live source, not copied from prior in-repo audit reports.

---

## 0. Correction of Prior Self-Audits

This repository contains several prior "audit reports" (`SECURITY_AUDIT_REPORT.md`, `AUDIT_REPORT.md`, `AUDIT_REPORT_2026_06_24.md`) authored by earlier agent sessions, some claiming scores like "94/100 EXCELLENT" or "100/100 Authentication." **Independent re-verification in this audit found these claims to be materially overstated in several areas.** Examples:

- `SECURITY_AUDIT_REPORT.md` claims Next.js was upgraded to `15.5.19` — the current `package.json` pins `14.2.35`. The claimed CVE remediation is **not present on this branch**.
- Claimed "100/100 Authentication" and "CAPTCHA required for signup/login (verified on frontend + verified on backend)" — this audit found CAPTCHA verification is **not enforced server-side for the actual login/signup call**; it is only invoked by client code that can be bypassed (see AUTH-1).
- Claimed "Rate limiting: 5 attempts/15min... for admin login/user login" as a completed control — this audit found the pre-check endpoints are advisory (they don't gate the real auth call) for user login/register (see AUTH-3). Admin login's rate limit **does** gate the real credential check (`app/api/admin/login/route.ts`) and is correctly implemented.

**Recommendation:** Do not rely on prior in-repo audit reports for go-live decisions. Use this report and re-run verification after each fix.

---

## 1. Authentication

### AUTH-1 — [CRITICAL] CAPTCHA is not enforced server-side on login/registration

Login and registration call Supabase Auth **directly** from the browser (`app/(auth)/login/page.tsx:120-122`, `app/(auth)/register/page.tsx:150-159`). Turnstile verification (`POST /api/auth/verify-captcha`) is only triggered if the client-side code chooses to call it, and is explicitly skippable via a `captchaUnavailable` state designed to prevent a third-party widget outage from locking out users:

```35:38:app/(auth)/login/page.tsx
  // True when Turnstile can't be used ...
  // ... stop hard-gating login on the CAPTCHA
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false)
```

**Impact:** An attacker calling the Supabase REST API directly (bypassing the Next.js frontend entirely) gets no CAPTCHA challenge at all — there is no server-side enforcement point. This defeats the purpose of CAPTCHA as a bot/credential-stuffing defense.
**Fix direction:** Move CAPTCHA verification into a server-side proxy for login/signup (i.e., stop calling `supabase.auth.signInWithPassword()` directly from the browser; POST to a Next.js route that verifies the Turnstile token first, then calls Supabase server-side with the admin/service client or a scoped server client).
**Effort:** Medium (requires moving auth calls server-side, careful UX handling of session cookie issuance).

### AUTH-2 — [HIGH] Supabase session cookie flags not explicitly hardened

No `cookieOptions` override was found in `middleware.ts` or `lib/supabase/server.ts` — the app relies on `@supabase/ssr` v0.6.0 defaults, which (per upstream source) are `httpOnly: false`, `sameSite: 'lax'`, ~400-day `maxAge`, and no explicit `secure` flag set in code (Vercel/HTTPS may add it at the edge, but this isn't verified in-app).

**Impact:** If `httpOnly` is indeed `false` in the deployed environment, the session token is readable by any JavaScript running on the page — a single XSS bug anywhere in the app would allow full session theft, not just page-scoped damage. A ~400-day cookie lifetime is excessive for a healthcare app handling PHI.
**Fix direction:** Explicitly pass `cookieOptions: { httpOnly: true, secure: true, sameSite: 'lax', maxAge: <shorter value> }` to `createServerClient`/`createBrowserClient`, and verify via a live request that `Set-Cookie` reflects this.
**Effort:** Low (config change) + verification.

### AUTH-3 — [HIGH] Login/registration rate limits are advisory-only and bypassable

`/api/auth/check-login-limit` and `/api/auth/check-signup-limit` return `{ allowed: true/false }` but do not themselves perform the login/signup — the client is trusted to respect the response before calling Supabase directly. A client that skips the check-limit call (or calls Supabase's API directly) is not rate-limited by this application at all for login/registration.

```38:38:app/api/auth/check-login-limit/route.ts
    return NextResponse.json({ allowed: true })
```

**Impact:** Credential-stuffing / brute-force protection for the two highest-value auth endpoints (login, register) exists only as a UX nicety, not a security control. (Admin login is correctly enforced — the PIN check happens server-side after the rate-limit check, in the same request.)
**Fix direction:** Same remediation as AUTH-1 — proxy login/signup through a server route that enforces both CAPTCHA and rate limit before calling Supabase.
**Effort:** Medium (shared with AUTH-1).

### AUTH-4 — [MEDIUM] Password strength is enforced client-side only

`app/(auth)/register/page.tsx:90-96` and `app/(auth)/reset-password/page.tsx:73` enforce "8+ chars, letters+numbers" only in React state validation. No server-side check exists before `supabase.auth.signUp()`/`updateUser()`. Supabase project-level password policy (if any) is external to this repo and unverified.
**Fix direction:** Add server-side validation in the same proxy route from AUTH-1, and confirm Supabase Auth's minimum length setting in the dashboard (document required setting in `.env.example`/README).
**Effort:** Low.

### AUTH-5 — [MEDIUM] Registration error messages leak Supabase internals

```161:163:app/(auth)/register/page.tsx
      if (error) {
        setError(error.message)
```

Raw Supabase error text (e.g., "User already registered") is shown, enabling account enumeration on the registration form even though login has a unified error.
**Fix direction:** Map known Supabase error codes to generic, non-enumerating localized strings (mirror the pattern already used on the login page).
**Effort:** Low.

### AUTH-6 — [MEDIUM] `forgot-password` accepts a client-supplied `redirectTo` with no server allowlist

```27:28:app/api/auth/forgot-password/route.ts
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: typeof redirectTo === 'string' ? redirectTo : undefined,
    })
```

If Supabase's dashboard-level redirect allowlist is not strictly configured, this is a phishing/open-redirect vector via password-reset emails.
**Fix direction:** Ignore client-supplied `redirectTo`; hardcode the server-known reset URL. Verify Supabase Auth redirect URL allowlist is configured to the production domain only.
**Effort:** Low (code) + config verification.

### AUTH-7 — [LOW/positive] Admin session cookie is well-hardened

`app/api/admin/login/route.ts:56-61` sets `admin_session` with `httpOnly: true, secure: true, sameSite: 'lax'`, `maxAge: 8h`. This is a good control — cited here so it is not lost among the negative findings.

---

## 2. Authorization

### AUTHZ-1 — [HIGH] Two admin API routes skip the HMAC/PIN second factor

`requireAdmin()` (the standard admin guard, `lib/admin-auth.ts:15-27`) checks Supabase session + `profiles.role` + the `admin_session` HMAC cookie (i.e., the user must have completed the separate PIN-gated `/x/control/login` flow). Two routes implement their own, weaker check that omits the HMAC step entirely:

```8:20:app/api/admin/clinician-verifications/route.ts
async function requireAdminUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'superadmin'].includes(profile.role)) return null
  return user
}
```

```13:27:app/api/admin/kpis/[kpiId]/alert/route.ts
    const { data: { user } } = await supabase.auth.getUser()
    ...
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
```

**Impact:** Any user with `role IN ('admin','superadmin')` in the database who is merely logged in via the normal `/login` flow (no PIN) can call these two endpoints — reading clinician verification documents/PII and modifying KPI alert configuration — without ever completing the intended second-factor PIN step. The second route additionally excludes `superadmin` entirely, which looks like an unintended bug rather than a deliberate restriction.
**Fix direction:** Replace both local checks with `requireAdmin()`.
**Effort:** Low (2 files).

### AUTHZ-2 — [HIGH] IDOR: clinicians can query any patient's assignments

```24:29:app/api/assignments/route.ts
  if (patientId) {
    // Clinicians/admins may query any patient; patients may only query themselves
    if (!isClinician && patientId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    query = query.eq('patient_id', patientId)
```

The comment describes this as intentional, but no relationship/assignment check is performed for clinicians — any authenticated clinician can pass an arbitrary `patient_id` and read another clinician's patient's assignment history (assessment names, due dates, completion status).
**Fix direction:** Require `assigned_clinician_id === user.id` (or an active `clinician_patient_relationships` grant) before allowing a clinician to query another patient's assignments, mirroring the check already used in `clinical-notes`.
**Effort:** Low.

### AUTHZ-3 — [HIGH] Admin/superadmin bypass clinician-assignment checks on clinical notes for **any** patient

```26:31:app/api/clinical-notes/route.ts
  if (callerProfile?.role === 'clinician') {
    const { data: patientProfile } = await supabase
      .from('profiles').select('assigned_clinician_id').eq('id', patientId).single()
    if (patientProfile?.assigned_clinician_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden — patient is not assigned to you' }, { status: 403 })
    }
  }
```

The assignment check only runs for `role === 'clinician'`. This may be an intentional "admins can see everything" design choice, but for clinical notes specifically (subjective clinician impressions, potentially about third parties), unrestricted admin access to every patient's every note — with only a DB audit trail, no workflow-level justification requirement — is a data-minimization concern for a HIPAA-style deployment. At minimum this should be a deliberate, documented decision, not an implicit side effect of a role check that "just happens" to only gate clinicians.
**Fix direction:** Decide and document the intended admin access model; if broad admin access is intentional, ensure it is logged with a reason and reviewed periodically. If not intentional, scope admin note access to a "compliance review" flow.
**Effort:** Low (decision) + Medium (if scoping is implemented).

### AUTHZ-4 — [MEDIUM] Unvalidated `requested_permissions` on access requests / clinician invites

```195:211:app/api/access-requests/route.ts
  const permissionsToUse =
    Array.isArray(requested_permissions) && requested_permissions.length > 0
      ? requested_permissions
      : defaultPermissions
  ...
    .insert({ ..., requested_permissions: permissionsToUse })
```

Arbitrary strings can be stored as "requested permissions" (the approve-flow does validate permission keys against an enum, but the pending record itself can carry junk/spoofed values, which is then shown to the patient as what's being requested).
**Fix direction:** Validate `requested_permissions` against the same permission-key enum used at approval time, in both `access-requests` and `clinician/invite`.
**Effort:** Low.

### AUTHZ-5 — [MEDIUM] Admin package PATCH allows mass assignment

```45:48:app/api/admin/packages/route.ts
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await db.from('packages').update(updates).eq('id', id)
```

No field allowlist — any column present on the `packages` table can be overwritten by whatever the client sends. Lower severity because this is an already-admin-gated route, but it removes a defense-in-depth layer and risks accidental corruption of unexpected columns (e.g., `created_at`, `id` if ever included).
**Fix direction:** Explicit field allowlist (`{ name, description, status, ... } = body`).
**Effort:** Low.

### AUTHZ-6 — [MEDIUM] `/admin/settings` (the orphaned `app/(app)/admin` tree) has no admin check

```6:8:app/(app)/admin/settings/page.tsx
export default async function AdminSettingsPage() {
  const lang = await getLanguage()
  // No requireAdmin() — any logged-in user can view
```

Low sensitivity today (it's a links hub), but it sets a bad precedent and is confusing given the real admin panel lives at `/x/control`. Any authenticated user (patient or clinician) can navigate to `/admin/settings` directly.
**Fix direction:** Either delete this orphaned page tree (it duplicates `/x/control`) or add `requireAdmin()`.
**Effort:** Trivial.

---

## 3. Supabase Security

### SUPA-1 — [CRITICAL] Admin dashboard RPC functions are callable by any authenticated user with no in-function role check

```text
-- 20260627220100_admin_dashboard_rpcs.sql
CREATE OR REPLACE FUNCTION get_high_risk_patients(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (..., patient_email text, ...) LANGUAGE plpgsql STABLE AS $$ ... $$;
GRANT EXECUTE ON FUNCTION get_high_risk_patients(INTEGER) TO authenticated;
```

This pattern repeats for all 8 admin dashboard RPCs (stats, assessments, risk, engagement, demographics). They are `GRANT EXECUTE ... TO authenticated` with **no internal check** that the caller is an admin. `requireAdmin()` protects the Next.js API routes that normally call these, but nothing stops **any logged-in patient or clinician** from calling the RPC directly via the Supabase JS client or PostgREST (`supabase.rpc('get_high_risk_patients', { p_limit: 1000 })`), retrieving other patients' names/emails and high-risk flags.
**Impact:** Direct PHI exposure (patient identifiers + clinical risk status) to any authenticated user, completely bypassing the application layer. This is the most severe finding in this audit for a healthcare platform.
**Fix direction:** Add `IF get_my_role() NOT IN ('admin','superadmin') THEN RAISE EXCEPTION 'Forbidden'; END IF;` (or equivalent) inside each function, or `REVOKE EXECUTE FROM authenticated` and call these only from the service-role client in API routes.
**Effort:** Low (single migration, ~8 functions).

### SUPA-2 — [HIGH] `admin_demographics_summary` materialized view still exposed to `authenticated`

A later migration (`20260628071704_revoke_admin_matview_api_access.sql`) revokes `SELECT` on 4 of the 5 admin materialized views from `anon`/`authenticated`, but **omits `admin_demographics_summary`**. Any authenticated user can `SELECT * FROM admin_demographics_summary` via PostgREST.
**Fix direction:** Add the missing `REVOKE ALL ON public.admin_demographics_summary FROM anon, authenticated;` in a follow-up migration.
**Effort:** Trivial.

### SUPA-3 — [HIGH] Conflicting duplicate RLS policies on `clinical_notes` and `messages` widen access beyond intent

The baseline schema created strict policies (clinician must be assigned; patient can only read non-private notes). A later migration (`20260624190200_clinical_notes_and_messages_rls.sql`) added a **second, looser set of policies without dropping the first**. Because Postgres RLS policies are OR-combined, the looser policy wins in practice:

- `cn_patient_read` (`patient_id = auth.uid()`, no `is_private` check) lets a patient read notes marked `is_private = true`, overriding `notes_patient_read_nonprivate`.
- `cn_clinician_own` (`clinician_id = auth.uid()`) lets any clinician read/write notes for any patient as long as they authored the note — **without** the assignment check the baseline policy `clinician_own_notes` requires.
- `msg_participant_insert` (`patient_id = auth.uid() OR clinician_id = auth.uid()`) lets any patient/clinician pair exchange messages **without** a verified assignment, overriding the baseline's assignment-checked `messages_insert` policy.

**Impact:** Private clinical notes can be read by the patient they're about; unrelated clinicians and patients can message or write notes for each other, bypassing the assignment model entirely — a direct PHI confidentiality control failure enforced at the one layer (RLS) that's supposed to be the ultimate backstop.
**Fix direction:** In a new migration, `DROP POLICY` the older, stricter policies is the wrong direction — instead **drop the newer, looser policies** (`cn_patient_read`, `cn_clinician_own`, `msg_participant_insert`) and consolidate into a single, correct policy set that also accounts for the new consent model (`clinician_patient_relationships`), since the legacy `assigned_clinician_id`-only check is itself becoming stale (see Architecture Report §3.3).
**Effort:** Medium (requires reconciling legacy + new consent model in the policy logic, not just deleting).

### SUPA-4 — [MEDIUM] Clinician PHI access model still keyed on legacy `assigned_clinician_id`, not the newer consent grants

RLS for `assessment_submissions`, `mood_logs`, etc. checks `profiles.assigned_clinician_id`. The newer, patient-controlled `relationship_permissions` grants (e.g., "view assessment results") are enforced only at the API layer for the new consent routes, not at the RLS layer for the data tables themselves. This is consistent with the broader "two parallel models" architecture issue (see Architecture Report §3.3) but is called out here specifically because it means a **revoked** legacy assignment doesn't get an equivalent enforcement in the new model — the systems aren't just incomplete, they're indirectly inconsistent about who currently has access.
**Fix direction:** Part of the unification work in the Architecture Report / Roadmap R-1.
**Effort:** High (schema + RLS + API rewrite).

### SUPA-5 — [LOW/positive] Rate limiting, `get_my_role()`, and `submit_assessment_atomic()` are correctly hardened

`get_my_role()` is `SECURITY DEFINER` with `SET search_path = public` (prevents the classic RLS-recursion bug and search-path hijacking). `check_and_record_rate_limit()` uses `pg_advisory_xact_lock` for atomicity and fails **closed** (denies) on DB error. `submit_assessment_atomic()` verifies `auth.uid() = p_patient_id` before inserting. These are good, verifiable positive controls.

---

## 4. OWASP Top 10 (2021) Assessment

| # | Category | Verdict | Evidence |
|---|---|---|---|
| A01 | Broken Access Control | ⚠️ **Findings present** | AUTHZ-1, AUTHZ-2, AUTHZ-3, SUPA-1, SUPA-3 |
| A02 | Cryptographic Failures | ⚠️ **Minor findings** | HMAC/PIN comparisons are not constant-time (AUTH/ADM timing, see §5); session cookie hardening unverified (AUTH-2) |
| A03 | Injection | ✅ **No evidence found** | Supabase SDK parameterized queries throughout; `ilike` filters sanitize special characters in `admin/users`; no raw SQL string concatenation found |
| A04 | Insecure Design | ⚠️ **Findings present** | Two parallel authorization models for clinician access (Architecture §3.3); guest submission circuit breaker (500/24h) is a soft control, not hard |
| A05 | Security Misconfiguration | ⚠️ **Findings present** | `style-src 'unsafe-inline'` in CSP (deliberate tradeoff, documented in code — see §6); orphaned unguarded admin page (AUTHZ-6) |
| A06 | Vulnerable Components | ❌ **Not verified as fixed** | `next@14.2.35` — no CVE database check was performed in this audit; prior claim of upgrade to 15.5.19 is false on this branch. Run `npm audit` before go-live. |
| A07 | Authentication Failures | ❌ **Findings present** | AUTH-1, AUTH-3 (CAPTCHA/rate-limit bypassable for the actual credential check) |
| A08 | Data Integrity Failures | ⚠️ **Findings present** | Mobile client-side score computation + direct DB write (see §7); no idempotency key on assessment submission |
| A09 | Logging Failures | ⚠️ **Partial** | Audit log covers most admin mutations but not all (assessment visibility toggle, feature flags, platform settings, announcement CRUD are unaudited — see Database/Workflow findings); some routes leak `error.message` to clients (`/api/admin/kpis/history`) |
| A10 | SSRF | ✅ **No evidence found** | No route was found that fetches a user-supplied URL; AI calls target fixed Gemini/Turnstile endpoints only |

---

## 5. Session Security, JWT, Cookies

- Supabase session: see AUTH-2 (cookie flag hardening not verified in code).
- Admin session: HMAC-signed, `httpOnly`+`secure`+`sameSite=lax`, 8h expiry — good.
- **Timing-unsafe comparisons:** `app/api/admin/login/route.ts` (`pin !== expectedPin`) and `lib/admin-auth.ts` (`cookie !== expected`) use plain string inequality instead of a constant-time comparison (e.g., Node's `crypto.timingSafeEqual`). For a 6-8 digit PIN this is a Medium risk (small keyspace already limits brute-force value of a timing side-channel, but it's a cheap, standard fix).
  - **Fix direction:** Wrap both comparisons in a constant-time compare helper.
  - **Effort:** Low.
- **CSRF:** No CSRF tokens exist anywhere in the app; protection relies entirely on `SameSite=Lax` cookies. This is a commonly accepted baseline for same-site apps but is a Medium finding given the sensitivity of the data — consider adding `Origin`/`Sec-Fetch-Site` header checks on state-changing routes as defense in depth.
- **GET route with side effects:** `GET /api/connect/[token]` updates an invitation to `expired` status as a side effect of a read — a minor REST-semantics violation, low practical risk, but worth fixing (a prefetch or crawler hitting this URL could expire a legitimate invitation).

---

## 6. Data Protection & HTTP Security Headers

Verified in `middleware.ts` + `next.config.js`:

| Header | Value | Status |
|---|---|---|
| Content-Security-Policy | Nonce-based `script-src`; `style-src 'self' 'unsafe-inline' ...` | ⚠️ Scripts are nonce-protected (good); styles allow `unsafe-inline` — a deliberate, documented tradeoff (inline `style={{}}` attributes can't carry a nonce). Residual XSS-via-inline-style risk is low but non-zero. |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` | ✅ |
| X-Frame-Options | `DENY` | ✅ |
| X-Content-Type-Options | `nosniff` | ✅ |
| Referrer-Policy | `strict-origin-when-cross-origin` | ✅ |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` | ✅ |
| X-Powered-By | Removed (`poweredByHeader: false`) | ✅ |

PII/PHI-specific findings:
- `/api/user/export-data` performs `select('*')` on the profile row (over-fetch risk if new sensitive columns are added later without review) and has **no rate limit** — a user (or a script using a stolen session) can hammer this endpoint repeatedly.
- `/api/admin/packages/export` includes user emails in a CSV export with **no row cap** — unbounded memory growth risk at scale, and PII in an exported file with only the standard `Content-Disposition: attachment` protection (see Performance Report for the memory angle).
- `/api/admin/kpis/history` returns raw `error.message` from a failed query to the client — minor internal-schema disclosure.

---

## 7. API Security — Consolidated Findings

(Full per-route inventory is in the appendix of the workflow exploration; below is the top-severity subset relevant to a go-live decision.)

| Finding | Severity | Route |
|---|---|---|
| Client-computed assessment scores written directly via Supabase, bypassing all server validation | **CRITICAL** | Mobile app only (`mobile/app/(app)/assessments/[id].tsx`) — see Bug Report BUG-1 |
| Admin dashboard RPCs missing role check (also an API-security angle, not just DB) | **CRITICAL** | `get_high_risk_patients()` and 7 siblings, callable directly | 
| Two admin routes skip HMAC second factor | **HIGH** | `/api/admin/clinician-verifications`, `/api/admin/kpis/[kpiId]/alert` |
| Clinician IDOR on assignments | **HIGH** | `/api/assignments` GET |
| PHI sent to Gemini with no consent gate, no timeout/retry wrapper on one route | **HIGH** | `/api/clinical-notes` PUT, `/api/packages/[id]/interpret` |
| Clinician-facing "download report" UI hits an endpoint that always 403s for clinicians | **HIGH** (functional/broken, not exploitable, but indicates the authz model wasn't tested end-to-end) | `/api/reports` vs `patients-content.tsx` |
| Unvalidated `requested_permissions` arrays | **MEDIUM** | `/api/access-requests`, `/api/clinician/invite` |
| Mass-assignment on package update | **MEDIUM** | `/api/admin/packages` PATCH |
| Several sensitive GET endpoints have no rate limit (`/api/user/export-data`, `/api/admin/analytics`, `/api/admin/research`, `/api/connect/[token]`) | **MEDIUM** | multiple |
| Internal error message leaked to client | **MEDIUM** | `/api/admin/kpis/history` |

No SQL injection, no SSRF, and no unauthenticated cross-tenant PHI exfiltration via a Next.js API route were found. The most severe access-control issues are (a) the mobile client bypass and (b) the Postgres-level RPC/RLS gaps that sit *underneath* the API layer and are therefore invisible to an audit that only reviews the Next.js routes — this is why the direct database review in the Database Report was essential.

---

## 8. Healthcare / Regulatory Notes (GDPR / HIPAA-inspired)

- **Self-service data export** (`/api/user/export-data`) and **deletion request** (`/api/user/delete-request`) exist — a good GDPR-oriented baseline. Deletion is a *request* logged to `audit_log`, not an automatic hard delete; verify there's an operational process to action these within GDPR's response window (not verifiable from code).
- **No documented data retention policy** was found in code (no scheduled purge job for old assessment data, mood logs, or audit logs beyond `rate_limit_log` pruning). For a mental-health platform this should be defined and, ideally, enforced.
- **Consent tracking exists** (`patient_profiles.consent_given_at`, `consent_documents`/`user_consents`) for sharing data with assigned clinicians, but **no equivalent consent gate exists before sending patient data to the third-party Gemini AI API** (synthesis, ai-chat, clinical-notes AI draft, package interpretation). For HIPAA-style handling of PHI, sending clinical scores and free-text content to an external LLM provider without an explicit, documented consent/BAA-equivalent control is a compliance gap that should be resolved before wide launch, independent of whether Google's terms are otherwise acceptable.
- **High-risk (crisis) notification is in-app only**, admin-facing, fire-and-forget, with no delivery guarantee and no assigned-clinician alert — see Bug Report BUG-3. For a platform whose stated purpose includes catching suicidal ideation, this is the most safety-relevant finding in the entire audit, even though it is not a "security vulnerability" in the traditional sense.

---

## Security Score

Given the totality of evidence (2 Critical, 6 High, and multiple Medium findings, several of which involve direct or indirect PHI exposure paths that sit below the application layer), the previous in-repo claim of 94-100/100 is not supportable.

**Security Score: 58/100**

| Sub-area | Score |
|---|---|
| Authentication | 55/100 (real controls exist but the highest-value endpoints — login/register — aren't actually gated server-side) |
| Authorization | 60/100 (RLS + requireAdmin() foundation is sound; specific gaps are serious but narrow and fixable) |
| Supabase/DB security | 50/100 (the admin RPC gap and duplicate-policy gap are severe for a PHI platform) |
| API security | 62/100 (validation and rate limiting are good in the majority of routes; the exceptions are high-impact) |
| Headers/transport | 92/100 (genuinely strong) |
| Compliance posture | 55/100 (export/delete exist; AI consent and retention policy do not) |

### Critical Issues: 2
### High Issues: 6
### Medium Issues: 9+
### Low Issues: 6+ (several are positive controls noted for completeness)

This score should be treated as a floor, not a ceiling — it reflects only what static code review can verify. A live penetration test and a check of actual Supabase dashboard settings (redirect allowlist, JWT expiry, password policy) are required before this number can be considered final. See `implementation-roadmap.md` for remediation order and effort estimates.
