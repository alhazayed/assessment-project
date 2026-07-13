# V Welfare — Implementation Roadmap

**Audit date:** 2026-07-13  
**Rule:** Do **not** implement until explicitly approved. After approval, fix **one issue at a time**, with lint, typecheck, tests, and scoped commits.

---

## Final Decision (Audit)

# ❌ DO NOT GO LIVE

### Why
1. Clinician–patient care path is architecturally broken (dual access model).
2. PHI exposure risks in RLS (broad clinician reads; admin RPC grants).
3. GDPR deletion is a false claim; export incomplete.
4. Admin PIN step-up does not protect data access.
5. Mobile scoring bypasses server integrity controls.
6. Database migrations are largely unreproducible stubs.
7. Certificate verification / admin approval workflow incomplete.
8. Accessibility below WCAG 2.2 AA for core assessment flows.

### Conditional alternative
**Patient-only limited beta (no clinician portal, no admin PHI analytics beyond anonymized exports)** could be considered as ⚠️ **GO LIVE WITH CONDITIONS** only after: H001/H002 auth gates, C004 deletion path started, H003 AI scrubbing, C005 mobile scoring fixed or mobile unpublished, and production Turnstile forced on.

---

## Scorecard

| Domain | Score |
|--------|-------|
| Security | 52/100 |
| Functionality | 48/100 |
| Performance | 62/100 |
| SEO | 72/100 |
| Accessibility | 58/100 |
| Compliance | 42/100 |
| UX | 64/100 |
| Code Quality | 60/100 |
| Database | 48/100 |
| **Overall Readiness** | **52/100** |

### SEO note (brief)
`robots.ts` / `sitemap.ts` present with hreflang alternates; auth/PHI disallowed. Gaps: `/contact`/`/clinicians` sitemap coverage; cookie-based lang vs true path locales; structured data limited. Score 72 — not a launch blocker relative to security/clinical gaps.

### Code quality note
Solid patterns in places (atomic submit intent, HMAC admin, CSP). Debt: service-role everywhere, dual models, stubs, thin tests, large content modules. Score 60.

---

## Release Readiness Checklist

| Area | Pass/Fail |
|------|-----------|
| Security | ❌ Fail |
| Authentication | ⚠️ Conditional |
| Authorization | ❌ Fail |
| Database | ❌ Fail |
| APIs | ⚠️ Conditional |
| Assessments (web self) | ✅ Pass |
| Assessments (mobile) | ❌ Fail |
| Exports | ⚠️ Conditional |
| Mobile | ❌ Fail |
| SEO | ✅ Pass |
| Accessibility | ❌ Fail |
| Analytics | ⚠️ Conditional |
| Monitoring | ⚠️ Partial (`/api/health`) |
| Backups / DR | ⚠️ Plan exists; PITR confirm needed |
| Payments | ❌ Absent |
| Clinician workflow | ❌ Fail |
| Admin clinician approvals | ❌ Fail |
| GDPR | ❌ Fail |

---

## Phased Remediation (priority order)

### Phase 0 — Stop the bleeding (approve first)
| # | Issue IDs | Work | Effort (h) |
|---|-----------|------|------------|
| 0.1 | BUG-C008, DB-B5 | Revoke admin matview/RPC from `authenticated` | 6–8 |
| 0.2 | BUG-C007, DB-B1/B4 | Patch critical RLS over-grants | 12–16 |
| 0.3 | BUG-H002 | Allowlist forgot-password `redirectTo` | 1 |
| 0.4 | BUG-H003 | Apply `scrubPHI` to all Gemini routes | 4–6 |
| 0.5 | BUG-C002 | Fix `patient_id` in clinician patients API | 1 |

**Exit:** No anonymous/authenticated non-admin can call admin analytics RPCs; obvious PHI list policies narrowed.

### Phase 1 — Make clinician care real
| # | Issue IDs | Work | Effort (h) |
|---|-----------|------|------------|
| 1.1 | BUG-C001 | Unify relationships vs `assigned_clinician_id` (APIs + RLS + UI) | 24–40 |
| 1.2 | BUG-H007 | Connect race + approve state machine | 5–8 |
| 1.3 | BUG-H009 | Clinician report access via permissions | 2–3 |
| 1.4 | BUG-C009 | Clinician dashboard | 8–12 |
| 1.5 | BUG-H004 | Certificate upload + admin approval UI | 16–28 |
| 1.6 | BUG-M008/M009 | Decline page + login path fix | 3 |

**Exit:** Invite → consent → message → assign → note → report works E2E.

### Phase 2 — AuthN / AuthZ hardening
| # | Issue IDs | Work | Effort (h) |
|---|-----------|------|------------|
| 2.1 | BUG-H001 | Server-side login/register + Turnstile + RL | 6–10 |
| 2.2 | BUG-C006 | Bind admin PHI to `requireAdmin()` / step-up | 12–20 |
| 2.3 | BUG-H005 | Standardize admin route auth | 4–6 |
| 2.4 | BUG-H011 | Per-admin MFA (replace shared PIN) | 16–24 |
| 2.5 | BUG-M010 | Enforce `is_active` | 2–3 |
| 2.6 | BUG-M011 | Canonical permission enum | 4 |

**Exit:** Auth gates not bypassable; admin step-up meaningful.

### Phase 3 — Compliance & integrity
| # | Issue IDs | Work | Effort (h) |
|---|-----------|------|------------|
| 3.1 | BUG-C004 | Real deletion workflow | 16–24 |
| 3.2 | BUG-M005 | Complete GDPR export | 4–6 |
| 3.3 | BUG-C005 | Mobile uses server submit API | 8–12 |
| 3.4 | BUG-H010 | Fix atomic submit caller model | 4 |
| 3.5 | BUG-H006 / H015 | Guest atomic + schema alignment | 8–12 |
| 3.6 | BUG-H008 | Risk dashboard pseudonymization | 2–4 |
| 3.7 | BUG-C003 | Fix package export columns | 2–4 |

**Exit:** Honest privacy claims; single scoring authority.

### Phase 4 — Data platform hygiene
| # | Issue IDs | Work | Effort (h) |
|---|-----------|------|------------|
| 4.1 | BUG-H014 | Recover stub migrations from remote | 16–24 |
| 4.2 | Matview column fix or removal + refresh job | 6–8 |
| 4.3 | Audit immutability + system actor | 6 |
| 4.4 | Role CHECK + signup allowlist | 2 |
| 4.5 | Next.js security upgrade + regression | 8–16 |

**Exit:** Reproducible schema; CI migration sync green.

### Phase 5 — UX / a11y / mobile polish
| # | Issue IDs | Work | Effort (h) |
|---|-----------|------|------------|
| 5.1 | BUG-H013 | ADHD Arabic | 16–24 |
| 5.2 | BUG-M018 | Assessment radiogroup a11y | 4–6 |
| 5.3 | BUG-M016 | Patients/messages mobile layouts | 12–16 |
| 5.4 | BUG-H012 | Mobile crisis + tabs | 6–8 |
| 5.5 | BUG-M017 | Shared loading/error/empty | 6–8 |
| 5.6 | Admin RTL + language | 4–6 |
| 5.7 | Dialog focus traps | 6–8 |
| 5.8 | Contrast token pass | 4 |

**Exit:** WCAG AA on primary flows; usable mobile clinician/patient UX.

### Phase 6 — Product gaps (post-clinical stability)
| Item | Notes | Effort |
|------|-------|--------|
| Payments | Net-new (Stripe, webhooks, entitlements) | Large (40h+) |
| Appointments | Net-new scheduling | Large |
| KPI alert persistence | Schema + UI | 6–8h |
| Research export UX | Fix counters; async jobs | 8–12h |
| Performance code-splitting | PDF/charts/content | 8–12h |
| Expand security tests | Admin bypass, permissions | 8–12h |

---

## Suggested Fix Protocol (after approval)

For each approved issue:

1. Create/continue branch `cursor/<issue-id>-d877` (or sequential commits on audit branch if directed).
2. Implement **only** that issue.
3. Explain what changed and why.
4. Run: `npm run lint`, `npx tsc --noEmit`, `npm run test:security` (and targeted tests).
5. Confirm no unrelated regressions.
6. Commit with message referencing issue ID.
7. Push; update PR.
8. Wait for next approval.

**Do not batch Critical items without explicit permission.**

---

## First Recommended Fix (when approved)

**BUG-C002** — Fix `user_id` → `patient_id` in `app/api/clinician/patients/route.ts`.

Rationale: Smallest critical defect, clear evidence, low blast radius, unblocks clinician patient list accuracy while larger dual-model work is planned.

---

## Risk Matrix

| Risk | Severity | Probability | Impact | Recommendation |
|------|----------|-------------|--------|----------------|
| Cross-patient PHI via RLS | Critical | Medium | Catastrophic | Phase 0 RLS |
| Admin analytics leak | Critical | Medium | Severe | Revoke grants |
| Broken clinician care | Critical | High | Severe | Phase 1 unify model |
| Fake GDPR delete | Critical | High | Regulatory | Phase 3 |
| Auth RL bypass | High | High | Account takeover | Phase 2 |
| AI PHI egress | High | High | Vendor breach | Phase 0 scrub |
| Mobile score tampering | High | Medium | Clinical integrity | Phase 3 |
| Migration unreproducible | High | High | Ops outage | Phase 4 |
| A11y lawsuit / exclusion | Medium | Medium | Harm + legal | Phase 5 |
| No payments | Low (biz) | Certain | Revenue only | Phase 6 |

---

## 30-Day Post-Launch Candidates (only if limited beta)

Acceptable **after** Phase 0–2 minimum for patient-only beta:

- Admin RTL polish
- Chart text alternatives
- KPI alert persistence
- Marketing `/clinicians` page accuracy
- Bundle code-splitting
- Duplicate admin surface cleanup
- Payments (if business requires — otherwise defer)

**Not acceptable post-launch:** open RLS holes, fake deletion, unscrubbed AI PHI, mobile scoring bypass in production stores.

---

## Deliverables Index (`/audit`)

| File | Contents |
|------|----------|
| `architecture-report.md` | System architecture & workflows |
| `security-report.md` | OWASP / ASVS / PHI security |
| `database-report.md` | Schema, RLS, migrations |
| `performance-report.md` | CWV, load, queries, caching |
| `ui-report.md` | UX / responsive / mobile |
| `accessibility-report.md` | WCAG 2.2 AA |
| `bug-report.md` | Prioritized issues with effort |
| `implementation-roadmap.md` | This file — phased plan + verdict |

---

## Approval Gate

Reply with one of:

1. **Approve Phase 0** (start with 0.1 or BUG-C002 as first patch)
2. **Approve single issue ID** (e.g. `BUG-C002`)
3. **Request deeper dive** on a specific report section
4. **Defer** — reports only, no code changes

No implementation will begin until that approval.
