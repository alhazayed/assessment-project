# Go-Live Audit — vWelfare Platform

**Date:** 2026-09-10
**Scope:** Launch-blocker–focused audit (security, authorization, data protection, payments, compliance, DR) with a final go/no-go verdict.
**Method:** Evidence-based review of the codebase, the live Supabase project (`wyzezyctpvlohuuhzyof`, `vwelfare-platform`, region `eu-central-1`, Postgres 17), Supabase security/performance advisories, and production configuration.

> **Not independently measured from the audit environment** (egress to the live app is blocked by policy, and no browser/load harness is available here): live Core Web Vitals / Lighthouse, real 10→500-user load tests, cross-browser/device runs, and screenshots. Items depending on those are assessed from code/config and marked accordingly — no scores were invented for them.

---

## Final decision

## ⚠️ GO LIVE WITH CONDITIONS

The platform is architecturally sound and demonstrably secure for a healthcare application: row-level security is comprehensive (no public table has RLS disabled), security headers are complete, no secrets leak to the client, the auth flow is hardened (rate-limiting + CAPTCHA + atomic, IDOR-guarded submissions), data resides in the EU, and the required legal/crisis pages exist. It is safe to launch **provided the conditions below are met** — chiefly that **paid packages remain disabled until a real payment processor is integrated** (they are currently gated off), leaked-password protection is enabled, and backup/PITR is confirmed.

For a **free launch** (packages kept off), this is very close to a clean **GO**.

---

## Launch blockers (must be resolved before the associated surface goes live)

### B1 — Payments are mocked; must not expose paid checkout until real Stripe is wired
**Severity:** Critical *(conditional — only if paid packages are enabled)*
**Evidence:** `app/api/checkout/create-session/route.ts:14` — *"Stripe is mocked here until live API keys are configured"*; `:116` *"TODO: Replace with a real Stripe PaymentIntent when live keys exist"*; the route mints `pi_test_…` / `cs_test_…` fake intents and writes a payment row without charging.
**Mitigating fact:** The `show_packages` feature flag is **`false`** in production ("Disable to hide packages from users while you test and configure them"), so the paid flow is **not surfaced in the patient navigation**. This is why it is a *conditional* rather than an absolute blocker.
**Residual risk:** The `/checkout` and public `/packages` routes still exist and are not hard-disabled server-side — only hidden from nav. A user reaching them directly could complete a **mock "purchase"** that grants nothing / charges nothing.
**Required action (choose one):**
- **Launch free:** keep `show_packages=false` **and** hard-gate `/checkout` + `/packages` server-side (redirect / 404 / "coming soon") so the mock path cannot be completed. *(Effort: 1–2 h)*
- **Launch paid:** integrate real Stripe — server-side `PaymentIntent` creation with live keys, real `client_secret`, and **signature-verified** webhooks in `app/api/webhooks/stripe/route.ts` — before enabling `show_packages`. *(Effort: 1–3 days incl. testing)*

---

## Go-live conditions (fix before or at launch — low effort)

### C1 — Enable leaked-password protection
**Severity:** Medium · **Effort:** 5 min
**Evidence:** Supabase security advisor `auth_leaked_password_protection` — *"Leaked password protection is currently disabled."*
**Action:** Supabase → Auth → Password security → enable HaveIBeenPwned check. Expected for a health platform.
Ref: https://supabase.com/docs/guides/auth/password-security

### C2 — Confirm backups / Point-in-Time Recovery
**Severity:** High (data-loss risk for PHI) · **Effort:** 15 min to verify
**Evidence:** Project is `ACTIVE_HEALTHY` in `eu-central-1`; backup plan/PITR is not visible from the audit surface.
**Action:** Confirm the Supabase plan provides **daily backups + PITR**, document the retention window and a tested restore procedure. A mental-health platform must not launch without a verified DR path.

### C3 — Verify the mock payment path cannot be reached (ties to B1)
**Severity:** Medium · **Effort:** included in B1
**Action:** As part of B1, add an integration check that `/checkout` returns a non-transactional response while `show_packages=false`.

---

## 30-day post-launch (acceptable to defer)

### P1 — Database performance hygiene (matters at scale, not at launch load)
**Evidence (Supabase performance advisor):**
- `unindexed_foreign_keys`: **17** — add covering indexes (slows joins/cascade deletes at scale).
- `auth_rls_initplan`: **51** — wrap `auth.uid()` as `(select auth.uid())` in RLS so it evaluates once per query, not per row.
- `duplicate_index`: **19** and `unused_index`: **71** — drop to cut write cost / storage.
- `multiple_permissive_policies`: **263** — consolidate overlapping RLS policies.
- `auth_db_connections_absolute`: **1** — watch connection headroom; use pooling under load.
**Effort:** 1–2 days of DB hygiene; revisit before onboarding significant traffic.
**Note:** Current production load is small (single-digit users), so none of these gate launch.

### P2 — Minor RLS-helper hardening
**Severity:** Low · **Effort:** 30 min
**Evidence:** Security advisor `authenticated_security_definer_function_executable` (4 functions). `submit_assessment_atomic` was **verified safe** (enforces `auth.uid() = p_patient_id`) and `get_my_role` returns only the caller's role. `has_clinician_access` / `check_relationship_permission` are boolean helpers callable by `authenticated` — a minor existence-oracle. Consider `REVOKE EXECUTE … FROM authenticated` (RLS/service-role still use them).

### P3 — Live performance & cross-browser validation (not measurable here)
Run Lighthouse/CrUX for Core Web Vitals, a k6/Artillery load test to your target concurrency, and a BrowserStack pass (Chrome/Edge/Safari/Firefox + iOS/Android, incl. RTL) before a marketing push. **Not assessed in this audit** — no live access from the audit environment.

---

## Evidence of a strong baseline (what's already right)

- **Security headers** (`next.config.js` + `middleware.ts`): HSTS, CSP with per-request nonce, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` locking camera/mic/geo, `poweredByHeader: false`.
- **Row-Level Security:** Security advisor shows **no `rls_disabled` findings** on any public table. Clinician access to PHI is scoped to an **active relationship + granted permission** via `has_clinician_access()` → `check_relationship_permission()`; superadmin-only deletion policies; audit-log immutability.
- **No secret exposure:** `SUPABASE_SERVICE_ROLE_KEY` is server-only (`lib/supabase/admin.ts`); every `NEXT_PUBLIC_*` var is a legitimately public value (anon key, Turnstile site key, Stripe **publishable** key).
- **Auth hardening:** login/registration/forgot/reset/email-confirm flows present; per-user rate limiting (`checkRateLimit`); Turnstile CAPTCHA; `submit_assessment_atomic` is transactional and rejects cross-user submissions.
- **Data residency:** `eu-central-1` — favorable for GDPR.
- **Healthcare compliance basics:** `app/privacy`, `app/terms`, `app/emergency` (crisis info), crisis banner on the dashboard, and consent tracking (`consent_given_at`, `consent_documents`, `user_consents`).
- **Recently remediated this cycle:** broken promo-code validation (was calling a superadmin-only route → fixed with a customer endpoint), clinician↔patient linking (RLS/service-role lookup bug → fixed), and repo↔prod migration drift (reconciled).

---

## Evidence-based scorecard

| Area | Score | Basis |
|---|---:|---|
| Security | 88/100 | Clean advisors (2 WARN, 0 ERROR), strong headers, no secret leak, IDOR-guarded RPC |
| Authorization / RLS | 90/100 | Relationship-scoped PHI access; no disabled RLS; superadmin/audit policies |
| Data protection & compliance | 82/100 | EU residency, consent + crisis pages; verify DR (C2) and data-retention policy |
| Functionality (core flows) | 85/100 | Assessments, dashboard, linking, promo all verified working; payments intentionally mocked |
| Payments | 40/100 | Mocked; acceptable only while packages stay disabled (B1) |
| Code quality | 84/100 | Clear separation (user vs service clients), server-authoritative pricing, typed routes |
| Performance | *not live-measured* | Code review only; DB advisories are 30-day items (P1); CWV/load untested (P3) |
| SEO | *code-review only* | `app/robots.ts`, `app/sitemap.ts`, metadata present; ranking/CWV not measured |
| Accessibility | *code-review only* | Semantic markup, ARIA roles/labels, RTL support in code; no live AT/contrast audit |
| **Overall readiness** | **⚠️ Conditional** | Secure & sound; gated by B1 + C1–C2 |

---

## Release-readiness checklist

| Item | Status |
|---|---|
| Security (headers, secrets, OWASP baseline) | ✅ Pass |
| Authentication | ✅ Pass |
| Authorization / RLS | ✅ Pass |
| Database (schema, migrations reconciled) | ✅ Pass |
| APIs (authZ, validation, rate limiting) | ✅ Pass |
| Assessments (atomic, IDOR-guarded) | ✅ Pass |
| Exports (PDF) | ✅ Pass (server-side, access-checked) |
| Payments | ⚠️ Conditional — mock only; keep packages off (B1) |
| Legal/consent/crisis pages | ✅ Pass |
| Leaked-password protection | ❌ Enable (C1) |
| Backups / Disaster Recovery | ⚠️ Verify (C2) |
| SEO (robots/sitemap/metadata) | ✅ Pass (rankings not measured) |
| Accessibility | ⚠️ Code-review only (P3) |
| Performance / load | ⚠️ Not live-measured (P1, P3) |
| Monitoring / alerting | ⚠️ Verify (not in audit scope) |

---

## Bottom line

Ship it **with conditions**: enable leaked-password protection (C1), confirm backups/PITR (C2), and keep paid packages disabled with `/checkout` hard-gated until real Stripe is integrated (B1). The security and authorization foundation is strong for a mental-health platform; the remaining launch risk is concentrated in the (currently-hidden) payments feature and in operational confirmations (DR, monitoring), not in the core product.
