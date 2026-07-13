# V Welfare Security Report
**Audit date:** 2026-07-13 · **Scope:** static source/migration review only. This is not a penetration test, legal attestation, or verification of deployed Supabase/Vercel settings.

## Verdict
**❌ DO NOT GO LIVE** for real patient PHI until Critical and High findings are remediated and verified on an isolated staging database. Current-source evidence contradicts optimistic historical reports; `package.json` still pins Next 14.2.35 and current migrations retain high-risk authorization flaws.

## Critical findings
| ID | Location | Problem and risk | Recommended solution | Effort |
|---|---|---|---|---|
| SEC-01 | `supabase/migrations/20260619210813_fix_duplicate_auth_trigger.sql:17-20` | `handle_new_user` assigns `profiles.role` from user-editable `raw_user_meta_data`. A direct public signup can request `admin`, producing database-level privilege escalation. | Migration: hardcode new users to `patient`; provision elevated roles only through audited service-role invite/admin workflow; remediate existing untrusted roles. | 2–4 h |
| SEC-02 | `20260624190200_clinical_notes_and_messages_rls.sql:8-65` | Additive permissive policies OR with existing policies. Notes/messages can become accessible outside a valid clinical relationship; patients may see private notes. | Inventory deployed `pg_policies`; drop/recreate policies atomically against active relationship permissions. Add JWT integration tests for every actor pair. | 6–10 h |
| SEC-03 | `app/api/ai-chat/route.ts`, `synthesis/route.ts`, `clinical-notes/route.ts`, `packages/[id]/interpret/route.ts` | Mental-health narrative, scores, and notes are transmitted to Gemini; only recommendations call `scrubPHI()`. This is PHI disclosure and third-party processing risk. | Disable PHI-bearing AI until legal/vendor review; require explicit AI consent, structured minimization/redaction, DPA/BAA suitability, audit evidence, retention policy, and vendor-approved auth transport. | 12–20 h plus legal |

## High findings
| ID | Location | Problem and risk | Recommended solution | Effort |
|---|---|---|---|---|
| SEC-04 | Consent migration and clinician APIs | New `check_relationship_permission()` is not used by APIs; legacy `assigned_clinician_id` still controls access. Revocation can fail and consent UI is misleading. | Define one canonical permission vocabulary and migrate RLS/routes to it; deprecate legacy assignment after data migration. | 20–32 h |
| SEC-05 | `20260624120000...:172-183`; `api/access-requests/[id]`; `lib/permissions.ts` | DB CHECK, API, and UI use mismatched permission keys. Approval may fail or not enforce intended scope. | Shared typed canonical constants plus DB enum/check migration and backfill. | 6–10 h |
| SEC-06 | Baseline RLS, especially `patient_profiles`, `ai_insights`, shared journal | Broad clinician policies can expose all patient profiles/AI insights/shared journal entries to any clinician, including direct mobile PostgREST callers. | Relationship- and permission-scope every clinician SELECT/INSERT/UPDATE policy; validate mobile JWT behavior. | 8–14 h |
| SEC-07 | `20260627220100_admin_dashboard_rpcs.sql:235-243` | Admin RPCs are granted to `authenticated`; materialized-view revocation is incomplete. Any signed-in user may call analytics/risk functions if their internal checks are absent or flawed. | Revoke `PUBLIC`, `anon`, and `authenticated`; use narrowly guarded admin-only security-definer wrappers with fixed search_path. | 3–5 h |
| SEC-08 | `app/api/auth/forgot-password/route.ts:20-28` | Client-provided reset `redirectTo` is not allowlisted. Misconfigured Supabase allowlists could enable phishing/open redirect. | Ignore client redirect; use a fixed site URL and validated relative `next` path only. | 1 h |
| SEC-09 | `ADMIN_PIN`, `.env.example`, admin APIs | Shared 6–8 digit PIN is not MFA, is shared between operators, and one admin route uses a weaker role-only check. | Require per-user TOTP/WebAuthn; use `requireAdmin()` consistently; account/device lockout and audit. | 12–24 h |

## Medium / low
- **SEC-10 (M):** `aiBudgetGuard` count-then-insert is non-atomic; parallel calls may overrun cost limits. Use a transactional RPC or Redis atomic operation. (3–5 h)
- **SEC-11 (M):** CAPTCHA can be bypassed when widget load fails; production policy should fail closed with usable recovery/support flow. (2–4 h)
- **SEC-12 (M):** `x-forwarded-for` fallback is trust-boundary sensitive. Restrict trusted proxy headers at Vercel/Cloudflare. (2 h)
- **SEC-13 (M):** high-value data export and notifications lack consistent per-user rate limits. (2–3 h)
- **SEC-14 (M):** `style-src 'unsafe-inline'` remains. It is lower impact than script injection but weakens defense in depth. (design decision)
- **SEC-15 (L):** Gemini key is passed in URL query string (`lib/gemini.ts`); proxy/header auth reduces log exposure. (1 h)
- **SEC-16 (L):** health endpoint reveals integration state; return a minimized operational health response externally. (1 h)

## Positive controls
Nonce-protected script CSP, HSTS/frame/nosniff headers, user-scoped Supabase server client, server-only service key module, atomic rate-limit RPC, authentication route limits, and `submit_assessment_atomic` ownership validation are solid foundations worth retaining.

## OWASP ASVS / Top 10 status
| Area | Status | Evidence |
|---|---|---|
| Broken access control | Fail | SEC-01, SEC-02, SEC-04–07 |
| Cryptographic/session controls | Partial | managed auth cookies/HSTS; shared PIN and no validated idle-session policy |
| Injection | Partial pass | SDK parameterization is predominant; no dynamic SQL found; RLS/functions require deployed validation |
| Insecure design/data governance | Fail | dual consent model and AI PHI egress |
| Security misconfiguration | Partial | local auth confirmation disabled; deployment config unverified |
| Vulnerable components | Fail pending upgrade | `next: 14.2.35` currently committed |
| Logging/monitoring | Partial | audit table exists; no demonstrated centralized alerting or complete PHI access audit |

## Verification gates
Before launch, test with real JWTs on staging: attacker signup role injection; all patient/clinician/admin pairwise RLS cases; revoked relationship access; API IDOR; AI payload redaction; admin RPC direct PostgREST denial; reset redirect; rate-limit concurrency; mobile direct database calls. Obtain legal confirmation for data processing, retention, incident response, and AI vendor terms.
