# V Welfare — Implementation Roadmap

**Audit date:** 2026-07-13
**Purpose:** Consolidate every finding from `architecture-report.md`, `security-report.md`, `database-report.md`, `performance-report.md`, `ui-report.md`, `accessibility-report.md`, and `bug-report.md` into one prioritized, sequenced remediation plan.

> **Per the audit brief's Eleventh Task: no fixes have been implemented yet.** This roadmap is the deliverable that requires your review and explicit approval before any code changes begin. Once approved, work should proceed **one issue at a time**, each followed by: an explanation of what changed and why, `npx tsc --noEmit`, `npm run lint`, relevant tests, a check that nothing else broke, and a scoped commit containing only that fix.

---

## How to Read This Roadmap

Each item has:
- **ID** — cross-references the source report (e.g., `SEC-AUTHZ-1` → Security Report finding AUTHZ-1).
- **Severity** — Critical / High / Medium / Low.
- **Location** — exact file(s).
- **Why it matters** — one line, business/clinical framing.
- **Effort** — rough implementation size (Trivial < 1 unit, Low, Medium, High), not a calendar estimate.
- **Depends on** — items that should land first for this fix to be safe/complete.

---

## PHASE 0 — Pre-work / Verification (do first, before any code changes)

| ID | Task | Effort |
|---|---|---|
| V-1 | Run `npm audit` and confirm actual Next.js/dependency CVE status — prior in-repo claim of an upgrade to Next.js 15.5.19 is **not reflected in `package.json`** on this branch. Resolve the discrepancy before trusting any CVE-remediation claim. | Low |
| V-2 | Verify Supabase dashboard settings that cannot be checked from code: session JWT expiry, password policy, password-reset redirect URL allowlist, email confirmation requirement. | Low |
| V-3 | Confirm which of the 68 stub migrations correspond to real, still-active schema — spot-check the production database against `20260619120000_schema_baseline.sql` plus the 32 real migrations to identify any drift (this audit found at least one concrete instance: the admin materialized views referencing nonexistent columns, DB-C1). | Medium |
| V-4 | Re-run `npm run build` to get current, accurate bundle-size numbers (the 275/236/213 kB figures cited in the Performance Report are from 2026-06-24 and are likely stale given how much has been added since). | Low |

---

## PHASE 1 — Critical (block go-live)

These directly threaten patient safety, PHI confidentiality, or clinical data integrity. **Recommend: do not launch to real patients/clinicians until this phase is complete.**

| ID | Finding | Location | Why it matters | Effort |
|---|---|---|---|---|
| **P1-1** | Admin dashboard RPCs callable by any authenticated user with no role check (`SUPA-1` / `DB-C1` companion) | `supabase/migrations/20260627220100_admin_dashboard_rpcs.sql` (8 functions) | Any patient or clinician can retrieve other patients' names/emails and high-risk status directly via PostgREST, completely bypassing the Next.js app | Low |
| **P1-2** | Admin materialized views reference nonexistent columns (`user_type`, `full_name`, `email`) | `supabase/migrations/20260627220000_admin_dashboard_materialized_views.sql` | Views will fail to build/refresh from a clean migration history; indicates undetected git/production drift | Medium |
| **P1-3** | Mobile app computes scores client-side and writes directly to Supabase, bypassing all server validation (`BUG-1`) | `mobile/app/(app)/assessments/[id].tsx` | A modified client can fabricate any score/severity and **suppress the suicidal-ideation high-risk flag** | High |
| **P1-4** | High-risk crisis notifications are fire-and-forget, admin-only, silently swallow failures, no external channel (`BUG-3`) | `app/api/submit-assessment/route.ts` | The one code path that must not fail silently in a mental-health product currently can, with nobody finding out | Medium |
| **P1-5** | `clinical_notes`/`messages` RLS: conflicting duplicate policies widen access beyond the assignment model (`SUPA-3`) | `supabase/migrations/20260624190200_clinical_notes_and_messages_rls.sql` | Patients can read private clinical notes about themselves; unrelated clinicians/patients can message or write notes for each other, bypassing the last line of defense (RLS) | Medium |
| **P1-6** | CAPTCHA and rate limits are not enforced server-side on the actual login/registration credential check (`AUTH-1`/`AUTH-3`) | `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx` | Credential-stuffing/bot-registration defenses are decorative for the two highest-value auth endpoints | Medium |

**Sequencing note:** P1-1 and P1-2 are pure SQL migrations with no application-code dependency — do these first (fast, high impact, low regression risk). P1-5 should be designed together with the Phase 2 authorization-model unification (P2-1) rather than patched in isolation, since a naive fix (just dropping the newer policies) would re-break the new consent system's intended use cases. P1-3 and P1-4 are the two highest-stakes clinical-safety items and should be prioritized by engineering bandwidth even though they are the most effortful items in this phase.

---

## PHASE 2 — High (fix before wide launch / within the first post-launch sprint if a limited beta is chosen instead)

| ID | Finding | Location | Effort | Depends on |
|---|---|---|---|---|
| **P2-1** | Two coexisting, non-integrated clinician-access authorization models (`BUG-2`, Architecture §3.3) | `profiles.assigned_clinician_id` vs. `clinician_patient_relationships` | High (full fix) / Low (interim patch: sync `assigned_clinician_id` on relationship approval) | — |
| **P2-2** | Two admin API routes skip the HMAC/PIN second factor (`AUTHZ-1`) | `app/api/admin/clinician-verifications/route.ts`, `app/api/admin/kpis/[kpiId]/alert/route.ts` | Low | — |
| **P2-3** | Clinician IDOR on assignments endpoint (`AUTHZ-2`) | `app/api/assignments/route.ts` | Low | — |
| **P2-4** | `admin_demographics_summary` materialized view still exposed to `authenticated` (`SUPA-2`) | new migration | Trivial | P1-1/P1-2 (batch together) |
| **P2-5** | PHI sent to Gemini with no consent gate; one route (`packages/interpret`) has no timeout/retry wrapper (`AI consent gap`, `BUG-14`) | `app/api/synthesis`, `ai-chat`, `clinical-notes` PUT, `packages/[id]/interpret` | Medium | — |
| **P2-6** | Guest submission `patient_id: null` conflicts with a `NOT NULL` constraint migration (`DB-H3`/`BUG-4`) | `app/api/submit-assessment-guest/route.ts` vs. `20260627220200_assessment_submissions_constraints.sql` | Medium | — |
| **P2-7** | Clinician "download report" button always 403s (`BUG-6`) | `patients-content.tsx`, `app/api/reports/route.tsx` | Low-Medium | P2-1 (needs a decision on which authorization model gates this) |
| **P2-8** | `on_auth_user_created` trigger dropped in git with no recreate statement (`DB-H1`) | new migration, verify against prod first | Low (but requires careful prod verification) | V-3 |
| **P2-9** | Assessment API allows omitting safety items server-side (`BUG-5`) | `app/api/submit-assessment/route.ts` | Low-Medium | — |
| **P2-10** | Mobile PDF export / GDPR export-delete call nonexistent or incompatible endpoints (`BUG-8`, `BUG-9`) | `mobile/app/(app)/assessments/[id].tsx`, `app/api/user/export-data`, `delete-request` | Medium | — |
| **P2-11** | Mobile mood/journal/messages screens use wrong schema, are hidden/broken (`BUG-10`) | `mobile/app/(app)/mood.tsx` and siblings | Medium (per screen) | — |
| **P2-12** | Missing admin clinician-verification review UI (API-only today) (`BUG-18`) | new page under `app/x/control/(panel)/` | Medium | — |
| **P2-13** | Insights page infinite spinner on session-expiry edge case (`UI-H1`) | `app/(app)/insights/page.tsx` | Trivial | — |
| **P2-14** | Messages page responsive height conflict (`UI-H2`) | `app/(app)/messages/page.tsx`, `(app)/layout.tsx` | Low-Medium | — |
| **P2-15** | Patients table has no responsive/mobile fallback (`UI-H3`) | `patients-content.tsx` | Medium | — |
| **P2-16** | Register "agree to terms" is a fake, keyboard-inaccessible checkbox (`ACC-H2`) | `app/(auth)/register/page.tsx` | Low-Medium | — |
| **P2-17** | Profile page form fields have zero `htmlFor`/`id` pairing (`ACC-H1`) | `app/(app)/profile/page.tsx`, `app/onboarding/page.tsx` | Medium | — |
| **P2-18** | Journal cards / patient table rows are keyboard-inaccessible (`ACC-H3`/`ACC-H4`) | `app/(app)/journal/page.tsx`, `patients-content.tsx` | Low each | — |
| **P2-19** | ADHD Zone Checker is English-only despite accepting a `lang` prop (`ACC-C1`) | `components/adhd-zone-checker.tsx` | Medium | — |

---

## PHASE 3 — Medium (address within the first 30 days post-launch, or before launch if timeline allows)

Grouped by theme; see the individual reports for full evidence and code-level fix direction.

**Security/Auth:**
- Timing-unsafe HMAC/PIN comparisons (`AUTH` timing note) — Low
- `forgot-password` unvalidated `redirectTo` — Low
- Registration error-message account enumeration — Low
- Unvalidated `requested_permissions` on access requests / clinician invites (`AUTHZ-4`) — Low
- Admin package PATCH mass-assignment (`AUTHZ-5`) — Low
- Orphaned `/admin/settings` page has no admin gate (`AUTHZ-6`) — Trivial
- Several sensitive GET endpoints lack rate limiting (`export-data`, `admin/analytics`, `admin/research`, `connect/[token]`) — Low-Medium
- `/api/admin/kpis/history` leaks raw DB error message — Trivial

**Database:**
- `profiles.role` / `assessment_submissions.severity_band` missing CHECK constraints — Low
- `current_user_role()` dormant recursion-risk function — should be dropped — Trivial
- `package_sessions.user_id` FK inconsistency (`auth.users` vs. `profiles`) — Low
- Missing FK indexes (`messages.sender_id`, `notification_log.recipient_id`, etc.) — Low
- `messages`/`clinical_notes` FKs use default `NO ACTION` instead of a deliberate delete policy — Medium

**Performance:**
- No RUM/Core Web Vitals instrumentation (`PERF-1`) — Trivial
- `recharts` not code-split on chart-heavy pages (`PERF-2`) — Medium
- `lib/assessment-content.ts` not split per assessment (`PERF-3`) — Medium-High
- Admin analytics/research in-memory aggregation at scale (`PERF-5`) — Medium-High
- Export endpoints load full result sets into memory; `packages/export` has no row cap (`PERF-6`) — Medium
- No committed load-test results to verify capacity claims — Medium (process, not code)

**UI/Accessibility (Medium tier):**
- Design-system fragmentation (raw Tailwind gray vs. CSS tokens) — Medium-High
- Dark-mode gaps: severity badges, patients page, error page (`UI-M6/M7`) — Low-Medium
- Color-contrast token fixes (`--text-muted`, `--text-icon`, `text-gray-400`) (`ACC-M11`) — Low-Medium
- RTL polish: directional icons, physical CSS properties, select chevron (`ACC-M8/M9/M10`) — Medium
- Missing `aria-label`/`role="alert"`/heading-hierarchy fixes across several pages (`ACC-M1-M7`) — Low each, Medium in aggregate
- Shared `PageLoading`/`PageError`/`PageEmpty` component extraction and rollout (`UI` loading-states section) — Medium

**Bugs/workflow:**
- Admin mutation endpoints missing audit-log entries (assessment toggle, flags, settings, announcements) (`BUG-15`) — Low
- Missing confirmation dialogs on destructive admin actions (`BUG-16`) — Low
- Admin users list has no pagination beyond 200 rows (`BUG-17`) — Low-Medium
- Notification deep-link 404 (`/clinician/patients`) (`BUG-7`) — Trivial
- Guest submission not transactional (`BUG-11`) — Low-Medium
- No idempotency protection on assessment submission (`BUG-12`) — Low
- Package AI interpretation missing timeout/retry wrapper (`BUG-14`) — Low
- Orphaned/dead endpoints and pages: `score-assessment`, `packages/interpret`, `admin/kpi-dashboard` (unlinked), `admin/settings` (`BUG-18`) — Low (removal) to Medium (wiring)

---

## PHASE 4 — Low (housekeeping, cosmetic, backlog-appropriate)

- Dashboard "Last 1 days" grammar (`BUG-19`) — Trivial
- Dead code: `lib/rate-limit/redis.ts`, `current_user_role()` (`BUG-20/21`) — Trivial
- Duplicate skip-to-content links (`ACC`/`UI`) — Trivial
- Localize password-toggle `aria-label` for Arabic — Trivial
- `lib/types/kpi.ts` referencing nonexistent columns/tables (`BUG-23`) — document or clean up as the KPI feature evolves
- No page-specific `<title>` metadata on several static pages (carried over from a prior audit, not independently re-verified in this pass but plausible given no fix was evidenced in code) — Low

---

## Suggested Execution Order (Dependency-Aware)

```
Phase 0 (verification) — do in parallel with nothing; establishes ground truth
  │
  ▼
P1-1, P1-2 (pure SQL, independent, do first) ──┐
P2-4 (batch with P1-1/P1-2)                     │
                                                 ├──► P1-5 (RLS unification, needs P2-1 design decision)
P2-1 interim patch (sync assigned_clinician_id) ┘        │
                                                            ▼
P1-6 (auth hardening, independent) ──────────────────► P2-2, P2-3 (authz fixes, independent, do anytime)

P1-3 (mobile scoring fix) ──► P2-10, P2-11 (mobile follow-ups depend on the same API/auth work)
P1-4 (crisis notification reliability) — independent, start immediately, high priority

P2-5 (AI consent) — independent
P2-6 (guest schema) — independent
P2-7 (clinician reports) — depends on P2-1 decision
P2-8 (auth trigger) — depends on V-3 production verification
P2-9 (safety-item enforcement) — independent, pairs naturally with P1-4

UI/Accessibility High items (P2-13 through P2-19) — independent of the security work,
  can be parallelized with a different engineer/session once Phase 1 is underway

Phase 3 and 4 — schedule opportunistically; none of these block a go-live decision
  on their own, but the Medium security items (timing-safe comparisons, mass-assignment,
  unvalidated permission arrays) are cheap enough that batching them with Phase 1/2 work
  is efficient.
```

---

## Go-Live Recommendation

Applying the same rigor requested by this repository's own `CLAUDE.md` go-live audit template: given 1 unresolved Critical clinical-safety/data-integrity finding in the mobile app, 1 Critical direct-PHI-exposure database finding, and a crisis-notification reliability gap that is Critical in effect even though it's categorized as High severity by conventional security taxonomy, this audit's recommendation is:

## ⚠️ DO NOT GO LIVE with real patients until Phase 1 is complete.

A **limited internal beta** (staff/test accounts only, no real patient PHI, mobile app disabled or explicitly marked "preview — do not use for real assessments") is reasonable while Phase 1 is executed, consistent with how this repository's own prior audits have staged rollout. Full public/production launch, and definitely any launch that includes the mobile app for real patients, should wait for Phase 1 completion and independent re-verification (not just a re-read of this document).

---

## Next Step (per the audit brief's Eleventh Task)

**No code changes have been made.** This roadmap, together with the seven companion reports in `/audit/`, is the checkpoint for your review and approval. Once you approve, the recommended approach is:

1. Confirm or adjust the phase groupings/priorities above based on business context this audit doesn't have visibility into (e.g., whether the mobile app is even in active use, whether a beta vs. full launch is planned).
2. Work through Phase 1 items one at a time in the sequence above, each with its own explanation, `npx tsc --noEmit`, `npm run lint`, relevant test run, and a scoped commit — no batching of unrelated fixes into one commit.
3. Re-run the affected report's verification steps after each fix (e.g., re-check the RLS policy SQL after P1-5, re-test mobile submission parity after P1-3) rather than assuming the fix is complete once the code compiles.
