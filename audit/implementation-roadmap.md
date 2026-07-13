# V Welfare — Implementation Roadmap & Prioritized Issue List

**Audit date:** 2026-07-13
**Owner roles:** Lead Architect · Full‑Stack · Security · QA · UX · A11y · DBA · DevOps
**Companion reports:** `architecture-report.md`, `security-report.md`, `database-report.md`, `performance-report.md`, `ui-report.md`, `accessibility-report.md`, `bug-report.md`

> **Effort estimates are engineering hours for a single experienced full‑stack engineer** and exclude review, QA, and infra provisioning unless noted. They are sizing aids, not calendar commitments.

---

## 0. Final Verdict

### ❌ DO NOT GO LIVE (for a production, regulated mental‑health launch) — yet.

The web application is well‑engineered at the application layer, but the platform is **not launch‑ready** because of a small number of **systemic, evidence‑level and data‑integrity issues**:

1. **Database migration history is untrustworthy** (~71 empty stubs) → RLS/Storage policies protecting PHI are **unverifiable from the repo**, and recent migrations introduce **RLS regressions and over‑grants**.
2. **Core flows have schema conflicts** (guest `patient_id NOT NULL`; signup trigger not recreated).
3. **PHI is sent to a third‑party AI without scrubbing/DPA/consent.**
4. **Mobile app is not production‑ready** (client scoring, unencrypted tokens, broken reset).
5. **GDPR erasure is non‑functional; no monitoring/alerting; no payments subsystem** (if payments are in launch scope).

A **limited, invite‑only web beta** could be acceptable *after* the P0 list below and confirmation of the database/Storage evidence gaps. The **mobile app should be withheld** until its Criticals are fixed. Re‑audit after P0.

**Overall Readiness: 63/100.**

| Dimension | Score |
|---|---|
| Security | 62 |
| Functionality | 68 |
| Performance | 70 |
| Accessibility | 58 |
| UI/UX | 66 |
| Database | 55 |
| Compliance (GDPR/HIPAA‑style) | 50 |
| Code Quality | 68 |
| **Overall** | **63** |

---

## 1. Workflow Audit Results

### Clinician workflow
| Step | Status | Notes |
|---|---|---|
| Registration | ✔ | role=clinician via metadata |
| Email verification | ❌ | disabled globally (SEC‑H5) |
| Profile completion | ✔ | |
| License/certificate upload | ⚠ | works, but Storage bucket privacy **unverifiable** from repo |
| Admin approval | ⚠ | `admin/clinician-verifications` lacks HMAC factor (SEC‑H3) |
| Dashboard / patients | ⚠ | `clinician/patients` wrong column (BUG‑H1); broad RLS reads (DB‑H2) |
| Appointments/assignments | ⚠ | authorize on legacy field (SEC‑H7) |
| Assessments | ✔ (web) | |
| Messaging | ⚠ | consent bypass via legacy field (SEC‑H7) |
| Clinical notes (+AI) | ⚠ | RLS regression exposes private notes (DB‑H1); AI draft unscrubbed (SEC‑H2) |
| Notifications | ✔ | |
| Reports | ⚠ | consented clinicians can't export PDFs (SEC‑L2) |

### Patient workflow
| Step | Status | Notes |
|---|---|---|
| Signup | ⚠ | trigger risk (BUG‑C2), no email verify |
| Verification | ❌ | email not verified |
| Profile / onboarding | ✔ | consent + health/safety captured |
| Assessments | ✔ (web) / ❌ (mobile) | mobile client scoring (BUG‑C3) |
| Results / history / synthesis | ✔ | crisis CTA missing on high‑risk results (UI‑C1) |
| Appointments | ⚠ | assignment model only |
| Payments | ❌ | not implemented |
| Messaging | ⚠ | consent model gaps |
| Packages | ⚠ | guest flow schema conflict (BUG‑C1) |
| GDPR export | ✔ | (add rate limit) |
| GDPR delete | ❌ | no processing pipeline (BUG‑H4) |

### Admin workflow
| Feature | Status | Notes |
|---|---|---|
| Login (email+password+PIN+HMAC) | ✔ | strong, but 2 routes skip HMAC (SEC‑H3) |
| Dashboard / KPIs / analytics | ⚠ | materialized views broken (BUG‑H2); RPC over‑grants (DB‑C3) |
| Users / roles | ✔ | superadmin‑gated |
| Clinician verifications | ⚠ | weaker auth gate |
| Approvals / consent | ⚠ | `access-requests/[id]` no HMAC/pending guard (SEC‑H4) |
| Notifications | ✔ | |
| Assessments governance | ✔ | governance trigger |
| Packages | ⚠ | PATCH mass assignment (SEC‑M2) |
| Payments | ❌ | n/a (no payments) |
| Exports / Research | ⚠ | anonymized, but demographics view over‑granted (DB‑H4) |
| Settings / flags | ✔ | |

### Research workflow
De‑identified exports exist (`admin/export`, `admin/research`) with anonymization. **Risk:** the `admin_demographics_summary` materialized view remains granted to all authenticated users (DB‑H4), undermining de‑identification at the DB layer. Fix before enabling research access.

---

## 2. Prioritized Issue List

Each issue: **Location · Problem · Why it matters · Risk · Recommended solution · Effort**.

### 🔴 CRITICAL (launch blockers)

**C‑1 · Untrustworthy migrations + unverifiable RLS/Storage**
- *Location:* `supabase/migrations/*` (~71 stubs), `config.toml`
- *Problem:* Production schema/RLS/Storage policies cannot be reproduced or reviewed from the repo.
- *Why it matters:* RLS/Storage are the primary PHI controls; DR/branch/preview deploys will diverge.
- *Risk:* PHI exposure, failed DR, non‑reproducible environments.
- *Fix:* Generate a real `pg_dump --schema-only` baseline; commit Storage bucket policies; verify RLS on all PHI tables and bucket privacy.
- *Effort:* 16–40h.

**C‑2 · RLS regressions (private notes / message insert)**
- *Location:* `20260624190200_clinical_notes_and_messages_rls.sql:8-20,47-54`
- *Problem:* Additive permissive policies let patients read `is_private` notes and clinicians message any patient.
- *Why it matters:* Direct PHI confidentiality breach.
- *Risk:* HIPAA/GDPR breach.
- *Fix:* Drop the weak policies; restore assignment + `is_private` checks on the consent graph.
- *Effort:* 4–6h.

**C‑3 · Admin RPC/matview over‑grants + broken view SQL**
- *Location:* `20260627220100_...:235-243`, `20260627220000_...:52-88,151-155`, `20260628071704_...`
- *Problem:* Dashboard RPCs/views granted to all authenticated users, no role check; views reference non‑existent columns; one view not revoked.
- *Why it matters:* Any patient could read aggregate PHI / enumerate risk profiles; admin analytics broken.
- *Risk:* Horizontal PHI disclosure; broken admin.
- *Fix:* REVOKE from authenticated; SECURITY DEFINER + admin gate; fix view columns; revoke `admin_demographics_summary`.
- *Effort:* 8–14h.

**C‑4 · Guest submission schema conflict**
- *Location:* `20260627220200_...:16-17` vs `submit-assessment-guest/route.ts:296`
- *Problem:* `patient_id NOT NULL` breaks the guest insert (`patient_id: null`).
- *Why it matters:* Primary funnel (anonymous screening) breaks.
- *Risk:* Outage of guest assessments; data inconsistency.
- *Fix:* Add a `guest_submissions` table (preferred) or revert NOT NULL; align code + schema.
- *Effort:* 4–8h.

**C‑5 · Signup trigger not recreated**
- *Location:* `20260619210813_fix_duplicate_auth_trigger.sql:6-31`
- *Problem:* Trigger dropped, replacement not created in repo.
- *Why it matters:* New users may get no `profiles` row → cannot use the app.
- *Risk:* Signup outage.
- *Fix:* Idempotent `CREATE TRIGGER on_auth_user_created …`; verify against prod.
- *Effort:* 1h.

**C‑6 · PHI sent to Gemini unscrubbed**
- *Location:* `ai-chat/route.ts:124-133`, `clinical-notes/route.ts:133-149`
- *Problem:* Raw messages/clinical context sent to a third‑party AI; scrubber unused here.
- *Why it matters:* Third‑party PHI disclosure without DPA/consent.
- *Risk:* GDPR/HIPAA violation.
- *Fix:* Apply `scrubPHI()` before every Gemini call; add AI‑processing consent; obtain DPA with Google.
- *Effort:* 3–6h (+ legal).

**C‑7 (mobile) · Client‑side scoring + unencrypted tokens + broken reset**
- *Location:* `mobile/app/(app)/assessments/[id].tsx:115-131`, `mobile/lib/supabase.ts:7-14`, `mobile/app/reset-password.tsx`
- *Problem:* Tamperable clinical scoring; tokens in AsyncStorage; reset deep link broken.
- *Why it matters:* Clinical integrity + account security.
- *Risk:* Falsified severity; session theft; locked‑out users.
- *Fix:* Route mobile through `/api/submit-assessment`; SecureStore session adapter; implement deep‑link token exchange. **Or withhold mobile from launch.**
- *Effort:* 12–20h.

### 🟠 HIGH

**H‑1 · GDPR erasure non‑functional** — `user/delete-request:17-25` · only logs an audit row · legal + trust · build deletion queue + admin action + verified hard‑delete/anonymize + confirmation · **8–16h.**

**H‑2 · Admin routes skip HMAC / lock out superadmin** — `admin/clinician-verifications`, `admin/kpis/[kpiId]/alert` · second factor bypass · unify on `requireAdmin()` · **2–3h.**

**H‑3 · Admin consent actions without `requireAdmin`/pending guard** — `access-requests/[id]:81-123` · consent tampering · add factor + `status='pending'` guard · **2h.**

**H‑4 · Consent bypass via legacy `assigned_clinician_id`** — `clinical-notes`, `notify-message`, `assignments` · access after consent revoked · consolidate on `clinician_patient_relationships` + permissions · **8–16h.**

**H‑5 · Email verification disabled** — `config.toml` · fake accounts/enumeration · enable confirmations + retest `auth/confirm` · **2h + deliverability.**

**H‑6 · Next.js 14.2.35 + no `npm audit` in CI** — `package.json:22` · known middleware/CVE risk · upgrade + `npm audit` in CI · **4–8h.**

**H‑7 · No monitoring/alerting/log drain** — platform‑wide · undetected breaches/outages · add Sentry + log drain + alerts on high‑risk/admin‑fail/rate‑limit · **8–16h.**

**H‑8 · Broad clinician RLS reads** — baseline `patient_prof_clinician` etc. · any clinician reads all patients · scope to consented patients · **6–12h.**

**H‑9 · Crisis UX gaps** — `crisis-banner.tsx:55`, `assessment-content.tsx:216-220` · broken UAE dial link; no crisis CTA on high‑risk results · fix numbers + mount crisis resources on results + `role="alert"` · **5–8h.**

**H‑10 · ADHD tool English‑only / not RTL** — `adhd-zone-checker.tsx` · Arabic users excluded · i18n + logical properties · **8–12h.**

**H‑11 · No route loading/error boundaries** — app‑wide · perceived perf + no recovery · add `loading.tsx`/segment `error.tsx` · **6–8h.**

**H‑12 · `clinician/patients` wrong column** — `:85-86` · empty last‑assessment data · use `patient_id` · **0.5h.**

**H‑13 · Duplicate indexes / broken+un‑refreshed matviews / rate‑limit growth** — see `performance-report.md` PERF‑H1/H2, DB‑M6 · write amplification + stale/broken analytics + bloat · dedupe indexes, fix+refresh views, ship prune cron · **14–24h.**

**H‑14 · Payments subsystem absent (if in scope)** — no code · cannot transact · design + build provider integration, checkout, webhooks, entitlements, reconciliation, tax · **large; scope separately.**

### 🟡 MEDIUM

- **M‑1** Unvalidated `requested_permissions` (`access-requests`, `clinician/invite`) — whitelist keys — 1h.
- **M‑2** Mass assignment `admin/packages` PATCH — field allowlist — 1h.
- **M‑3** `connect/[token]` accept non‑atomic + unlimited — conditional update + rate limit — 2h.
- **M‑4** No account lockout / breached‑password check — progressive lockout + HIBP — 4–6h.
- **M‑5** No MFA (esp. clinician/admin) — add TOTP — 8–16h.
- **M‑6** PII in logs/audit `details` — minimize — 2–3h.
- **M‑7** Guest audit inserts fail (actor_id NOT NULL) — make nullable — 1h.
- **M‑8** `submit_assessment_atomic` doesn't validate item↔definition — validate in fn — 2–3h.
- **M‑9** Language preference not synced to cookie — set cookie on save — 2h.
- **M‑10** Responsive admin/clinician tables — card/scroll — 6–10h.
- **M‑11** Dark‑mode hardcoded gradients / two UI dialects — tokens — 4–6h.
- **M‑12** Form label association + `role="alert"` (profile/mood/login) — 4–6h.
- **M‑13** Assessment answer controls need radio semantics — 2–3h.
- **M‑14** `count(exact)` scans on hot paths — partial indexes/planned counts — 3–6h.
- **M‑15** RLS `auth.uid()` not wrapped — subselect — 2–4h.
- **M‑16** `.env` not gitignored; inconsistent canonical host — 0.5h.
- **M‑17** `profiles.role` no CHECK; `package_sessions` FK target — 2h.
- **M‑18** AI synthesis prompt includes clinical flags (DPA/consent) — 1h + legal.
- **M‑19** Register terms real checkbox (also a11y C‑1) — 1h.

### 🟢 LOW

- **L‑1** Two rate‑limit implementations (remove unused Redis path) — 1h.
- **L‑2** Duplicate/pointer migrations cleanup — 2h.
- **L‑3** `admin/login` DELETE unauthenticated — 0.5h.
- **L‑4** 500s leak `error.message` — 1h.
- **L‑5** Touch targets < 44px; skip‑link contrast; admin skip link — 3h.
- **L‑6** Code‑split recharts; `next/image` sizing — 3–5h.
- **L‑7** Mobile polish: privacy link, emergency numbers, push unregister, single locale provider — 6–10h.
- **L‑8** Add `typecheck` script + expand tests + CI (lint/typecheck/test/audit) — 6–10h.
- **L‑9** Password policy strengthening — 2h.
- **L‑10** Contrast fixes for muted text/badges — 4h.

---

## 3. Recommended Fix Sequence (one issue at a time, per your Task 11)

Fix, then for each: explain what/why, run `npm run lint`, run typecheck, run tests, confirm no regressions, commit only related changes.

**Phase 0 — Evidence & schema truth (unblocks everything):** C‑5 → C‑4 → C‑1 (baseline + Storage verification).
**Phase 1 — PHI confidentiality:** C‑2 → C‑3 → C‑6 → H‑8.
**Phase 2 — Auth/consent integrity:** H‑2 → H‑3 → H‑4 → H‑12 → M‑1 → M‑2 → M‑3.
**Phase 3 — Compliance & ops:** H‑1 (erasure) → H‑5 (email verify) → H‑7 (monitoring) → H‑6 (Next.js upgrade) → M‑18.
**Phase 4 — Safety & UX for a mental‑health product:** H‑9 (crisis) → H‑11 (loading/error) → H‑10 (ADHD i18n) → M‑12/M‑13/M‑19 (a11y).
**Phase 5 — Performance & data hygiene:** H‑13 → M‑14 → M‑15 → M‑7 → M‑8 → M‑17.
**Phase 6 — Mobile:** C‑7 and mobile mediums (or defer app to a later release).
**Phase 7 — Polish/tech‑debt:** remaining Mediums/Lows; CI + tests (L‑8).

**Payments (H‑14):** if in launch scope, this is a **separate workstream** (provider selection, PCI scope, checkout, webhooks, entitlements, refunds, invoicing, tax) and must be planned independently.

---

## 4. Release Readiness Checklist

| Gate | Status |
|---|---|
| Security (app layer) | ⚠ strong app controls, blocked by DB/PHI items |
| Authentication | ⚠ no email verify / MFA / lockout |
| Authorization | ⚠ HMAC gaps + consent bypass |
| Database | ❌ untrustworthy migrations, RLS regressions |
| APIs | ⚠ mostly solid; a few gaps |
| Assessments (web) | ✔ (guest flow conflict pending) |
| Assessments (mobile) | ❌ client scoring |
| Exports / PDF | ✔ (owner/admin gated) |
| Mobile | ❌ not production‑ready |
| SEO | ✔ robots/sitemap/metadata present (fix canonical host) |
| Accessibility | ❌ not WCAG 2.2 AA yet |
| Analytics (admin) | ❌ broken materialized views |
| Monitoring | ❌ none |
| Backups / DR | ⚠ plan exists; confirm PITR + backup access |
| Disaster Recovery | ⚠ RPO 4h/RTO 8h documented; unreproducible schema undermines it |
| Payments | ❌ not built (if in scope) |
| Storage policies | ❌ unverifiable from repo |

---

## 5. Next Step

**Awaiting your approval** (per Task 11) before making any code changes. On approval, I will implement **one issue at a time** in the sequence above (starting with Phase 0: C‑5 → C‑4 → C‑1), with lint/typecheck/tests and an isolated commit per fix. Tell me if you want to (a) start with the recommended Phase 0 order, (b) reprioritize, (c) restrict scope to web‑only (defer mobile/payments), or (d) treat any listed item as out of scope.
