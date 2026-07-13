# V Welfare — Final Production Readiness Report

**Date:** 2026-07-13  
**Auditors:** CTO / CISO / Healthcare Compliance Officer (Final Launch Assessment)  
**Platform:** V Welfare — Bilingual mental health assessment platform  
**Stack:** Next.js 14 · Vercel · Supabase · Gemini API · Custom Auth  
**Prior audits completed:** Security · Performance · Responsive UI

---

## Executive Summary

V Welfare has completed three prior audit cycles and demonstrates **mature security foundations** (CSP middleware, admin triple-auth, RLS on 49 tables, rate limiting, Turnstile CAPTCHA, PHI scrubber library, k6 load scripts). Core clinical workflows — registration, assessment completion, clinician consent, and admin operations — are **functionally implemented**.

This final assessment identified **6 launch blockers or near-blockers** in Supabase Data API exposure, healthcare crisis routing, PHI-to-AI transmission, and GDPR deletion enforcement. **Targeted remediations were implemented in this audit** (migration `20260628120000_production_security_hardening.sql`, crisis resources, PHI scrubbing on all Gemini routes, GDPR deletion cron, admin RPC hardening).

**Remaining conditions** require operational verification (PITR, migration sync, monitoring) and workflow consolidation (clinician patient-linking, mobile assessment path) before unrestricted production launch.

---

## Final Verdict

# ⚠️ READY WITH CONDITIONS

The platform may launch to production **only after the 8 launch conditions in Section 10 are satisfied**. Code-level blockers addressed in this audit must be **deployed to the live Supabase project** before go-live.

---

## Remediations Implemented in This Audit

| Fix | Files | Severity Addressed |
|-----|-------|-------------------|
| Revoke admin RPC functions from `authenticated`/`anon` (service_role only) | `supabase/migrations/20260628120000_production_security_hardening.sql` | **BLOCKER** |
| Revoke `admin_demographics_summary` Data API grant | Same migration | **BLOCKER** |
| Drop weaker `clinical_notes` RLS policies (`cn_*`) | Same migration | **HIGH** |
| Lock `generate_patient_access_code()` to service_role | Same migration | **HIGH** |
| Switch admin dashboard RPC routes to `createAdminClient()` | `app/api/admin/dashboard/*.ts` | **BLOCKER** |
| PHI scrubbing on all Gemini routes | `ai-chat`, `synthesis`, `clinical-notes`, `packages/interpret` | **BLOCKER** |
| Crisis hotline links on high-risk assessment results | `components/crisis-resources.tsx`, `assessment-content.tsx` | **HIGH** |
| Web `/emergency` crisis resources page | `app/emergency/page.tsx` | **HIGH** |
| GDPR deletion: `deletion_requested_at` + daily cron | Migration, `delete-request/route.ts`, `cron/process-deletions` | **BLOCKER** |
| Document missing env vars | `.env.example` | **MEDIUM** |
| Vercel cron for deletion processing | `vercel.json` | **MEDIUM** |

---

## 1. Supabase Production Readiness

### 1.1 Migrations

| Finding | Severity | Status |
|---------|----------|--------|
| 100 migration files; ~73 are comment-only stubs relying on `schema_baseline.sql` | **MEDIUM** | Open — acceptable if baseline applies cleanly |
| Duplicate migrations (`20260624044327` / `20260627220200`, `20260624044337` / `20260627220300`) | **LOW** | Open — `IF NOT EXISTS` mitigates |
| Admin mat views reference non-existent columns (`user_type`, `full_name`, `email`) | **HIGH** | Open — admin risk route queries base tables as workaround |
| No pg_cron migration for mat view refresh | **MEDIUM** | Open |
| Supabase Preview sync failure blocks Vercel deploy (`KNOWN_ISSUES.md`) | **BLOCKER** | Open — ops action required |
| New security hardening migration not yet applied to remote | **BLOCKER** | **Fix ready** — apply `20260628120000` |

**Evidence:** `supabase/migrations/20260619120000_schema_baseline.sql` (1,189 lines); stub pattern in `20260524202222_create_profiles_and_user_tables.sql`.

### 1.2 RLS Validation

| Finding | Severity | Status |
|---------|----------|--------|
| 49 tables with RLS enabled | ✅ Pass | — |
| Admin RPCs callable by any authenticated JWT via PostgREST | **BLOCKER** | **Fixed** — revoked in new migration |
| `admin_demographics_summary` still granted to `authenticated` | **BLOCKER** | **Fixed** — revoked in new migration |
| `clinical_notes` policy regression (`cn_*` weaker than baseline) | **HIGH** | **Fixed** — dropped conflicting policies |
| `patient_prof_clinician` allows any clinician to read all patient profiles | **MEDIUM** | Open |
| Public read on `assessment_definitions`, `assessment_items` (by design for guest flow) | **LOW** | Accepted risk |
| `generate_patient_access_code()` not revoked from PUBLIC | **HIGH** | **Fixed** |

**RLS Score:** 82/100 (post-remediation)

### 1.3 Backups

| Finding | Severity | Status |
|---------|----------|--------|
| Supabase Pro daily snapshots (7-day retention) documented | ✅ | — |
| PITR required for 4-hour RPO per `docs/DISASTER_RECOVERY.md` | **BLOCKER** | **Unverified** — requires Team plan ($599/mo) |
| 7-day retention below healthcare/GDPR norms (28-day recommended) | **HIGH** | Open |
| No automated backup verification in CI | **MEDIUM** | Open |

### 1.4 Disaster Recovery

| Finding | Severity | Status |
|---------|----------|--------|
| DR plan documented (`docs/DISASTER_RECOVERY.md`) | ✅ | — |
| RPO 4h / RTO 8h defined | ✅ | — |
| Monthly DR drill recommended but not automated | **MEDIUM** | Open |
| Stub migrations make full replay unreliable without baseline | **MEDIUM** | Open |
| Secrets manager referenced but not integrated | **MEDIUM** | Open |

**Supabase Readiness Score:** 68/100

---

## 2. Healthcare Safety

### 2.1 Crisis Escalation

| Finding | Severity | Status |
|---------|----------|--------|
| Dashboard crisis banner with Saudi/UAE/international hotlines | ✅ | — |
| AI chat emergency keyword intercept (EN + AR) | ✅ | — |
| Mobile `/emergency` screen | ✅ | — |
| **No web `/emergency` page** | **HIGH** | **Fixed** — `app/emergency/page.tsx` |
| High-risk assessment results lacked actionable hotline links | **HIGH** | **Fixed** — `CrisisResources` component |
| Crisis banner not shown at moment of risk (dashboard only) | **MEDIUM** | Partially fixed — now on result screen |
| Mobile uses US-centric 911/988 defaults | **MEDIUM** | Open |
| Emergency contact collected but not used in escalation | **MEDIUM** | Open |
| Mobile assessment bypasses server high-risk notification | **HIGH** | Open |

### 2.2 Assessment Risk Handling

| Finding | Severity | Status |
|---------|----------|--------|
| Safety-item scoring (PHQ-9 suicidal ideation) | ✅ | — |
| Threshold-based high-risk flag | ✅ | — |
| Server-side admin notification on high-risk (web path) | ✅ | — |
| Guest high-risk: admin notified, limited user guidance | **HIGH** | Open |
| User can continue to dashboard after high-risk without blocking | **MEDIUM** | Accepted — screening tool, not emergency gate |
| Onboarding consent optional (not blocked if unchecked) | **MEDIUM** | Open |

### 2.3 Clinical Responsibility Boundaries

| Finding | Severity | Status |
|---------|----------|--------|
| Footer disclaimer: screening only, not clinical assessment | ✅ | — |
| Terms, packages, synthesis disclaimers | ✅ | — |
| AI system prompt: no diagnosis, crisis → emergency services | ✅ | — |
| Sample result self-harm notice | ✅ | — |
| No pre-assessment informed consent screen (web) | **MEDIUM** | Open |

**Healthcare Safety Score:** 74/100 (post-remediation)

---

## 3. Privacy & PHI Lifecycle

### 3.1 PHI Lifecycle

| Finding | Severity | Status |
|---------|----------|--------|
| GDPR self-export (`/api/user/export-data`) | ✅ | — |
| CASCADE FK deletion on profile delete | ✅ | — |
| Audit logging for export and deletion requests | ✅ | — |
| `anonymizePHI` / `scrubPHI` library with unit tests | ✅ | — |
| Export omits clinical notes, messages, AI chat history | **LOW** | Open |

### 3.2 Retention

| Finding | Severity | Status |
|---------|----------|--------|
| No automated retention policy job | **HIGH** | Open |
| `rate_limit_log` cleanup not scheduled | **MEDIUM** | Open |
| Guest PHI stored without account (`patient_id: null`) | **HIGH** | Open |

### 3.3 Deletion

| Finding | Severity | Status |
|---------|----------|--------|
| Delete request only logged audit entry (no enforcement) | **BLOCKER** | **Fixed** — `deletion_requested_at` + cron |
| No email confirmation on delete | **MEDIUM** | Open |
| `CRON_SECRET` must be set in Vercel for cron to run | **HIGH** | Condition — ops |

### 3.4 AI Processing

| Finding | Severity | Status |
|---------|----------|--------|
| Gemini on 4 routes: ai-chat, synthesis, clinical-notes, packages/interpret | ✅ | — |
| AI budget circuit breaker (`aiBudgetGuard`) | ✅ | — |
| Per-user rate limits on AI routes | ✅ | — |
| **PHI scrubber not applied to Gemini inputs** | **BLOCKER** | **Fixed** |
| No AI-specific informed consent checkbox | **HIGH** | Open |
| Web privacy policy omits Gemini as sub-processor | **HIGH** | Open |
| Google Gemini not disclosed in web privacy page | **HIGH** | Open |

**Privacy Score:** 71/100 (post-remediation)

---

## 4. Deployment

### 4.1 Vercel Configuration

| Finding | Severity | Status |
|---------|----------|--------|
| Security headers (HSTS, X-Frame-Options, CSP via middleware) | ✅ | — |
| Function timeout overrides for AI/admin routes | ✅ | — |
| Cron job for GDPR deletion processing | **MEDIUM** | **Added** — requires `CRON_SECRET` |
| No region pinning | **LOW** | Open |
| Supabase migration sync blocks deploy | **BLOCKER** | Open — ops |

### 4.2 Environment Variables

| Finding | Severity | Status |
|---------|----------|--------|
| Core vars documented in `.env.example` | ✅ | — |
| `NEXT_PUBLIC_SITE_URL` missing (breaks email confirm links) | **HIGH** | **Fixed** in `.env.example` — must set in Vercel |
| `AI_DAILY_BUDGET_USD`, `AI_COST_PER_REQUEST_USD` undocumented | **LOW** | **Fixed** |
| `CRON_SECRET` for deletion cron | **HIGH** | **Added** |
| No centralized env validation (Zod/t3-env) | **MEDIUM** | Open |
| Upstash Redis documented but `checkRateLimitRedis` unused | **LOW** | Open |

### 4.3 Monitoring

| Finding | Severity | Status |
|---------|----------|--------|
| Health endpoint (`/api/health`) — DB + Gemini key check | ✅ | — |
| Audit log in database | ✅ | — |
| **No Sentry / external error tracking** | **HIGH** | Open |
| **No CI pipeline** (`.github/workflows/` absent) | **HIGH** | Open |
| `console.error` only — no structured logging | **MEDIUM** | Open |
| Health marks degraded without Gemini (false alarm if AI optional) | **LOW** | Open |

**Deployment Score:** 65/100

---

## 5. Testing

### 5.1 Automated Tests

| Asset | Coverage | Gap |
|-------|----------|-----|
| `__tests__/security/rls.test.ts` | HTTP 401/403, rate limits | Requires live server + env |
| `__tests__/security/idor.test.ts` | Cross-user access | Requires `ATTACKER_COOKIE` |
| `__tests__/security/phi.test.ts` | PHI scrubber unit tests | ✅ 17 tests pass |
| `vw-test.js` | Manual Playwright regression | Not in npm scripts |
| k6 load tests (`load-tests/scenarios/`) | 100–1000 VU scripts | Not in CI; no baseline results |

| Finding | Severity |
|---------|----------|
| No CI/CD pipeline | **HIGH** |
| No E2E tests in `package.json` | **HIGH** |
| No unit tests for assessment scoring, onboarding, admin KPIs | **MEDIUM** |
| No component tests | **MEDIUM** |
| Mobile has no test scripts | **MEDIUM** |
| Security tests skip without env configuration | **MEDIUM** |
| Load test guest scenario passes empty items array | **LOW** |

### 5.2 Load Testing

k6 scripts exist with p95 < 2–3s thresholds. **Not executed against production-like environment in this audit.** Pre-launch load test at 100+ VUs recommended.

### 5.3 Security Testing

No SAST/DAST in CI. `npm audit` reports 5 vulnerabilities (1 moderate, 4 high). Manual security test scaffolding is sound but not enforced on merge.

**Testing Score:** 42/100

---

## 6. Business-Critical Workflows

### 6.1 Patient Registration

| Step | Status | Risk |
|------|--------|------|
| Register with password rules + terms | ✅ | — |
| Turnstile CAPTCHA + signup rate limit | ✅ | — |
| Email confirmation (PKCE) | ✅ | — |
| 3-step onboarding → profiles | ✅ | — |
| `NEXT_PUBLIC_SITE_URL` for confirm links | ⚠️ | Must be set in production |
| No E2E test coverage | **MEDIUM** | Open |

**Workflow Status:** PASS with conditions

### 6.2 Assessment Completion

| Step | Status | Risk |
|------|--------|------|
| Profile completeness gate | ✅ | — |
| localStorage progress resume | ✅ | — |
| Atomic submission RPC | ✅ | — |
| Safety-item + threshold high-risk detection | ✅ | — |
| Crisis resources on high-risk result (web) | ✅ | **Fixed this audit** |
| Guest path with Turnstile (production) | ✅ | — |
| Mobile direct Supabase insert (skips notify) | **HIGH** | Open |
| No E2E for full assessment → PDF | **MEDIUM** | Open |

**Workflow Status:** PASS with conditions

### 6.3 Clinician Workflow

| Step | Status | Risk |
|------|--------|------|
| Verification required before invites | ✅ | — |
| Consent-based `clinician_patient_relationships` | ✅ | — |
| **Dual patient-linking models** (legacy `assigned_clinician_id` vs new relationships) | **HIGH** | Open |
| `/patients` page may show empty list after consent linking | **HIGH** | Open |
| `/patients` lacks server-side role gate | **MEDIUM** | Open |
| No E2E for invite → accept → assign | **MEDIUM** | Open |

**Workflow Status:** CONDITIONAL PASS — clinician patient list inconsistency is a functional risk

### 6.4 Admin Workflow

| Step | Status | Risk |
|------|--------|------|
| Triple auth: credentials + PIN + role + HMAC cookie | ✅ | — |
| Rate-limited login (5/15min/IP) | ✅ | — |
| 23 admin API routes with `requireAdmin()` | ✅ | — |
| Admin RPC Data API exposure | ✅ | **Fixed this audit** |
| Two admin UIs (`/x/control` vs `/admin/kpi-dashboard`) | **LOW** | Open |
| In-memory aggregation on 5k rows (overview) | **MEDIUM** | Open |

**Workflow Status:** PASS

---

## 7. Risk Matrix

| Risk | Severity | Probability | Impact | Recommendation |
|------|----------|-------------|--------|----------------|
| Admin RPC Data API bypass | Critical | High (pre-fix) | Full patient data exposure | **Apply migration + deploy** |
| PHI sent to Gemini unscrubbed | Critical | High (pre-fix) | GDPR/HIPAA breach | **Deploy PHI scrubbing** |
| GDPR deletion not enforced | Critical | Certain (pre-fix) | Regulatory violation | **Set CRON_SECRET, apply migration** |
| PITR not enabled | High | Medium | 24h+ data loss on incident | Upgrade Supabase to Team |
| Migration sync blocks deploy | High | High | Cannot ship fixes | Reset preview / contact Supabase |
| Mobile skips high-risk notify | High | Medium | Delayed crisis response | Route mobile through API |
| Clinician dual patient models | High | High | Broken clinician workflow | Consolidate to relationships table |
| No production monitoring | High | High | Blind to outages | Integrate Sentry |
| No CI pipeline | High | High | Regressions ship undetected | Add GitHub Actions |
| Guest PHI without consent | High | Medium | Privacy violation | Add consent notice |
| Storage policies absent | High | Low (no storage used yet) | PHI exposure if enabled | Add policies before uploads |
| AI consent not obtained | Medium | Medium | GDPR lawful basis gap | Add consent checkbox + policy update |

---

## 8. Launch Blockers (Must Fix Before Go-Live)

| # | Issue | Status |
|---|-------|--------|
| 1 | Apply `20260628120000_production_security_hardening.sql` to production Supabase | **Fix ready — deploy required** |
| 2 | Set `CRON_SECRET` in Vercel and verify deletion cron runs | **Fix ready — configure required** |
| 3 | Verify/enable PITR on Supabase (4-hour RPO) | **Ops action** |
| 4 | Resolve Supabase migration sync (Vercel deploy blocker) | **Ops action** |
| 5 | Set `NEXT_PUBLIC_SITE_URL` in Vercel production | **Ops action** |
| 6 | Confirm all production secrets in secrets manager (not git) | **Ops action** |

---

## 9. 30-Day Post-Launch Risks (Acceptable for Later)

1. Integrate Sentry or equivalent error monitoring
2. Add GitHub Actions CI (build, lint, security tests)
3. Consolidate clinician patient-linking to `clinician_patient_relationships`
4. Route mobile assessments through `/api/submit-assessment`
5. Add AI-specific informed consent + update privacy policy (Gemini sub-processor)
6. Implement data retention policy job
7. Add storage bucket RLS before enabling file uploads
8. Fix admin mat views schema drift
9. Add E2E tests (Playwright) for critical paths
10. Run k6 load test baseline and commit results
11. Tighten `patient_prof_clinician` RLS to assigned patients only
12. Add pre-assessment informed consent screen

---

## 10. Launch Conditions Checklist

| # | Condition | Owner | Effort |
|---|-----------|-------|--------|
| 1 | Apply security hardening migration to production Supabase | DevOps | 1h |
| 2 | Set `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`, all secrets in Vercel | DevOps | 2h |
| 3 | Verify PITR enabled OR accept 24h RPO in writing | Leadership | 1h |
| 4 | Resolve Supabase migration sync for Vercel deploys | DevOps | 4–8h |
| 5 | Run `npm run test:security` against staging with credentials | QA | 2h |
| 6 | Execute k6 100 VU load test on staging | QA | 4h |
| 7 | Manual smoke test: register → assess → high-risk → crisis links | QA | 2h |
| 8 | Document AI processing in privacy policy (interim addendum acceptable) | Legal | 4h |

---

## 11. Final Scores

| Domain | Score | Notes |
|--------|-------|-------|
| Supabase / Database | 68/100 | Post-fix; PITR unverified |
| Healthcare Safety | 74/100 | Crisis routing improved |
| Privacy / PHI | 71/100 | Deletion + AI scrubbing fixed |
| Deployment | 65/100 | No monitoring/CI |
| Testing | 42/100 | Minimal automation |
| Business Workflows | 78/100 | Clinician model gap |
| **Overall Readiness** | **66/100** | Ready with conditions |

---

## 12. Prioritized Remediation Plan

| Priority | Issue | Effort | Owner |
|----------|-------|--------|-------|
| P0 | Deploy security migration to Supabase | 1h | DevOps |
| P0 | Configure Vercel env vars + cron | 2h | DevOps |
| P0 | Verify PITR / document RPO acceptance | 1h | Leadership |
| P0 | Fix Supabase migration sync | 4–8h | DevOps |
| P1 | Integrate Sentry | 4h | Engineering |
| P1 | Add GitHub Actions CI | 4h | Engineering |
| P1 | Mobile → API submit-assessment | 6h | Engineering |
| P1 | Clinician patient list consolidation | 8h | Engineering |
| P1 | Privacy policy update (Gemini, retention, DPO) | 8h | Legal/Eng |
| P2 | AI consent checkbox | 4h | Engineering |
| P2 | E2E Playwright suite | 16h | QA |
| P2 | Data retention cron | 16h | Engineering |
| P2 | Storage RLS policies | 8h | Engineering |

**Total P0 effort:** ~8–12 hours (ops + deploy)  
**Total P1 effort:** ~30 hours

---

## 13. Release Readiness Checklist

| Area | Pass/Fail |
|------|-----------|
| Security (post-migration deploy) | ⚠️ CONDITIONAL |
| Authentication | ✅ PASS |
| Authorization (post-RPC revoke) | ⚠️ CONDITIONAL |
| Database / RLS | ⚠️ CONDITIONAL |
| APIs | ✅ PASS |
| Assessments | ✅ PASS |
| Exports (PDF) | ✅ PASS |
| Mobile | ⚠️ CONDITIONAL |
| SEO | ✅ PASS |
| Accessibility | ✅ PASS (per prior audit) |
| Analytics (admin) | ✅ PASS |
| Monitoring | ❌ FAIL |
| Backups / DR | ⚠️ CONDITIONAL |
| GDPR Deletion | ⚠️ CONDITIONAL (cron must run) |

---

## 14. Sign-Off

| Role | Recommendation |
|------|----------------|
| **CTO** | Proceed with staged launch after P0 conditions met. Engineering quality is production-grade; operational maturity (CI, monitoring) must catch up within 30 days. |
| **CISO** | Do not launch until security migration is applied to live Supabase. Post-fix, residual risk is acceptable for a screening platform with documented limitations. |
| **Healthcare Compliance** | Crisis routing improvements are sufficient for soft launch. Mobile path and AI consent require 30-day remediation. Platform must not be marketed as emergency or diagnostic care. |

---

**Report generated:** 2026-07-13  
**Next review:** After P0 conditions satisfied and first production week complete
