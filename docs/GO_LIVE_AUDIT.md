# Go-Live Audit — vWelfare Platform (Full Report)

**Date:** 2026-09-10
**Auditor role:** Senior Software Architect · Cybersecurity Auditor · QA Lead · SEO Specialist · DevOps · Accessibility Auditor · Product Manager · Release Manager
**Subject:** Bilingual (AR/EN, RTL) mental-health psychometric assessment platform — Next.js on Vercel, Supabase (Postgres 17, `eu-central-1`), Gemini AI, custom auth.
**Method:** Evidence-based review of the codebase, the live Supabase project (`wyzezyctpvlohuuhzyof` / `vwelfare-platform`), Supabase security & performance advisories, and production configuration. Standards referenced: OWASP Top 10, GDPR, HIPAA-inspired safeguards, SOC 2 principles, WCAG 2.2.

> ### Measurement honesty
> Outbound access to the live app (`app.vwelfare.com`) is blocked from the audit environment, and no browser/load harness is available here. The following were therefore **not independently measured** and are assessed from code/config only, marked *(not measured)* wherever they appear: live **Core Web Vitals / Lighthouse**, **load tests (10→500 users)**, **cross-browser/device runs**, **screenshots**, and live **screen-reader/contrast** passes. No scores were invented for un-measured items.

---

# FINAL DECISION

## ⚠️ GO LIVE WITH CONDITIONS

**Overall Readiness: 84/100.** The platform has a genuinely strong security and authorization foundation for a healthcare product, comprehensive functionality, and the required legal/compliance surfaces. Launch is safe once three conditions are met: **keep paid packages disabled and hard-gate `/checkout` until real Stripe is integrated**, **enable leaked-password protection**, and **confirm backups/PITR**. For a free launch (packages off), it is close to a clean GO.

---

# PHASE 1 — SECURITY AUDIT

### Authentication
Login, registration, forgot-password, reset-password, and email-confirm flows are all present (`app/(auth)/*`, `app/auth/confirm/route.ts`). Sessions use Supabase Auth (httpOnly cookies via `@supabase/ssr` in `middleware.ts` / `lib/supabase/server.ts`), so no JWT is exposed to JS. **Brute-force / credential-stuffing protection:** per-identifier rate limiting (`checkRateLimit`) on login and signup limits, plus **Cloudflare Turnstile CAPTCHA** on login and register. Account-enumeration surface is limited (generic auth errors; forgot-password does not confirm address existence in the UI path).
- **Finding S-1 (Medium):** **Leaked-password protection disabled** — Supabase advisor `auth_leaked_password_protection`. Enable the HaveIBeenPwned check. *(5 min)*

### Authorization
- Cross-user data access is blocked by **RLS at the database** (defense in depth beyond the API). Verified: `submit_assessment_atomic` rejects `auth.uid() <> p_patient_id` (no submission IDOR); clinician access to PHI requires an **active relationship + granted permission** (`has_clinician_access → check_relationship_permission`); patients read only their own rows (`cpr_parties_read`, per-table owner policies).
- **Admin routes**: 37 API route files call `requireAdmin()`; sensitive mutations additionally require `role === 'superadmin'`. Role escalation via the API is not exposed (roles are set server-side; `harden_signup_role_assignment` + `harden_role_governance` migrations lock signup role assignment).
- A dedicated **IDOR test suite** exists (`__tests__/security/idor.test.ts`, `phi.test.ts`, `rls.test.ts`, `permission-validation.test.ts`).

### Supabase security
- **RLS coverage is complete** — the security advisor reports **no `rls_disabled_in_public` findings** on any table. This is the single most important control for a PHI platform and it passes.
- **No secret exposure:** `SUPABASE_SERVICE_ROLE_KEY` is used only in server modules (`lib/supabase/admin.ts`, `lib/guest-claim.ts`); every `NEXT_PUBLIC_*` variable is a legitimately public value (anon key, Turnstile site key, Stripe **publishable** key). No private key is `NEXT_PUBLIC_`.
- **Finding S-2 (Low):** 4 `SECURITY DEFINER` functions are `EXECUTE`-able by `authenticated` (advisor `authenticated_security_definer_function_executable`). Two (`submit_assessment_atomic`, `get_my_role`) are verified safe; `has_clinician_access` / `check_relationship_permission` are boolean helpers usable as a minor existence-oracle. Consider `REVOKE EXECUTE … FROM authenticated`. *(30 min)*

### OWASP Top 10
| Category | Status | Evidence |
|---|---|---|
| A01 Broken Access Control | ✅ Strong | RLS everywhere; admin gating; IDOR guard + tests |
| A02 Cryptographic Failures | ✅ | HTTPS/HSTS; Supabase-managed hashing; leaked-pw check off (S-1) |
| A03 Injection | ✅ | Parameterized Supabase queries / RPCs; no raw string SQL in app |
| A04 Insecure Design | ✅ | Server-authoritative pricing; consent + relationship models |
| A05 Security Misconfiguration | ✅ | Full security headers; `poweredByHeader:false` |
| A06 Vulnerable Components | ⚠️ *(not scanned here)* | Run `npm audit` / Dependabot before launch |
| A07 Auth Failures | ✅ | Rate-limit + CAPTCHA; S-1 pending |
| A08 Data Integrity | ✅ | Atomic submission RPC; signature-verified webhooks required when Stripe goes live |
| A09 Logging Failures | ✅ | Immutable `audit_log`; broad audit coverage |
| A10 SSRF | ✅ | No user-controlled server-side fetch surface found |

### Data protection & headers
Security headers are complete (`next.config.js` + `middleware.ts`): **HSTS**, **CSP with per-request nonce**, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` locking camera/mic/geo. PDF export is server-side and access-checked (`app/api/export/pdf/[submissionId]`). `robots.ts` disallows all PHI routes (see Phase 4). An **AI-PHI-scrub** test guards against leaking PHI to the Gemini path (`__tests__/security/ai-phi-scrub.test.ts`).

### API security
77 API routes; 37 rate-limited, 37 admin-gated. Spot-reviewed routes validate role and input and return generic errors (no stack traces / schema leakage). **Fixed this cycle:** promo validation no longer calls a superadmin-only route (broken access control → customer endpoint); clinician-linking RLS/service-role bug fixed.

### Security score
**Security: 88/100** — Critical: 0 · High: 0 · Medium: 1 (S-1) · Low: 1 (S-2). Deduction reflects S-1 plus the un-run dependency scan (A06).

---

# PHASE 2 — FUNCTIONAL AUDIT

**Surface:** 66 pages, 77 API routes covering registration/auth, the assessment engine, mood/journal/ADHD tools, an AI chat, clinician↔patient linking, a full admin/superadmin control panel (analytics, KPIs, users, packages, promo, revenue, audit, verifications), PDF export, and guest assessments.

- **Registration/auth:** complete (register → email confirm → login → forgot/reset → logout); CAPTCHA + rate limits.
- **Assessment engine:** 39 active definitions, 742 items; submission is transactional (`submit_assessment_atomic`) with responses written atomically; guest submissions supported (`submit-assessment-guest` + `claim-guest-results`); IPIP120 scoring-band gap already patched. Interrupted-session/refresh handling exists via drafts (`assessment_drafts`, `InProgressAssessments`).
- **User dashboard:** results history, mood/journal, profile, data export (`user/export-data`) and deletion request (`user/delete-request`).
- **Admin dashboard:** analytics via materialized views + KPI/widget endpoints. **Known operational gap:** the matview auto-refresh cron (`admin_dashboard_view_refresh_jobs`) was never applied to prod (pg_cron) — admin stats can be stale until refreshed. *(Medium; flagged previously.)*
- **Error handling / mobile / browser:** graceful error states and localized messages observed in code; **live cross-browser/device runs not performed** *(not measured)*.

### Functionality score
**Functionality: 85/100** — Critical: 0 · High: 0 · Medium: 2 (mocked payments UI reachable via direct route; admin matview staleness) · Low: a few polish items. Core clinical flows verified working (assessments, linking, promo, exports).

---

# PHASE 3 — PERFORMANCE AUDIT

- **Core Web Vitals (LCP/CLS/INP):** *(not measured)* — needs Lighthouse/CrUX against production.
- **Load testing (10→500 users):** *(not measured)* — needs k6/Artillery.
- **Database performance (Supabase advisor, measured):** `unindexed_foreign_keys` ×17, `auth_rls_initplan` ×51 (wrap `auth.uid()` as `(select auth.uid())`), `duplicate_index` ×19, `unused_index` ×71, `multiple_permissive_policies` ×263, `auth_db_connections_absolute` ×1. All are **scale-hygiene**, not launch-gating at current single-digit-user load.
- **Vercel/Next optimization:** `next/image`, route-level code-splitting (`lazy()` for Stripe form), `poweredByHeader:false`. Bundle-size budget not independently profiled *(not measured)*.

### Performance score
**Performance: 72/100** *(code + DB-advisor evidence; live CWV/load not measured).* No launch blocker; address DB hygiene (P-1) before scaling.

---

# PHASE 4 — SEO AUDIT

- **robots.ts:** exemplary for a health app — **disallows every PHI/authenticated route** (`/dashboard`, `/assessments`, `/profile`, `/checkout`, `/api/`, `/x/control`, `/patient/`, `/clinician/`, …) and allows only public marketing/legal pages. Prevents indexing of sensitive surfaces.
- **sitemap.ts:** public + learn pages with priorities and **hreflang alternates** (`en` / `ar?lang=ar`).
- **Metadata:** 25 metadata exports; `SITE_URL` canonical base. Open Graph/Twitter presence should be spot-confirmed per key page.
- **International SEO:** `<html lang dir>` set (RTL for Arabic); hreflang present.
- **Rankings / indexation status:** *(not measured)* — verify in Search Console post-launch.

### SEO score
**SEO: 82/100** — strong technical foundation; verify OG/Twitter coverage and register the sitemap in Search Console.

---

# PHASE 5 — ACCESSIBILITY AUDIT (WCAG 2.2)

**From code:** semantic landmarks, `role`/`aria-*` on interactive components (tabs, alerts, dialogs), form `<label htmlFor>` associations, `lang`/`dir` on `<html>` with full RTL, focus-visible styling, and localized alt/aria text. These are good baselines.
**Not verified here** *(not measured)*: live screen-reader traversal, color-contrast ratios against the actual palette, and keyboard-trap edge cases. A manual axe-core + NVDA/VoiceOver pass is recommended before a disability-facing claim.

### Accessibility score
**Accessibility: 80/100** *(markup-level; live AT/contrast audit outstanding).*

---

# PHASE 6 — HEALTHCARE COMPLIANCE REVIEW

- **Informed consent:** tracked (`consent_given_at`, `consent_documents`, `user_consents`); referenced in submission/clinical-note flows.
- **Privacy & terms:** `app/privacy`, `app/terms` present.
- **Crisis / emergency info:** `app/emergency` page + crisis banner on the dashboard; high-risk escalation path (`notify-high-risk`).
- **Data-subject rights (GDPR):** self-service **data export** (`user/export-data`) and **erasure request** (`user/delete-request`); superadmin hard-delete with audit.
- **Data residency:** `eu-central-1` (EU).
- **Gaps / conditions:** confirm a written **data-retention policy** and **breach-notification** process; confirm **BAA/DPA** posture with Supabase/Vercel/Google if operating under HIPAA-like obligations; verify **backups/PITR** (below). Disclaimers on results pages present (`disclaimer_en/ar` on packages).

### Compliance score
**Compliance: 82/100** — surfaces in place; deductions for unconfirmed retention policy, DR, and processor agreements.

---

# PHASE 7 — USER EXPERIENCE AUDIT

Bilingual AR/EN with true RTL; consistent design tokens/components; onboarding via profile-completion gating before assessments; clear assignment banners; localized error/empty states; copy-to-clipboard and status feedback in flows (e.g. clinician connect). Friction points: mocked-payment path could confuse if reached; admin stats may look stale (matview cron). Live usability testing *(not measured)*.

### UX score
**UX: 84/100.**

---

# PHASE 8 — CODE QUALITY REVIEW

- **Architecture:** clear separation of user-scoped (`lib/supabase/server`, `client`) vs service-role (`lib/supabase/admin`) clients; **server-authoritative pricing** (`lib/billing/pricing.ts`) never trusts client amounts; typed API routes; RLS as the authorization source of truth.
- **Testing:** a focused **security test suite** (`__tests__/security/`: idor, phi, rls, payments, permission-contract, redirect-allowlist, ai-phi-scrub, admin-session) plus an e2e clinical-workflow spec and unit tests — unusually strong for a product at this stage.
- **Tech debt:** payments stubbed (intentional); some field-name drift already fixed (promo); migration history reconciled to prod this cycle.

### Code quality score
**Code Quality: 85/100.**

---

# PHASE 9 — RELEASE-READINESS CHECKLIST

| Item | Status |
|---|---|
| Security (headers, secrets, OWASP baseline) | ✅ Pass |
| Authentication | ✅ Pass |
| Authorization / RLS | ✅ Pass |
| Database (schema, migrations reconciled) | ✅ Pass |
| APIs (authZ, validation, rate limiting) | ✅ Pass |
| Assessments (atomic, IDOR-guarded) | ✅ Pass |
| Exports (PDF, data export) | ✅ Pass |
| Payments | ⚠️ Conditional — mock only; keep packages off + hard-gate `/checkout` (B1) |
| Legal / consent / crisis pages | ✅ Pass |
| Leaked-password protection | ❌ Enable (S-1) |
| Backups / Disaster Recovery | ⚠️ Verify PITR (C2) |
| Dependency scan (`npm audit`) | ⚠️ Run before launch (A06) |
| SEO (robots/sitemap/hreflang) | ✅ Pass |
| Accessibility | ⚠️ Markup-level only; AT pass pending |
| Performance / load | ⚠️ Not live-measured |
| Monitoring / alerting | ⚠️ Verify (error tracking + uptime) |
| Admin analytics freshness (matview cron) | ⚠️ Not scheduled on prod |

---

# PHASE 10 — EXECUTIVE REPORT

### Executive summary
vWelfare is a security-first, bilingual mental-health assessment platform that is **substantially launch-ready**. Its authorization model is enforced in the database (row-level security with no gaps), it ships complete security headers, leaks no secrets, keeps data in the EU, and provides the legal, consent, crisis, and GDPR data-subject surfaces a health product requires — backed by an unusually strong security test suite. The **remaining launch risk is concentrated in one non-core, currently-hidden feature (payments, which is mocked)** and in a few operational confirmations (backups, monitoring, a disabled password check). None of these touch the core clinical product. Recommendation: **GO LIVE WITH CONDITIONS** — ship the free product now with packages disabled and the three conditions closed; integrate real Stripe before enabling paid tiers.

### Risk matrix
| Risk | Severity | Probability | Impact | Recommendation |
|---|---|---|---|---|
| Mock payment reachable via `/checkout` | High | Low (nav hidden) | Users "buy" nothing; trust/finance | B1 — hard-gate routes; keep `show_packages=false` |
| Leaked-password protection off | Medium | Medium | Weak creds on a health app | S-1 — enable HIBP check |
| Backups/PITR unconfirmed | High | Low | PHI data loss, unrecoverable | C2 — verify + test restore |
| Dependency vulnerabilities | Medium | Unknown | Varies | Run `npm audit`/Dependabot |
| DB perf at scale | Medium | Low now | Slow queries as users grow | P-1 — indexes + RLS init-plan |
| Admin stats staleness | Low | Medium | Misleading dashboards | Schedule matview refresh |
| No live CWV/AT/load data | Medium | — | Unknown UX/perf/a11y at edges | Run Lighthouse/axe/k6 pre-marketing |

### Launch blockers (must fix before the relevant surface is public)
1. **B1 — Payments mocked.** Keep `show_packages=false` **and** hard-gate `/checkout` + `/packages` server-side until real, signature-verified Stripe is integrated. *(1–2 h to gate; 1–3 d for full Stripe.)*
2. **S-1 — Enable leaked-password protection.** *(5 min.)*
3. **C2 — Confirm daily backups + PITR and a tested restore.** *(15 min–1 h.)*

### 30-day post-launch risks (acceptable to defer)
- **P-1** DB performance hygiene: 17 unindexed FKs, 51 RLS init-plan wraps, 19 duplicate + 71 unused indexes, 263 multiple-permissive policies. *(1–2 d.)*
- **S-2** revoke `EXECUTE` on relationship helper functions from `authenticated`. *(30 min.)*
- Schedule admin **matview refresh** (pg_cron or external). *(2–4 h.)*
- Run **live CWV/load/cross-browser/axe** validation before a marketing push. *(1–2 d.)*
- Stand up **error tracking + uptime monitoring** if not already. *(2–4 h.)*

### Final scores
| Area | Score |
|---|---|
| Security | 88/100 |
| Functionality | 85/100 |
| Performance | 72/100 *(CWV/load not measured)* |
| SEO | 82/100 |
| Accessibility | 80/100 *(markup-level)* |
| Compliance | 82/100 |
| UX | 84/100 |
| Code Quality | 85/100 |
| **Overall Readiness** | **84/100** |

---

# DELIVERABLES INDEX
This single document serves as the **Executive Report**, **Technical/Security/SEO/Accessibility Findings**, **Prioritized Remediation Plan** (blockers → conditions → 30-day, each with effort), **Go-Live Checklist** (Phase 9), and **Critical Bugs List** (B1; the promo, linking, and migration-drift bugs already fixed this cycle). Screenshots and live-metric appendices are intentionally omitted — see the measurement-honesty note; those require tooling not available in the audit environment.

## Recommended remediation order (with effort)
1. Enable leaked-password protection — **5 min** (S-1)
2. Verify/enable backups + PITR, test a restore — **15 min–1 h** (C2)
3. Hard-gate `/checkout` + `/packages` while packages are off — **1–2 h** (B1a)
4. `npm audit` + patch — **1–3 h** (A06)
5. Stand up error/uptime monitoring — **2–4 h**
6. Schedule admin matview refresh — **2–4 h**
7. DB perf hygiene (indexes, RLS init-plan) — **1–2 d** (P-1)
8. Full Stripe integration before enabling paid tiers — **1–3 d** (B1b)
9. Live CWV / load / cross-browser / axe validation — **1–2 d**
