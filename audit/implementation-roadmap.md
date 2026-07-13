# V Welfare Executive Go-Live Report and Implementation Roadmap

**Audit date:** 2026-07-13  
**Overall readiness:** **48/100**

## Executive summary

V Welfare has substantial product breadth: bilingual psychometric assessments, patient tracking, clinician connection concepts, administrative analytics, PDF exports, AI assistance, and a mobile companion. It also has several mature controls, including nonce CSP, HSTS, Supabase RLS coverage, audit logging, rate limiting, high-risk notifications, and a second-factor-like admin PIN/HMAC session.

Those strengths are outweighed by verified access-control failures. The live signup trigger trusts user-editable role metadata, and live RLS lets clinicians read unrelated patients’ sensitive records. Overlapping policies weaken private notes and messaging controls. The production database is 17 migrations ahead of this checkout, while the production Vercel deployment is 45 commits ahead, so the repository state cannot reproduce or fully certify production. PHI sent to Gemini lacks consistent minimization and governance.

The patient and clinician workflows are also incomplete or contradictory: two relationship models disagree; guest submissions conflict with the live schema; appointments are absent; uploads are URL placeholders; mobile submissions bypass web clinical validation; and payment code is not present in this checkout despite payment tables existing live.

For founders and investors: the platform demonstrates meaningful engineering progress, but the current control environment is not suitable for real mental-health PHI, clinicians, or payments. Launching before remediation creates a credible risk of unauthorized patient-data access and an inability to prove or restore the deployed system.

## Final scores

| Domain | Score |
|---|---:|
| Security | 42/100 |
| Functionality | 58/100 |
| Performance | 58/100 |
| SEO | 76/100 |
| Accessibility | 61/100 |
| Healthcare/GDPR compliance | 38/100 |
| UX | 68/100 |
| Code quality | 62/100 |
| **Overall readiness** | **48/100** |

## Risk matrix

| Risk | Severity | Probability | Impact | Recommendation |
|---|---|---:|---|---|
| signup role escalation | Critical | High | privileged access and PHI breach | force patient role and audit privileged accounts |
| clinician cross-patient RLS | Critical | High | reportable mental-health data breach | relationship/permission-scoped policies |
| private notes/messages policy overlap | Critical | Medium–High | confidentiality and record-integrity breach | replace overlapping policies |
| source/database drift | Critical | High | failed recovery and uncertified controls | reconcile migrations/production source |
| ungoverned Gemini PHI | High | High | processor/privacy/regulatory exposure | minimize, de-identify, contract and consent |
| dual clinician relationship models | High | High | broken consent and clinical workflows | one canonical relationship model |
| vulnerable Next.js version | High | Medium | known request/authorization/DoS exposure | supported patched upgrade |
| mobile validation bypass | High | High | incorrect clinical scores/risk signals | validated API/RPC only |
| missing upload controls | High | High when enabled | forged or exposed license documents | private scanning pipeline |
| unverified payments | High | Medium | financial loss/entitlement disputes | production-source and Stripe E2E audit |
| no monitoring/CI/restore proof | High | Medium | delayed detection and recovery | telemetry, gates, restore drill |
| WCAG keyboard/mobile failures | High | High | exclusion and compliance failure | semantic controls and device testing |

## Final decision

❌ **DO NOT GO LIVE**

This decision is based on live evidence, not code-style preference. An unauthenticated caller can influence initial authorization role, and a clinician role can access unrelated patients through current RLS. Both violate the minimum access-control expectations for a mental-health platform. Production cannot be certified or reliably rebuilt from this checkout.

## Release readiness checklist

| Area | Status | Release condition |
|---|---|---|
| Security | **FAIL** | critical access-control findings closed and independently tested |
| Authentication | **FAIL** | signup role fixed; password/session controls verified |
| Authorization | **FAIL** | cross-patient RLS and policy overlap fixed |
| Database | **FAIL** | production migrations reconciled and clean rebuild passes |
| APIs | **FAIL** | centralized auth, validation, rate and adversarial tests |
| Assessments | **FAIL** | guest/mobile paths aligned and scoring regression suite |
| Exports | Conditional | recent-auth/rate/privacy tests; clinician permissions aligned |
| Mobile | **FAIL** | secure sessions, validated submissions, a11y/device tests |
| Payments | **NOT CERTIFIED** | production source + Stripe test-mode webhook/entitlement evidence |
| Uploads | **NOT IMPLEMENTED LOCALLY** | private bucket, validation, AV, signed access |
| Appointments | **ABSENT** | implement or remove launch claim |
| SEO | Conditional pass | sitemap/metadata/canonical cleanup |
| Accessibility | **FAIL** | WCAG 2.2 AA test matrix passes |
| Analytics/research | **FAIL for research** | purpose/consent/de-identification governance |
| Monitoring | **FAIL** | structured telemetry, alerts, incident ownership |
| Backups | Conditional | PITR and retention confirmed |
| Disaster recovery | **FAIL** | timed restore drill meets RPO/RTO |

## Phase 0 — Immediate containment

Complete each item separately, with lint, typecheck, focused tests, build, and a related-only commit.

1. Disable or constrain privileged-role signup.
2. Review all current clinician/admin/superadmin profiles and creation provenance.
3. Revoke suspicious sessions.
4. Temporarily disable clinician direct access to broad PHI tables.
5. Disable AI endpoints that can send raw PHI until governance is approved.
6. Disable guest persistence because it conflicts with live constraints.
7. Freeze schema changes until migration drift is reconciled.

Estimated engineering effort: **8–16 hours**, excluding incident/legal review.

## Phase 1 — Security and data boundary

### 1.1 Safe role provisioning

- hard-code new users to patient;
- introduce server-only clinician application/approval;
- retain admin provisioning as superadmin-only audited action;
- add DB constraints and signup tests.

Effort: **6–10 hours**.

### 1.2 RLS redesign

- define canonical relationship/permission semantics;
- replace role-only PHI policies;
- remove overlapping policies;
- revoke unsafe function grants;
- test anon, patient A/B, clinician A/B, admin, superadmin.

Effort: **32–52 hours**.

### 1.3 AI privacy boundary

- inventory every field sent to Gemini;
- block direct identifiers and free-form clinical notes by default;
- de-identify structured scores;
- define region/retention/vendor agreement;
- present consent/provenance and audit use;
- clinically evaluate output safety.

Effort: **16–32 engineering hours**, plus legal/clinical review.

### 1.4 Framework/dependency upgrade

- upgrade Next.js and ESLint config;
- rerun App Router, middleware, auth, PDF and CSP tests;
- gate npm audit.

Effort: **12–24 hours**.

## Phase 2 — Reproducibility and workflow integrity

### 2.1 Reconcile production

- fetch all 17 missing migrations;
- compare production `main` to this branch;
- generate canonical types;
- build an empty database from migrations;
- schema-diff it against production;
- document approved differences.

Effort: **16–32 hours**.

### 2.2 Unify clinician consent

- retire `assigned_clinician_id` as authorization source;
- migrate active assignments to relationship records;
- use one permission enum;
- adapt messages, notes, assignments, reports, notifications, and patient list;
- preserve an auditable consent timeline.

Effort: **24–40 hours**.

### 2.3 Assessment integrity

- route mobile through validated submission;
- recompute scores server-side;
- validate item membership/range/completeness;
- separate guest data;
- test high-risk escalation and interrupted sessions.

Effort: **20–32 hours**.

## Phase 3 — Product-critical gaps

| Workstream | Required scope | Effort |
|---|---|---:|
| license uploads | private bucket, signed URLs, type/size checks, malware scan, reviewer access, retention | 16–32h |
| appointments | timezone scheduling, clinician availability, cancellation, reminders, audit, emergency boundary | 32–60h |
| payments | Stripe signature/idempotency, server price authority, entitlements, receipts, refunds/disputes, reconciliation | 24–48h after source audit |
| notifications | merge event/inbox models, deep-link tests, user preferences | 8–16h |
| research | protocol/purpose/consent/cohort/export controls or remove “research” designation | 24–48h |

Healthcare logic must not be compressed to meet these estimates; clinical/legal review is additional.

## Phase 4 — Accessibility, UI, and performance

1. Replace non-native consent and clickable card controls.
2. label every web/mobile control and expose states/progress.
3. redesign mobile messaging.
4. complete clinically reviewed Arabic parity and RTL.
5. split assessment/admin client bundles.
6. replace JavaScript analytics aggregation.
7. align Vercel/Supabase regions after residency review.
8. run CWV and staged load tests.

Estimated engineering effort: **48–88 hours**, plus translation and assistive-technology testing.

## Phase 5 — Operational certification

- CI: lint, typecheck, unit, API, RLS, migration, build, accessibility, dependency scan;
- privacy-safe structured logs and correlation IDs;
- error/APM and uptime alerts;
- security incident runbook and on-call ownership;
- PITR verification and restore drill;
- Stripe reconciliation and webhook replay drills;
- backup retention/deletion policy;
- vulnerability and access reviews.

Effort: **32–56 hours**.

## Required verification after every fix

The user requested one issue at a time. For each approved issue:

1. document the threat/acceptance criteria;
2. make only the related change;
3. add a regression test;
4. run `npm run lint`;
5. run `npx tsc --noEmit`;
6. run relevant unit/integration/RLS tests;
7. run `npm run build`;
8. verify production-like behavior without real PHI;
9. commit only related files;
10. update this checklist.

Database changes additionally require advisor checks and an explicit rollback/recovery plan.

## Go-live evidence package required

- clean migration replay and production schema diff;
- independent penetration-test report;
- RLS cross-tenant test results;
- auth/session test evidence;
- assessment scoring golden tests;
- mobile device and browser matrix;
- WCAG automated/manual results;
- Stripe test-mode payment/refund/webhook evidence;
- load and Core Web Vitals results;
- PITR restore drill report;
- AI data-flow inventory and processor agreements;
- signed clinical review of assessment and AI safety content;
- legal approval of privacy, consent, emergency, retention, and data-subject workflows.

## 30-day post-launch candidates

Only after all launch blockers pass:

- remove genuinely unused indexes after observation;
- consolidate dead components;
- expand public SEO metadata;
- refine dark-mode consistency;
- improve skeleton loading;
- add richer product analytics with consent;
- optimize non-critical admin charts.

No critical/high authorization, clinical-integrity, payment-integrity, accessibility blocker, or recovery gap belongs in a post-launch backlog.

