# V Welfare Security Audit

**Standard:** OWASP Top 10, OWASP ASVS principles, GDPR, HIPAA-inspired safeguards  
**Assessment type:** full static review plus non-destructive live configuration checks  
**Security score:** **42/100**

## Executive finding

The platform must not process real patient PHI in its current verified state. Live database inspection confirmed:

1. unauthenticated signup can supply a privileged role through user-editable metadata;
2. multiple RLS policies allow any clinician to read unrelated patients’ PHI;
3. clinical note/message policies were weakened by overlapping permissive policies;
4. Gemini-bound PHI is not consistently minimized or de-identified;
5. the audited source cannot reproduce the deployed database.

Strong controls—nonce CSP, HSTS, service-role isolation, rate limiting, Turnstile, audit logs, and admin HMAC sessions—do not compensate for database-level privilege escalation and cross-tenant access.

## Method and limitations

- Reviewed auth, middleware, all route handlers, Supabase clients/migrations, mobile auth/data access, AI calls, exports, and configuration.
- Queried live `pg_policies`, function definitions/grants, triggers, constraints, advisors, migration history, and recent logs.
- Probed public production routes and headers.
- Did not exploit the privilege-escalation path, create test production users, access patient records, or run destructive tests.
- Production Vercel source is 45 commits ahead of this checkout; findings tied to source may differ in `main`. Live database findings are current as of the audit date.

## Critical findings

### SEC-01 — Signup-controlled role enables privilege escalation

**Location:** `supabase/migrations/20260619120000_schema_baseline.sql:597-602`; live `public.handle_new_user()`  
**Live status:** confirmed

`handle_new_user()` sets:

```sql
v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
```

Supabase `raw_user_meta_data` is user-controlled. A caller can bypass the UI and call public Supabase signup with `role=admin`, `superadmin`, or `clinician`. The trigger runs as `SECURITY DEFINER` and inserts that role. The role escalation trigger applies only to UPDATE, not the initial INSERT.

**Impact:** database admin/clinician RLS access; access to role-only admin APIs; broad patient PHI exposure. The admin panel PIN may block pages using `requireAdmin()`, but it does not protect database policies or the two weaker admin API families.

**Remediation:**

1. Change signup trigger to always create `patient`.
2. Create clinician/admin roles only through server-side, audited approval functions.
3. Reject privileged values in signup metadata.
4. Review all existing profile roles against an authoritative admin record.
5. Revoke sessions for any suspicious account.
6. Add a database test proving user metadata cannot affect authorization.

**Effort:** 6–10 hours plus account review.

### SEC-02 — Clinicians can read unrelated patient PHI

**Location:** live RLS and baseline policies:

- `patient_profiles` `patient_prof_clinician`
- `ai_insights` `insights_clinician`
- `chat_sessions` `chat_clinician_read`
- `journal_entries` `journal_clinician_shared`
- `pdf_reports` `pdf_reports_clinician`
- `personality_results` `personality_clinician`
- `assessment_assignments` `assign_read`

**Live status:** confirmed via `pg_policies`

These policies authorize by role only, without requiring verified clinician status, active patient relationship, or a granted permission.

**Impact:** horizontal privilege escalation and reportable cross-patient mental-health data breach.

**Remediation:** replace role-only clinician clauses with active relationship plus explicit permission checks. Admin access should be separately scoped. Add two-user RLS tests for every PHI table.

**Effort:** 20–32 hours including policy tests.

### SEC-03 — Overlapping RLS permits private-note and unassigned messaging access

**Location:** `20260619120000_schema_baseline.sql:942-961,1056-1067`; `20260624190200_clinical_notes_and_messages_rls.sql:8-54`  
**Live status:** confirmed

Postgres permissive policies combine with OR semantics:

- `cn_patient_read` allows a patient to read all notes for that patient, overriding the older `is_private = false` restriction.
- `cn_clinician_own` allows a clinician to insert notes for any patient when `clinician_id = auth.uid()`.
- `msg_participant_insert` allows participant insertion without the assignment relationship required by `messages_insert`.

**Impact:** disclosure of clinician-private notes, unauthorized clinical-record creation, and messaging outside approved relationships.

**Remediation:** define one intentional policy per operation/role set; include active relationship/permission predicates; regression-test private notes and unassigned participants.

**Effort:** 12–20 hours.

## High findings

### SEC-04 — PHI is sent to Gemini without consistent minimization

**Locations:**

- `app/api/ai-chat/route.ts:124-133`
- `app/api/clinical-notes/route.ts:87-149`
- `app/api/synthesis/route.ts`
- `app/api/packages/[id]/interpret/route.ts`
- scrubber exists at `lib/security/anonymizePHI.ts` but is used only in recommendations

User messages and note excerpts can contain direct identifiers and sensitive clinical narratives.

**Risk:** unauthorized third-party disclosure, unclear processor/BAA posture, excessive data processing, and retention/jurisdiction concerns.

**Remediation:** block PHI by default; de-identify structured payloads; prevent raw notes from leaving the controlled boundary; document model, region, retention, and DPA/BAA; add consent and audit records; use a clinical safety review.

**Effort:** 16–32 engineering hours plus legal/vendor review.

### SEC-05 — Admin second factor is bypassed by two API families

**Locations:**

- `app/api/admin/clinician-verifications/route.ts:8-20`
- `app/api/admin/kpis/[kpiId]/alert/route.ts:13-27`

These routes check Supabase role instead of `requireAdmin()`. The first exposes license verification data/actions. The second also incorrectly excludes `superadmin`.

**Remediation:** centralize API-compatible `requireAdmin` and mandate it for every admin handler; add route inventory tests.

**Effort:** 4–8 hours.

### SEC-06 — Production migration/source drift breaks security assurance

**Evidence:** production database has 17 migrations absent locally; Vercel production is 45 commits ahead of the checkout.

Payment tables, assessment drafts, constraints, and function hardening exist live but not in this repository state. A rebuild would omit controls and features.

**Remediation:** reconcile and commit every production migration; enforce migration drift checks in CI; audit the production commit itself.

**Effort:** 12–24 hours.

### SEC-07 — Vulnerable Next.js dependency

**Location:** `package.json:22`, lockfile  
**Evidence:** `npm audit` reported 5 vulnerabilities: 4 high and 1 moderate, including Next.js request deserialization, request smuggling, and authorization-related advisories.

**Remediation:** upgrade Next.js and matching ESLint config to a supported patched release, then run auth, middleware, App Router, PDF, and deployment regression tests.

**Effort:** 12–24 hours.

## Medium findings

| ID | Location | Problem / risk | Remediation | Effort |
|---|---|---|---|---:|
| SEC-08 | live `check_relationship_permission` | `anon` can execute a SECURITY DEFINER relationship oracle | revoke anon; validate caller identity or make safe invoker function | 2–4h |
| SEC-09 | live Auth settings/advisor | leaked-password protection disabled | enable HIBP protection; enforce password policy | 1–2h |
| SEC-10 | `app/api/auth/forgot-password/route.ts:27-28` | caller-controlled reset redirect relies on provider allowlist | construct redirect server-side from one canonical origin | 1–2h |
| SEC-11 | `mobile/lib/supabase.ts:7-14` | session storage posture is inconsistent with healthcare mobile requirements | use SecureStore/Keychain consistently; prohibit AsyncStorage tokens | 4–8h |
| SEC-12 | `mobile/.../assessments/[id].tsx:115-131` | direct DB submission bypasses validation/rate limit/high-risk workflow | route through validated API or tightly validated RPC | 8–16h |
| SEC-13 | `lib/gemini.ts:18` | API key in query string can leak into infrastructure logs | use provider-supported header/server SDK | 2–4h |
| SEC-14 | guest route vs live schema | guest inserts NULL patient ID against NOT NULL column | separate guest table or disable route; data-minimize demographics | 8–16h |
| SEC-15 | `app/api/user/export-data` | no export rate limit or recent-auth requirement | add rate limit, recent-auth challenge, audit and safe delivery | 3–6h |
| SEC-16 | `app/api/user/delete-request/route.ts:17-22` | email copied into audit details | store immutable user ID; minimize/redact PII | 1–2h |
| SEC-17 | `middleware.ts` CSP | CSP omits `object-src 'none'` and upgrade directive | add directives after regression test | 1–2h |
| SEC-18 | `document_urls` | no controlled upload, MIME, malware, or ownership validation | private bucket, signed URLs, AV scan, content allowlist | 16–32h |
| SEC-19 | live Auth logs | logs contain email, IDs, IPs | restrict access/retention; redact downstream exports | 2–6h |

The Supabase anon/publishable key in `mobile/app.json` is not a secret by design. Committing it is a configuration/rotation concern, not a credential breach, provided RLS is correct. The actual risk here is that RLS is not correct.

## Authentication assessment

| Control | Result |
|---|---|
| Registration | **Fail** — role metadata escalation |
| Email verification | **Unverified** — local config disables confirmations; live users observed confirmed |
| Login/logout | Implemented; live logs showed no 4xx/5xx in sampled 24h |
| Password reset | Implemented; redirect needs server allowlist |
| Session refresh | Implemented through Supabase SSR middleware |
| Session expiry | 3600-second local JWT config; refresh rotation enabled |
| Brute force | App prechecks and admin limit exist, but public Supabase Auth can bypass UI prechecks |
| Credential stuffing | leaked-password detection disabled |
| Multi-tab | Supabase client behavior; no explicit regression test |
| Admin session | Strong HMAC design, inconsistently enforced |

## OWASP Top 10 mapping

| Category | Result | Evidence |
|---|---|---|
| A01 Broken Access Control | **Critical fail** | role escalation, broad clinician RLS, overlapping policies |
| A02 Cryptographic Failures | Partial | TLS/HSTS good; token storage/log privacy concerns |
| A03 Injection | Pass with caveats | parameterized Supabase queries; CSV formula protection present |
| A04 Insecure Design | **Fail** | dual relationship models, ungoverned AI PHI boundary |
| A05 Security Misconfiguration | Fail | function grants, leaked-password protection, source drift |
| A06 Vulnerable Components | Fail | current npm audit findings |
| A07 Authentication Failures | **Fail** | signup role trust |
| A08 Software/Data Integrity | Fail | migration drift, no CI |
| A09 Logging/Monitoring | Fail | console logging only; no alerting/APM |
| A10 SSRF | No active vector found | fixed outbound hosts; document URLs not fetched server-side |

## ASVS-oriented control summary

- **V1 Architecture:** fail—authorization model is contradictory.
- **V2 Authentication:** fail—trusted role comes from user metadata.
- **V3 Session:** partial—Supabase rotation and secure cookies, limited revocation assurance.
- **V4 Access control:** critical fail—cross-patient RLS.
- **V5 Validation:** partial—web assessment validation strong; mobile bypasses it.
- **V7 Error/logging:** partial—generic client errors but no structured monitoring.
- **V8 Data protection:** fail—AI PHI boundary and broad clinician reads.
- **V9 Communications:** pass—HTTPS/HSTS/TLS.
- **V10 Malicious code:** partial—dependency scan fails, no CI gate.
- **V12 Files:** not production-ready—upload controls absent.
- **V13 API:** partial—many explicit checks, inconsistent central enforcement.
- **V14 Configuration:** fail—production drift and missing reproducibility.

## Security headers: live verified

Production returned:

- nonce-based `script-src`
- `frame-ancestors 'none'`
- HSTS with preload
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- restrictive camera/microphone/geolocation policy
- strict-origin referrer policy
- no-store for application/API responses

These are strong and should be preserved.

## Live Supabase advisor evidence

Security advisor warnings:

- `check_relationship_permission`: executable by anon/authenticated as SECURITY DEFINER;
- `get_my_role`: executable externally as SECURITY DEFINER;
- `submit_assessment_atomic`: authenticated execution (intended only if body checks remain complete);
- leaked-password protection disabled.

Performance advisor also reported 199 multiple-permissive-policy warnings and 51 RLS init-plan warnings, supporting the policy consolidation requirement.

## Incident-prevention actions before any launch

1. Freeze new clinician/admin registration.
2. Fix signup role assignment and review all current privileged profiles.
3. Replace broad clinician RLS and overlapping notes/messages policies.
4. Revoke and reissue sessions after role remediation.
5. Disable Gemini clinical-note/chat PHI transfer until processor controls are approved.
6. Reconcile source and database migrations.
7. Run independent authenticated penetration tests with patient A, patient B, clinician A, clinician B, admin, and anonymous identities.

## Verdict

❌ **DO NOT GO LIVE**

The verified privilege-escalation and cross-patient RLS findings are launch blockers for any platform processing mental-health data.

