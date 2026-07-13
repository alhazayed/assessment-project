# V Welfare — Security Report

**Audit date:** 2026-07-13
**Standards:** OWASP Top 10 (2021), OWASP ASVS, HIPAA‑inspired safeguards, GDPR
**Method:** Static source review of web + mobile + Supabase. No live pen‑test / DB access was available in this environment; RLS/Storage policies that live only in "stub" migrations could **not** be verified against production and are called out as evidence gaps.

Severity key: **Critical** (fix before launch), **High**, **Medium**, **Low**.

---

## 0. Executive Summary

The web platform shows **above‑average security engineering** for an early‑stage SaaS: nonce CSP, HSTS, fail‑closed Turnstile, fail‑closed Postgres rate limiting, anti‑enumeration auth, an admin HMAC second factor, and server‑side assessment scoring. However, several issues are **launch‑blocking for a regulated mental‑health product**:

- PHI is sent to a third‑party AI (Gemini) **without the PHI scrubber** that the codebase already ships.
- The **database migration history cannot be trusted** (~71 empty stubs), so RLS and Storage policies that ultimately protect PHI are **unverifiable from the repo**, and at least one recent migration set introduces RLS regressions and over‑grants (see `database-report.md`).
- The **mobile app** stores auth tokens in unencrypted storage and scores assessments client‑side.
- Two admin API routes bypass the HMAC second factor; several clinician routes authorize on a stale legacy field, bypassing granular consent.
- **Email verification is disabled** and there is **no monitoring/alerting** or centralized security logging.

**Security score: 62 / 100** (web app in isolation ≈ 72; the platform score is dragged down by database‑drift risk, PHI‑to‑AI leakage, and the mobile app).

| Severity | Count |
|---|---|
| Critical | 4 |
| High | 8 |
| Medium | 10 |
| Low | 7 |

---

## 1. OWASP Top 10 Findings

### A01 — Broken Access Control

**SEC‑C1 (Critical): RLS/Storage policies unverifiable + recent RLS regressions.**
~71 migrations are empty stubs ("applied directly to remote"), so the authoritative access‑control layer for PHI cannot be reproduced or reviewed from the repo. Where recent RLS *is* in the repo, `20260624190200_clinical_notes_and_messages_rls.sql` **adds permissive policies without dropping the stricter baseline ones**, and Postgres OR‑combines permissive policies:
- `cn_patient_read` lets patients read **all** clinical notes including `is_private = true` (`.../20260624190200...sql:8-20` vs baseline `notes_patient_read_nonprivate`).
- `msg_participant_insert` lets a clinician insert messages for **any** patient by setting themselves as `clinician_id`, bypassing assignment (`...:47-54`).
Also, admin dashboard RPCs/materialized views are `GRANT`ed to **all `authenticated`** users with no in‑function role check, and the revoke migration misses `admin_demographics_summary` (see `database-report.md` DB‑C3/DB‑H). *Impact:* horizontal PHI disclosure. *Fix:* backfill real migrations (or a `pg_dump` baseline); drop the weak policies; add admin gates; revoke the remaining view. *Effort: 16–32h.*

**SEC‑H3 (High): Two admin routes skip the HMAC second factor.**
`admin/clinician-verifications` (`route.ts:8-20`) and `admin/kpis/[kpiId]/alert` (`route.ts:25-27,109-111`) authorize with an inline `profiles.role` check only — no `admin_session` HMAC. A stolen/replayed Supabase session for an admin account bypasses the PIN factor and can read clinician PII (licenses, documents) or alter KPI alerting. `admin/kpis/[kpiId]/alert` additionally checks `role === 'admin'` only, **locking out superadmins**. *Fix:* route all admin APIs through `requireAdmin()`. *Effort: 2–3h.*

**SEC‑H4 (High): Admin consent actions without `requireAdmin()`.**
`access-requests/[id]` PATCH allows any profile with `role ∈ {admin,superadmin}` to approve/reject/revoke consent relationships **without** the admin HMAC and **without** a `status='pending'` guard (`route.ts:81-86,115-123`) — re‑approval of revoked relationships is possible. *Fix:* require admin factor; add pending‑state guard. *Effort: 2h.*

**SEC‑H7 (High): Consent bypass via legacy `assigned_clinician_id`.**
`clinical-notes` (`:26-31`), `notify-message` (`:54-63`), and `assignments` (`:73-81`) authorize clinician access using the legacy `profiles.assigned_clinician_id` field rather than `clinician_patient_relationships` + `relationship_permissions`. A clinician with a stale assignment can read/write notes, message, and assign to a patient who has **revoked** consent in the new model. *Fix:* consolidate on the consent graph. *Effort: 8–16h.*

**SEC‑M1 (Medium): Unvalidated `requested_permissions` on invite/access‑request creation.**
`access-requests` POST (`:195-210`) and `clinician/invite` POST (`:69-82`) persist arbitrary permission strings (the accept/approve paths whitelist, but defaults/UX may over‑grant). *Fix:* whitelist against the `PermissionKey` set (`lib/permissions.ts`). *Effort: 1h.*

**SEC‑M2 (Medium): Mass assignment in `admin/packages` PATCH.**
`const { id, ...updates } = body; .update(updates)` (`route.ts:46-48`) lets an admin overwrite any package column present in the payload. *Fix:* explicit field allowlist. *Effort: 1h.*

**SEC‑M3 (Medium): `connect/[token]` accept is not atomic / not rate‑limited.**
No `WHERE status='pending'` guard on the accept `UPDATE` and no row lock (`route.ts:172-179`); no rate limit. Concurrent requests could double‑accept an invitation. *Fix:* conditional update + rate limit. *Effort: 2h.*

**SEC‑L1 (Low): `clinician/patients` queries a non‑existent `user_id` column** (`route.ts:85-86`) — should be `patient_id`; last‑assessment data is silently empty (functional bug; low security impact). *Effort: 0.5h.*

**SEC‑L2 (Low): `reports` PDF authorization excludes consented clinicians** (`route.tsx:109-114`) — owner/admin only; a product gap, not an IDOR. *Effort: 1h.*

**Positives:** `submit-assessment` binds `p_patient_id = user.id` in the RPC; `notify-high-risk` enforces `patient_id === user.id`; `packages/*/compute|interpret` scope to `user.id`; `relationships/[id]/permissions` PATCH is patient‑only with a whitelist; `auth/confirm` `next` is allowlisted (open‑redirect‑safe).

---

### A02 — Cryptographic Failures / Data Protection

**SEC‑C2 (Critical): PHI stored unencrypted at rest with unverifiable access control.**
All clinical content (`clinical_notes.body`, `journal_entries.body`, `assessment_responses`, `chat_sessions.messages`, `personality_results.responses`, medication fields, guest DOB/gender) is plaintext `text`/`jsonb`. No `pgcrypto`, column encryption, or tokenization. This is common for Postgres apps, but for mental‑health PHI it requires (a) verifiable strict RLS, (b) encrypted backups with restricted access, and (c) documented risk acceptance — none of which can be confirmed from the repo. *Fix:* confirm Supabase at‑rest encryption + PITR + backup access controls; consider column encryption for the most sensitive free‑text; document in a risk register. *Effort: 8–24h + infra.*

- **HTTPS/HSTS:** enforced (`next.config.js` HSTS `max-age=63072000; includeSubDomains; preload`). ✔
- **Secure headers:** CSP (nonce for scripts), `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. ✔ CSP retains `style-src 'unsafe-inline'` (documented trade‑off; residual style‑injection risk is low). 
- **Cookies:** admin session `httpOnly; secure; sameSite=lax; maxAge=8h` (`admin/login:58-61`). ✔ Supabase session cookies are httpOnly. ✔

---

### A03 — Injection

- **SQL injection:** Not observed. Data access uses the Supabase client / parameterized RPCs; no string‑built SQL in application code. ✔
- **XSS:** `dangerouslySetInnerHTML` is used only for (a) the nonce'd anti‑FOUC theme script (`app/layout.tsx:73`) and (b) static JSON‑LD (`app/page.tsx:355`) — both with controlled, non‑user content. ✔ Nonce CSP further mitigates. React auto‑escaping is otherwise relied upon.
- **Prompt injection (AI):** `ai-chat` validates history roles and caps lengths (`route.ts:96-118`); acceptable, though see SEC‑H2 for the PHI concern.

---

### A04 — Insecure Design

**SEC‑C3 (Critical): Guest submission vs. `patient_id NOT NULL` schema conflict.**
`20260627220200_assessment_submissions_constraints.sql:6-17` sets `assessment_submissions.patient_id NOT NULL` with a comment that "guest submissions use a separate table" — but **no separate guest table exists**, and `submit-assessment-guest/route.ts:296` still inserts `patient_id: null`. If that migration is (or gets) applied to production, **all guest assessments fail** (NOT NULL violation); if it is not applied, the migration history is inconsistent. Either way this is a design/deployment defect on a primary user flow. *Fix:* create a `guest_submissions` table **or** revert the NOT NULL and keep the partial guest design; make it consistent across code + schema. *Effort: 4–8h.* (Also tracked as `database-report.md` DB‑C1 and `bug-report.md`.)

**SEC‑C4 (Critical): Signup profile creation depends on a trigger not in the repo.**
`20260619210813_fix_duplicate_auth_trigger.sql` drops `on_auth_user_created` and redefines `handle_new_user()` but **never `CREATE TRIGGER`s** a replacement (`:6-31`). If the remote DB lacks `trg_on_auth_user_created`, new signups create no `profiles` row → users cannot use the app and role/RLS breaks. Unverifiable from the repo → treat as a launch blocker until confirmed. *Fix:* add an idempotent `CREATE TRIGGER` migration. *Effort: 1h.* (Also `database-report.md` DB‑C2.)

- **Insecure design (positive):** dual‑window rate limits + global circuit breaker + per‑definition caps on guest submission; AI budget guard; safety‑item‑aware high‑risk scoring; anti‑enumeration.

---

### A05 — Security Misconfiguration

**SEC‑H5 (High): Email confirmation disabled.** `supabase/config.toml:` `enable_confirmations = false`. Unverified emails enable fake accounts, spam, and impede account recovery/notification integrity — inappropriate for healthcare. *Fix:* enable email confirmation (and re‑test the `auth/confirm` flow). *Effort: 2h + email deliverability.*

**SEC‑M4 (Medium): `.gitignore` does not ignore plain `.env`.** Only `.env*.local` is ignored (`.gitignore:27`). A developer creating `.env` would commit secrets. Currently only `.env.example` is tracked (no leak today). *Fix:* add `.env` to `.gitignore`. *Effort: 5min.*

**SEC‑M5 (Medium): Inconsistent canonical host.** `robots.ts`/`sitemap.ts` default to `https://app.vwelfare.com` while `auth/confirm` defaults to `https://vwelfare.vercel.app`. Misconfigured `NEXT_PUBLIC_SITE_URL` could send auth redirects to the wrong host. *Fix:* single source of truth. *Effort: 1h.*

**SEC‑L3 (Low): No `images` allowlist / limited `next.config` hardening.** Low impact given local assets.

**Positive:** `poweredByHeader: false`; ESLint runs during build.

---

### A06 — Vulnerable & Outdated Components

**SEC‑H6 (High): Next.js 14.2.35 on the audited branch.** `package.json` pins `next@14.2.35`. Prior reports claim an upgrade to 15.x, but the audited branch is on 14.2.35. Next.js 14.x has had multiple advisories (middleware auth bypass, cache poisoning, DoS). Because **authorization partly depends on `middleware.ts`**, staying current matters. *Fix:* upgrade to a patched Next.js (15.x LTS or latest 14.2 patch) and run `npm audit`. *Effort: 4–8h + regression.* (`npm audit` could not be run here — no `node_modules`.)

- Dependency set is small (`@supabase/*`, `@react-pdf/renderer`, `recharts`, `lucide-react`). Run `npm audit` in CI. `package-lock.json` is committed. ✔

---

### A07 — Identification & Authentication Failures

- **Brute force:** IP + per‑email rate limits on login (5/15min), admin login (5/15min/IP). ✔ **No account lockout** and **no breached‑password/credential‑stuffing check** — *Medium* gap (**SEC‑M6**). *Fix:* add progressive lockout + HaveIBeenPwned range check at signup/reset. *Effort: 4–6h.*
- **Password policy:** relies on Supabase defaults; enforce a strong policy (length ≥ 12, complexity) — *Low* (**SEC‑L4**).
- **MFA for patients/clinicians:** none. For a healthcare platform, offer TOTP MFA at least for clinicians/admins — *Medium* (**SEC‑M7**). *Effort: 8–16h.*
- **Admin auth:** email+password+PIN → HMAC cookie bound to role; PIN uses a unified error to prevent factor enumeration; failures audited. ✔ (But see SEC‑H3 for routes skipping the factor.)
- **JWT/session:** Supabase‑managed, 1h expiry + refresh; httpOnly cookies. ✔

---

### A08 — Software & Data Integrity Failures

**SEC‑C/mobile: Client‑side assessment scoring (mobile).** `mobile/app/(app)/assessments/[id].tsx:115-131` inserts `total_score`, `severity_band`, `high_risk_flag` computed on device directly into `assessment_submissions`. A modified client can falsify clinical severity — unacceptable integrity failure for clinical data. *Fix:* route mobile through `POST /api/submit-assessment` (Bearer). *Effort: 4–6h.* (Critical for mobile; tracked in `bug-report.md`.)

- **Web scoring integrity:** server‑side with strict validation. ✔
- **Supply chain:** committed lockfile; no `postinstall` scripts observed in app deps.

---

### A09 — Security Logging & Monitoring Failures

**SEC‑H8 (High): No centralized logging / alerting / monitoring.** Errors go to `console.*` (Vercel logs only). There is an `audit_log` table (good — admin login failures, submissions, consent, deletion requests are recorded), but **no SIEM/log drain, no alerting on high‑risk events, no anomaly detection, no uptime/error monitoring (Sentry/OTel)**. For PHI/HIPAA‑style operations this is a material gap. *Fix:* add error monitoring (Sentry), a log drain, and alerts on `admin_login_failed`, high‑risk submissions, and rate‑limit trips. *Effort: 8–16h.*

**SEC‑M8 (Medium): PII in logs/audit details.** `user/delete-request` stores `email` in `audit_log.details` (`route.ts:22`); several routes `console.error` full error objects that may include identifiers. Minimize PII in logs. *Effort: 2–3h.*

**SEC‑L5 (Low): Some 500s leak `error.message`** (e.g. `admin/kpis/history:47-49`) — schema/internal detail to clients. *Effort: 1h.*

---

### A10 — SSRF

- No user‑controlled outbound URL fetching. Outbound calls are to fixed hosts (Gemini `generativelanguage.googleapis.com`, Turnstile). ✔ `connect-src` CSP restricts client egress. `img-src https:` allows any HTTPS image origin (low risk). **No SSRF vector found.**

---

## 2. PHI / AI‑Specific Findings

**SEC‑H2 (High): PHI forwarded to Gemini without scrubbing.**
The codebase ships a PHI scrubber (`lib/security/anonymizePHI.ts`) but it is applied **only** in `recommend-assessments` (`route.ts:121`). The high‑volume `ai-chat` route sends the user's raw message (which, in a mental‑health chat, routinely contains names, phone numbers, locations, and medical details) directly to Gemini (`ai-chat/route.ts:124-133`). The clinical‑note AI draft (`clinical-notes` PUT) also forwards patient context and a prior‑note excerpt unscrubbed (`:133-149`). This is a third‑party PHI disclosure under GDPR/HIPAA principles unless a signed DPA/BAA covers Gemini and users consent. *Fix:* apply `scrubPHI()` before every Gemini call; add a data‑processing consent gate; confirm/obtain a DPA with Google. *Effort: 3–6h.*

> The `anonymizePHI` regex scrubber is defence‑in‑depth only (regex name detection is inherently incomplete, as its own header notes). It must be paired with a DPA and consent, not relied on alone.

**SEC‑M9 (Medium): AI synthesis includes `[HIGH RISK]` clinical flags in the Gemini prompt** (`synthesis/route.ts:75-82`) — lower risk (scores/codes, no direct identifiers) but still clinical data to a third party; same DPA/consent requirement applies.

---

## 3. Mobile Security (see mobile detail in `bug-report.md`)

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| M‑C1 | Critical | Auth tokens in unencrypted `AsyncStorage` (SecureStore installed but unused) | `mobile/lib/supabase.ts:7-14` |
| M‑C2 | Critical | Client‑side scoring inserted directly to DB | `mobile/app/(app)/assessments/[id].tsx:115-131` |
| M‑H1 | High | Password‑reset deep link broken (no token exchange) | `mobile/app/reset-password.tsx:25-28` |
| M‑H2 | High | PHI PDFs written unencrypted to device; not wiped on logout | `mobile/app/(app)/results.tsx:70-75` |
| M‑H3 | High | Message can be sent to self when no clinician assigned | `mobile/app/(app)/messages.tsx:71-75` |
| M‑H4 | High | No CAPTCHA / rate limiting on mobile auth (same Supabase project) | `mobile/app/(auth)/*` |
| M‑M1 | Medium | Push token in AsyncStorage; not unregistered on logout | `mobile/lib/notifications.ts:48` |
| M‑M2 | Medium | Emergency numbers US‑only (911/988) for a MENA audience | `mobile/app/emergency.tsx:13-18` |

**Recommendation:** treat the mobile app as **non‑production** until M‑C1/M‑C2/M‑H1/M‑H2 are fixed.

---

## 4. GDPR / HIPAA‑Style Compliance Gaps

- **Right to erasure:** `user/delete-request` only writes an audit row ("scheduled within 30 days") — **no processing pipeline, no admin queue, no actual deletion** (`route.ts:17-25`). *High* (**SEC‑H1**). *Fix:* build a deletion workflow (queue + admin action + verified hard delete/anonymize + confirmation). *Effort: 8–16h.*
- **Right to access/portability:** `user/export-data` implemented (owner‑scoped). ✔ (add rate limit).
- **Consent records:** `consent_documents` + `user_consents` exist; onboarding captures consent. ✔ Ensure AI‑processing consent is added (SEC‑H2).
- **Data retention policy:** none in code; define and enforce.
- **DPA/BAA:** required for Supabase and Google Gemini before processing PHI.
- **Breach logging/monitoring:** see SEC‑H8.

---

## 5. Consolidated Findings Table

| ID | Sev | OWASP | Title | Location |
|---|---|---|---|---|
| SEC‑C1 | Critical | A01/A05 | Unverifiable RLS/Storage + RLS regressions + over‑grants | `supabase/migrations/*`, `20260624190200...`, `20260627220100...` |
| SEC‑C2 | Critical | A02 | Unencrypted PHI at rest, access control unverifiable | schema‑wide |
| SEC‑C3 | Critical | A04 | Guest `patient_id NOT NULL` conflict breaks guest flow | `20260627220200...:6-17`, `submit-assessment-guest:296` |
| SEC‑C4 | Critical | A04 | Signup trigger dropped, not recreated | `20260619210813...:6-31` |
| SEC‑H1 | High | GDPR | Erasure request has no processing pipeline | `user/delete-request:17-25` |
| SEC‑H2 | High | A02/PHI | PHI sent to Gemini unscrubbed | `ai-chat:124-133`, `clinical-notes:133-149` |
| SEC‑H3 | High | A01 | Admin routes skip HMAC factor / lock out superadmin | `admin/clinician-verifications:8-20`, `admin/kpis/[kpiId]/alert:25-27` |
| SEC‑H4 | High | A01 | Admin consent actions without `requireAdmin`/pending guard | `access-requests/[id]:81-123` |
| SEC‑H5 | High | A05 | Email confirmation disabled | `supabase/config.toml` |
| SEC‑H6 | High | A06 | Next.js 14.2.35 (patch/upgrade + `npm audit`) | `package.json:22` |
| SEC‑H7 | High | A01 | Consent bypass via legacy `assigned_clinician_id` | `clinical-notes:26-31`, `notify-message:54-63`, `assignments:73-81` |
| SEC‑H8 | High | A09 | No monitoring/alerting/log drain | platform‑wide |
| SEC‑M1 | Med | A01 | Unvalidated `requested_permissions` | `access-requests:195`, `clinician/invite:69` |
| SEC‑M2 | Med | A01 | Mass assignment in admin/packages PATCH | `admin/packages:46-48` |
| SEC‑M3 | Med | A01 | Non‑atomic / unlimited invite accept | `connect/[token]:172-179` |
| SEC‑M4 | Med | A05 | `.env` not git‑ignored | `.gitignore:27` |
| SEC‑M5 | Med | A05 | Inconsistent canonical host | `robots.ts`/`sitemap.ts` vs `auth/confirm:20` |
| SEC‑M6 | Med | A07 | No lockout / breached‑password check | auth routes |
| SEC‑M7 | Med | A07 | No MFA (esp. clinician/admin) | auth |
| SEC‑M8 | Med | A09 | PII in audit/logs | `user/delete-request:22` |
| SEC‑M9 | Med | PHI | Clinical flags in AI synthesis prompt | `synthesis:75-82` |
| SEC‑L1 | Low | — | `clinician/patients` wrong column | `clinician/patients:85-86` |
| SEC‑L2 | Low | A01 | `reports` excludes consented clinicians | `reports.tsx:109-114` |
| SEC‑L3 | Low | A05 | No image allowlist | `next.config.js` |
| SEC‑L4 | Low | A07 | Weak default password policy | Supabase config |
| SEC‑L5 | Low | A09 | 500s leak `error.message` | `admin/kpis/history:47` |
| SEC‑L6 | Low | A01 | `admin/login` DELETE unauthenticated | `admin/login:69-75` |
| SEC‑L7 | Low | A05 | CSP `style-src 'unsafe-inline'` | `middleware.ts:103` |

---

## 6. Score & Verdict (security only)

**Security Score: 62/100.** The web application's application‑layer controls are strong, but the **inability to verify the database access‑control layer**, **PHI‑to‑AI leakage**, **schema‑drift defects on core flows**, and an **unhardened mobile app** are disqualifying for a production healthcare launch until remediated.

**Security verdict: ❌ DO NOT GO LIVE** until SEC‑C1–C4, SEC‑H1, SEC‑H2, SEC‑H3, and the mobile Criticals are resolved (or mobile is withheld). See `implementation-roadmap.md` for sequencing.
