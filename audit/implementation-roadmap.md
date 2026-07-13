# V Welfare — Implementation Roadmap

**Audit Date:** 2026-07-13  
**Status:** AWAITING APPROVAL — No fixes implemented  
**Process:** Fix ONE issue at a time → explain → lint → typecheck → test → commit

---

## Final Executive Decision

# ⚠️ GO LIVE WITH CONDITIONS

V Welfare demonstrates a **solid web platform foundation** with appropriate healthcare UX patterns, bilingual support, security primitives (CSP, HMAC admin, rate limiting, PHI scrubbing), and a comprehensive assessment engine. However, **Critical security and database findings**, **mobile app breakage**, and **missing production features** (payments, appointments, clinician verification UI) prevent an unconditional go-live for a regulated healthcare platform serving real patients.

### Conditions for Production Launch

All **Phase 0 (Launch Blockers)** items must be completed and verified before accepting real patient PHI in production. Phase 1 items should be completed within 30 days post-launch.

---

## Final Scores

| Domain | Score | Report |
|--------|-------|--------|
| Security | 58/100 | security-report.md |
| Functionality | 72/100 | bug-report.md |
| Performance | 68/100 | performance-report.md |
| SEO | 75/100 | See SEO section below |
| Accessibility | 66/100 | accessibility-report.md |
| Compliance | 60/100 | See Compliance section below |
| UX | 74/100 | ui-report.md |
| Code Quality | 70/100 | bug-report.md |
| Database | 62/100 | database-report.md |
| Architecture | 72/100 | architecture-report.md |
| **Overall Readiness** | **66/100** | — |

---

## Risk Matrix

| Risk | Severity | Probability | Impact | Recommendation |
|------|----------|-------------|--------|----------------|
| Signup role injection | Critical | Medium | Full compromise | Fix trigger immediately |
| Admin RPC PHI exposure | Critical | High | Mass data breach | Revoke + add auth checks |
| RLS policy regression | Critical | High | Unauthorized clinical access | Drop + recreate policies |
| Mobile app data corruption | Critical | High | Patient harm / data loss | Block mobile deploy until fixed |
| Auth rate limit bypass | High | High | Brute force attacks | Server-side auth proxy |
| Dual clinician model | High | High | Broken care workflows | Unify on consent model |
| Next.js CVEs | High | Medium | Various exploits | Upgrade Next.js |
| No payments | Medium | Certain | No revenue | Product decision |
| Migration non-reproducibility | High | Medium | DR failure | Squash migrations |
| WCAG gaps | Medium | Certain | Legal/ethical risk | Live regions + contrast audit |

---

## Launch Blockers (Must Fix Before Go-Live)

| ID | Issue | Location | Effort |
|----|-------|----------|--------|
| P0-01 | Signup role injection | handle_new_user() trigger | 1h |
| P0-02 | Admin RPC authorization | 8 RPC functions + GRANT | 4h |
| P0-03 | RLS policy stacking on messages/clinical_notes | Migration SQL | 6h |
| P0-04 | Revoke admin_demographics_summary | Migration SQL | 1h |
| P0-05 | Recreate auth signup trigger | Migration SQL | 1h |
| P0-06 | Block mobile production deploy OR fix mobile | mobile/ (see P1-10) | 40h+ |
| P0-07 | Upgrade Next.js (CVEs) | package.json | 8h |
| P0-08 | Fix clinician/patients user_id column | route.ts:85 | 0.5h |
| P0-09 | Fix connect accept login redirect | accept/page.tsx:89 | 0.5h |
| P0-10 | Admin clinician verification UI | New admin page | 8h |

**Phase 0 Total Estimated Effort: ~70 hours**

---

## Phase 1 — High Priority (30 Days Post-Launch)

| ID | Issue | Location | Effort |
|----|-------|----------|--------|
| P1-01 | Unify clinician-patient authorization model | Multiple files | 20h |
| P1-02 | Scope clinician RLS to assigned/relationship | Migration SQL | 12h |
| P1-03 | Enforce is_active in middleware | middleware.ts | 2h |
| P1-04 | Server-side auth rate limiting | Auth hook or proxy | 8h |
| P1-05 | CAPTCHA fail-closed in production | login/register pages | 2h |
| P1-06 | Implement AI draft PUT handler | clinical-notes/route.ts | 4h |
| P1-07 | Block deactivated accounts | middleware/layout | 2h |
| P1-08 | Revoke PUBLIC on SECURITY DEFINER functions | Migration SQL | 2h |
| P1-09 | Add aria-live for high-risk results | assessment-content.tsx | 2h |
| P1-10 | Fix mobile messages schema | mobile/messages.tsx | 4h |
| P1-11 | Fix mobile assessment submit (use API) | mobile/assessments/[id].tsx | 8h |
| P1-12 | Implement mobile PDF endpoint or redirect | New route or mobile fix | 8h |
| P1-13 | Remove or create assessment_sessions table | Migration + mobile | 4h |
| P1-14 | Align password reset rules with registration | reset-password/page.tsx | 1h |
| P1-15 | Add CHECK constraint on profiles.role | Migration SQL | 1h |
| P1-16 | Code-split assessment-content.ts | lib/assessment-content.ts | 8h |
| P1-17 | Implement mat view refresh cron | pg_cron migration | 2h |
| P1-18 | Unify notification systems | notifications + notification_events | 8h |

**Phase 1 Total Estimated Effort: ~98 hours**

---

## Phase 2 — Medium Priority (60 Days)

| ID | Issue | Effort |
|----|-------|--------|
| P2-01 | Admin table mobile responsiveness | 8h |
| P2-02 | Pagination on admin export/analytics | 8h |
| P2-03 | Server-side Expo push dispatch | 16h |
| P2-04 | WCAG contrast audit + fixes | 8h |
| P2-05 | prefers-reduced-motion support | 1h |
| P2-06 | Keyboard accessibility on admin tables | 8h |
| P2-07 | Audit all service-role routes | 24h |
| P2-08 | Squash/consolidate migrations | 16h |
| P2-09 | Add E2E test suite (Playwright) | 24h |
| P2-10 | Per-admin MFA (replace shared PIN) | 16h |
| P2-11 | Arabic PDF support | 16h |
| P2-12 | Bundle size CI gate | 4h |
| P2-13 | Core Web Vitals monitoring | 4h |
| P2-14 | Appointments module (product) | 80h+ |
| P2-15 | Payments integration (product) | 80h+ |

**Phase 2 Total Estimated Effort: ~313 hours**

---

## Phase 3 — Low Priority / Backlog

| ID | Issue | Effort |
|----|-------|--------|
| P3-01 | Guest assessment frontend UI | 8h |
| P3-02 | Consolidate admin entry points | 4h |
| P3-03 | Update clinicians landing page | 2h |
| P3-04 | Add loading.tsx route files | 4h |
| P3-05 | Lazy-load Turnstile on auth pages only | 2h |
| P3-06 | Upgrade recharts to v3 | 8h |
| P3-07 | Upgrade eslint to v9 | 8h |
| P3-08 | Redis rate limit backend activation | 4h |
| P3-09 | CSRF tokens on API routes | 8h |
| P3-10 | Session management UI | 16h |

---

## Prioritized Issue List (Complete)

### Critical

| ID | Location | Problem | Why It Matters | Risk | Solution | Effort |
|----|----------|---------|----------------|------|----------|--------|
| SEC-C01 | handle_new_user() trigger | Role from signup metadata | Privilege escalation to admin | Platform compromise | Hardcode role='patient' | 1h |
| SEC-C02 | admin dashboard RPCs | No auth on 8 RPCs | Any user reads PHI | Data breach | Add is_admin() check or revoke | 4h |
| SEC-C03 | messages/clinical_notes RLS | Policy OR-stacking | Weakened access control | Unauthorized clinical access | Drop + recreate policies | 6h |
| SEC-C04 | admin_demographics_summary | Still granted to authenticated | Demographics leak | Privacy violation | REVOKE SELECT | 1h |
| SEC-C05 | mobile/ | Bypasses API security layer | No audit/rate limit/alerts | Patient safety gap | Route through web APIs | 16h |
| BUG-C04 | mobile/messages.tsx | Wrong column names | Messages broken | Care coordination failure | Align with DB schema | 4h |
| BUG-C05 | mobile PDF calls | Missing API route | PDF download fails | Feature broken | Create endpoint | 8h |
| BUG-C07 | mobile assessments | Missing table | Save/resume fails | Data loss | Create table or remove feature | 4h |

### High

| ID | Location | Problem | Why It Matters | Risk | Solution | Effort |
|----|----------|---------|----------------|------|----------|--------|
| SEC-H01 | auth pages | Rate limits bypassable | Brute force | Account takeover | Server-side auth gate | 8h |
| SEC-H04 | RLS baseline | Any clinician reads all PHI | HIPAA minimum necessary | Privacy violation | Scope to relationship | 12h |
| SEC-H05 | Multiple | Dual auth models | Broken workflows | Care gaps | Unify on consent | 20h |
| SEC-H06 | package.json | Next.js CVEs | Known exploits | Availability/confidentiality | Upgrade Next.js | 8h |
| BUG-H01 | clinician/patients API | user_id vs patient_id | Wrong data | Clinician sees no assessments | Fix column name | 0.5h |
| BUG-H02 | connect/accept | /auth/login 404 | Broken invite flow | Patients can't connect | Fix to /login | 0.5h |
| BUG-H03 | clinical-notes API | Missing PUT | AI draft broken | Clinician workflow gap | Add PUT handler | 4h |
| BUG-H05 | admin panel | No verification UI | Can't approve clinicians | Operational blocker | Build admin page | 8h |
| BUG-H06 | migrations | Auth trigger dropped | Registration may fail | New users blocked | Recreate trigger | 1h |
| UI-08 | admin panel | No verification UI | Same as BUG-H05 | — | — | 8h |

### Medium

| ID | Location | Problem | Solution | Effort |
|----|----------|---------|----------|--------|
| SEC-M01 | reset-password | Weak password rules | Match registration rules | 1h |
| SEC-M11 | connect/accept | Wrong login URL | Fix redirect | 0.5h |
| BUG-M01 | guest API | No frontend | Build UI or remove API | 8h |
| BUG-M02 | notifications | Split systems | Unify tables | 8h |
| BUG-M04 | admin/analytics | 5000 row cap | Cursor pagination | 4h |
| BUG-M05-06 | mobile | Schema mismatches | Align field names | 4h |
| A11Y-H01-02 | messages, assessments | No aria-live | Add live regions | 4h |
| PERF-H01 | assessment-content | 209KB import | Code split | 8h |
| PERF-H02 | layout.tsx | Turnstile everywhere | Auth-only load | 2h |

### Low

| ID | Location | Problem | Solution | Effort |
|----|----------|---------|----------|--------|
| BUG-L01 | robots/sitemap | /clinicians inconsistency | Add to sitemap | 0.5h |
| BUG-L04 | admin nav | Dual entry points | Consolidate | 4h |
| BUG-L05 | /clinicians | "Coming Soon" text | Update copy | 1h |
| A11Y-L04 | language-toggle | Missing aria-label | Add label | 0.5h |

---

## Fix Protocol (Post-Approval)

For each approved fix:

1. **Create branch:** `cursor/fix-{issue-id}-dd75`
2. **Implement** minimal scoped change
3. **Explain** what changed and why
4. **Run:** `npm run lint && npx tsc --noEmit && npm run test:security`
5. **Verify** no regressions
6. **Commit** with message: `fix({scope}): {description} [{issue-id}]`
7. **Push** and update PR
8. **Request review** before next fix

---

## Release Readiness Checklist

| Area | Status | Blocker |
|------|--------|---------|
| Security | ❌ FAIL | P0-01 through P0-04, P0-07 |
| Authentication | ⚠️ PARTIAL | Rate limit bypass, is_active |
| Authorization | ❌ FAIL | Dual model, RLS regression |
| Database | ❌ FAIL | RPC exposure, policy stacking |
| APIs | ⚠️ PARTIAL | clinician/patients bug, AI draft 405 |
| Assessments | ✅ PASS (web) | Mobile broken |
| Exports | ⚠️ PARTIAL | Mobile PDF missing |
| Mobile | ❌ FAIL | Do not deploy |
| SEO | ✅ PASS | sitemap, robots, metadata, hreflang |
| Accessibility | ⚠️ PARTIAL | Live regions, contrast |
| Analytics | ⚠️ PARTIAL | 5000 row cap |
| Monitoring | ❌ FAIL | No Web Vitals, no SIEM |
| Backups | ⚠️ UNKNOWN | Supabase default — verify DR plan |
| Disaster Recovery | ⚠️ PARTIAL | docs/DISASTER_RECOVERY.md exists |
| Payments | ❌ N/A | Not implemented |
| Appointments | ❌ N/A | Not implemented |

---

## SEO Summary (Cross-Reference)

| Item | Status | Location |
|------|--------|----------|
| sitemap.xml | ✅ | app/sitemap.ts |
| robots.txt | ✅ | app/robots.ts — blocks PHI/admin/API |
| Canonical URLs | ✅ | metadata alternates |
| Open Graph | ✅ | app/layout.tsx metadata |
| Twitter cards | ✅ | app/layout.tsx metadata |
| hreflang EN/AR | ✅ | sitemap alternates |
| Metadata per page | ⚠️ Partial | Most use root template |
| Structured data | ❌ | No JSON-LD schema markup |
| /clinicians in sitemap | ❌ | In robots allow but not sitemap |

**SEO Score: 75/100**

---

## Compliance Summary (Cross-Reference)

| Requirement | Status | Gap |
|-------------|--------|-----|
| Informed consent | ✅ | Onboarding consent step |
| Privacy notice | ✅ | /privacy page |
| Terms of service | ✅ | /terms page |
| Disclaimer visibility | ✅ | Assessment flow |
| Emergency information | ✅ | crisis-banner, mobile emergency |
| User data export | ✅ | /api/user/export-data |
| Account deletion request | ✅ | /api/user/delete-request |
| Audit logging | ✅ | audit_log table |
| Data retention policy | ⚠️ | Not documented in app |
| Minimum necessary access | ❌ | Over-broad clinician RLS |
| Breach notification plan | ⚠️ | In DR doc — verify |

**Compliance Score: 60/100**

---

## 30-Day Post-Launch Risks (Acceptable with Monitoring)

1. Analytics inaccuracy at scale (5000 row cap)
2. Guest assessment API unused
3. Admin table mobile UX
4. recharts/eslint deprecated versions
5. No structured data for SEO
6. PDF English-only
7. No session management UI
8. Partial assessment submissions allowed

---

## Recommended Fix Order (After Approval)

```
Week 1 (Blockers):
  P0-01 → P0-02 → P0-03 → P0-04 → P0-05 → P0-07 → P0-08 → P0-09

Week 2 (Operational):
  P0-10 → P1-06 → P1-03 → P1-05 → P1-07 → P1-08

Week 3 (Mobile or Block):
  P1-10 → P1-11 → P1-12 → P1-13 (OR disable mobile app)

Week 4 (Architecture):
  P1-01 → P1-02 → P1-09 → P1-14 → P1-15
```

---

## Deliverables Completed

| Deliverable | File | Status |
|-------------|------|--------|
| Architecture Report | audit/architecture-report.md | ✅ |
| Security Report | audit/security-report.md | ✅ |
| Database Report | audit/database-report.md | ✅ |
| Performance Report | audit/performance-report.md | ✅ |
| UI Report | audit/ui-report.md | ✅ |
| Accessibility Report | audit/accessibility-report.md | ✅ |
| Bug Report | audit/bug-report.md | ✅ |
| Implementation Roadmap | audit/implementation-roadmap.md | ✅ |

---

**AWAITING APPROVAL TO BEGIN FIXES.**

When ready, specify which issue ID to fix first (recommended: **P0-01 — Signup role injection**).
