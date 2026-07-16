# V Welfare — Phase 2.3 Authorization Security Audit

**Date:** 2026-07-15
**Auditor:** Claude — Principal Software Architect & Security Engineer
**Method:** End-to-end authorization trace (login → API → server validation → Supabase query → RLS → returned data) against the live production project, plus source review. Read-only; no code, schema, or data changed during the audit.

---

## Executive Summary

**Overall authorization health: MIXED — strong at the API/validation layer, incomplete at the RLS (data) layer.**

The permission *model* is clean and single-sourced, the Phase 1 / 2.1 / 2.2 work is solid, and RLS is enabled on all 60 public tables. **However, the core audit question — "can a clinician access _only_ the patient data explicitly authorized through `relationship_permissions`?" — is answered NO.** Phase 2.1 consolidated 7 patient-data tables onto the relationship model, but **~8 other patient-data tables still carry broad `role = clinician` RLS policies** that let _any_ clinician read _all_ patients' rows regardless of relationship or granted permission. Because the app reads these tables through the browser Supabase client, RLS is the security boundary — and for these tables it is relationship-agnostic.

- **Security rating:** HIGH RISK (authorization-enforcement gap on PHI tables).
- **Live blast radius (today):** limited — 1 clinician, 5 patients, **0 active relationships, 0 legacy assignments**, and most affected tables empty. This is a **design/control gap not yet materially exploited**, but it fails at scale and for the data classes that most require least-privilege.
- **Production readiness:** **NOT READY FOR PRODUCTION** pending relationship-scoping of the broad clinician RLS policies (Finding F-1).

---

## Critical Findings

None *currently exploitable at scale* (affected PHI tables largely empty; 0 clinician–patient relationships). The High findings below become **Critical** once real clinical data and multiple clinicians are onboarded.

---

## High Findings

### F-1 — Broad clinician read on PHI tables bypasses the permission model — **High → Critical at scale**

Any authenticated user with `role='clinician'` can read **every** patient's data in these tables with **no** `clinician_patient_relationships` row and **no** `relationship_permissions` grant:

| Table | Policy | Cmd | Live `qual` |
|---|---|---|---|
| `pdf_reports` | `pdf_reports_clinician` | SELECT | `get_my_role() = ANY (ARRAY['clinician','admin','superadmin'])` |
| `ai_insights` | `insights_clinician` | SELECT | same |
| `personality_results` | `personality_clinician` | SELECT | same |
| `chat_sessions` | `chat_clinician_read` | SELECT | same |
| `medications` | `meds_clinician` | SELECT | same |
| `medication_alerts` | `alerts_clinician` | SELECT | same |
| `patient_profiles` | `patient_prof_clinician` | SELECT | same |
| `gratitude_entries` | `gratitude_clinician` | SELECT | same |
| `journal_entries` | `journal_clinician_shared` | SELECT | `is_shared = true AND role IN (clinician,…)` |

- **Risk:** cross-patient PHI exposure (clinical PDF reports, AI mental-health insights, personality results, AI chat, medication lists/alerts, demographics, shared journals) to any clinician — a least-privilege / patient-isolation failure.
- **Contrast:** the 7 Phase 2.1 tables (`assessment_submissions`, `assessment_responses`, `assessment_assignments`, `clinical_notes`, `messages`, `mood_logs`, `user_consents`) correctly use `has_clinician_access(...)`. These 8 were never migrated onto it.
- **Amplifier to verify:** if `role='clinician'` can be self-assigned at registration (independent of `clinician_verifications`), even unverified accounts inherit this broad read.
- **Current data:** `pdf_reports`=0, `ai_insights`=0, `medications`=0, `chat_sessions`=0; but `personality_results`=1, `patient_profiles`=7, `journal_entries`=3 are already readable by the single clinician regardless of authorization.

---

## Medium Findings

### F-2 — `has_clinician_access()` legacy arm grants ALL permissions — **Medium (currently inert)**
The primitive returns true if `check_relationship_permission(...)` **OR** `profiles.assigned_clinician_id = clinician`. The legacy arm is permission-agnostic, so a legacy-assigned clinician bypasses per-key grants. Inert in prod today (`legacy_assigned = 0`), but a standing least-privilege gap until `assigned_clinician_id` is retired.

### F-3 — No audit logging of clinician PHI access — **Medium**
`audit_log` covers the permission/relationship lifecycle well (`access_request_*`, `permission_modified`, `invitation_*`, `verification_*`, `access_revoked`) and the superadmin drill-down (`admin_view_user_assessments`). Routine **clinician reads** of patient submissions, notes, mood, reports, etc. are **not** logged — an access-accountability gap.

### F-4 — `view_reports` permission is not enforced by any policy — **Medium**
`view_reports` exists in the canonical model and CHECK constraint, but report visibility (`pdf_reports`) is gated by the broad F-1 policy, not by `has_clinician_access(..., 'view_reports')`. Granting/denying `view_reports` has no effect on actual report access.

---

## Low Findings

- **F-5 — `upload_documents` has no enforcement surface** — no `documents` table maps to it (`consent_documents` is admin-only); the key is defined but unused.
- **F-6 — Redundant overlapping SELECT policies on `messages`** (`messages_read` + `msg_participant_read`, both participant-scoped) — cosmetic; both correct.
- **F-7 — `view_progress_tracking` has no dedicated enforced resource** — derived from already-scoped submissions.

---

## Permission Matrix (intended actor vs. **actual enforced** behavior)

| Permission | Patient (self) | Authorized clinician | Unauthorized clinician | Unauth user | Enforcement |
|---|---|---|---|---|---|
| view_profile | ✓ | ✓ (user_consents scoped) | should block — **`patient_profiles` broad ❌** | blocked | Partial (F-1) |
| view_assessment_results | ✓ | ✓ | blocked ✅ (submissions/responses) | blocked | **Enforced** |
| view_assessment_history | ✓ | ✓ | blocked ✅ (assignments) | blocked | **Enforced** |
| view_reports | ✓ | ✓ | **any clinician reads all `pdf_reports` ❌** | blocked | **Gap (F-1/F-4)** |
| view_progress_tracking | ✓ | ✓ (via submissions) | blocked ✅ (derived) | blocked | Indirect (F-7) |
| view_mood_tracking | ✓ | ✓ | blocked ✅ (mood_logs) | blocked | **Enforced** |
| export_reports | ✓ | n/a | blocked ✅ (`/api/reports` self-or-admin) | blocked | **Enforced** |
| message_patient | ✓ | ✓ | blocked ✅ (messages participant) | blocked | **Enforced** |
| upload_documents | — | — | — | blocked | No surface (F-5) |
| generate_clinical_notes | read-own | ✓ | blocked ✅ (clinical_notes) | blocked | **Enforced** |
| *(outside model)* ai_insights / personality / medications / chat / journals | ✓ | ✓ | **any clinician reads all ❌** | blocked | **Gap (F-1)** |

---

## Database Security Assessment — **PASS with exceptions**

- **PASS:** RLS enabled on all 60 public tables; `relationship_permissions.permission_key` CHECK = exactly the canonical 10 keys (matches `lib/types.ts` `ALL_PERMISSION_KEYS`); Phase 2.1 tables verified relationship-scoped via `has_clinician_access()`; `session_notes` scoped via assignments; payments/stripe/admin tables admin-scoped.
- **FAIL (F-1):** 8 patient-data tables use broad `role=clinician` SELECT policies instead of relationship scoping.

## API Authorization Assessment — **PASS**

Every reviewed state-changing / permission endpoint performs auth → identity → authorization → permission validation → ownership: admin routes use `requireAdmin()` / `verifyAdminSession()` (HMAC `admin_session`); `assignments`, `clinical-notes`, `notify-message` use `has_clinician_access`; `access-requests`, `connect`, `relationships/[id]/permissions`, `clinician/invite` use the canonical `validatePermissionKeys()`; `/api/reports` is self-or-admin. No IDOR found in reviewed endpoints; the only API route touching F-1 tables (`user/export-data`) is correctly self-scoped. **The gap is at RLS, not the API.**

## RLS Assessment — **FAIL (blocking)**

The API cannot compensate: the F-1 tables are read directly via the browser Supabase client, so RLS is authoritative — and it is relationship-agnostic for those tables.

---

## Recommended Remediation Roadmap

**Phase 1 — Production blockers**
1. Re-scope the F-1 clinician SELECT policies onto `has_clinician_access(auth.uid(), <patient_id>, '<key>')`, mirroring Phase 2.1. Proposed mappings: `pdf_reports → view_reports`; `ai_insights`, `personality_results → view_assessment_results`; `medications`, `medication_alerts → view_profile` (or a dedicated medical key); `patient_profiles → view_profile`; `journal_entries`, `gratitude_entries → view_progress_tracking`; `chat_sessions → view_assessment_results`. Confirm each table retains an owner-self policy.
2. Confirm `role='clinician'` cannot be self-granted without verification.

**Phase 2 — Security improvements**
3. Add audit logging for clinician PHI reads (F-3).
4. Wire `view_reports` / `view_progress_tracking` to real enforcement or document them as coarse (F-4 / F-7).

**Phase 3 — Architecture improvements**
5. Retire the `has_clinician_access` legacy arm once `assigned_clinician_id` is deprecated (F-2); resolve `upload_documents` (F-5) and the redundant `messages` policy (F-6).

---

## Final Decision

### ❌ NOT READY FOR PRODUCTION

Tracing to the RLS layer shows that for `pdf_reports`, `ai_insights`, `personality_results`, `chat_sessions`, `medications`, `patient_profiles`, and journals, **any clinician can read any patient's data with no relationship and no permission grant.** The strong API/permission-model work (Phase 1 / 2.1 / 2.2) is undermined because these tables never joined the relationship-scoped model. The single required remediation to reach **READY WITH MINOR FIXES** is Phase 1 above. Live exposure is currently small (empty tables, 1 clinician, 0 relationships), so the fix is low-risk and non-breaking — but it must land before real clinical data and multiple clinicians go live.

---

*Scope note: technical authorization audit, not a compliance certification. It identifies alignment gaps against least-privilege, data-minimization, and access-accountability principles; it does not assert GDPR/HIPAA certification.*
