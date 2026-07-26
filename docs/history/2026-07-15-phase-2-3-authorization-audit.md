> **ARCHIVED — historical record.** Preserved verbatim below; only this archival header was added.
>
> - **Original PR:** #62
> - **Original author:** Cursor agent (billed as "Claude Principal Software Architect")
> - **Original date:** 2026-07-15
> - **Reason archived:** PR #62 closed during the v1.0.0 release-freeze repository cleanup; retained for provenance.
> - **Current status:** **Superseded by `main`.** This documentation-only audit's critical findings (AUTHZ-C01…C04) drove the clinician-authorization remediation now live on `main` — `20260715130436_consolidate_clinician_authorization`, `20260716092011_scope_clinician_phi_rls_to_relationship`, `20260716133945_harden_signup_role_assignment`, `20260716205251_phase_3_0_db_cleanup`. The canonical `has_clinician_access(clinician, patient, permission_key)` model is enforced on current `main`. The point-in-time "NOT READY" verdict below reflects the `f974762` baseline, **not** current `main`.

---

# V Welfare Phase 2.3 Authorization Security Audit

**Date:** 15 July 2026  
**Auditor:** Claude Principal Software Architect  
**Code baseline:** `origin/main` @ `f974762` (includes Phase 2.1, 2.2, PR #61)  
**Live database:** Supabase project `wyzezyctpvlohuuhzyof`  
**Scope:** End-to-end clinician–patient authorization enforcement (audit only; no code or migration changes)

---

## Executive Summary

**Overall authorization health:** Partial. The permission *model* is canonical and validated at grant-time (Phase 2.2). Enforcement at read/write time is inconsistent across API and RLS layers.

**Security rating:** 48 / 100 for the stated goal ("clinician may access ONLY data explicitly authorized through `relationship_permissions`").

**Production readiness:** **NOT READY FOR PRODUCTION** against that goal.

Phase 2.1/2.2 correctly introduced `has_clinician_access()`, a CHECK constraint on `relationship_permissions.permission_key`, and `validatePermissionKeys()`. Several PHI tables are correctly gated. However:

1. The legacy `profiles.assigned_clinician_id` arm of `has_clinician_access()` grants **full access ignoring permission keys**.
2. Revoke does **not** clear `assigned_clinician_id`, so revoked clinicians may retain access.
3. Legacy permissive RLS policies remain alongside hardened ones (notably `messages.msg_participant_insert`).
4. Several tables still allow **any authenticated clinician** to SELECT patient PHI (`patient_profiles`, `gratitude_entries`, shared `journal_entries`, `pdf_reports`).
5. Most of the 10 permission keys are **not enforced** in APIs; some have no RLS binding at all.

**Bottom line:** A clinician cannot yet be trusted to see "only what the patient granted." Consent keys are advisory for many data planes.

---

## Critical Findings

### AUTHZ-C01 — Legacy `assigned_clinician_id` bypasses permission keys

| Field | Value |
|-------|--------|
| **Severity** | Critical |
| **Layer** | Database (`has_clinician_access`) → all RLS/API callers |
| **Risk** | Any clinician linked via `profiles.assigned_clinician_id` passes `has_clinician_access(..., p_permission)` for **every** permission string, regardless of `relationship_permissions.granted`. |

Phase 2.1 migration also backfilled active relationships with **all 10 keys granted** for legacy assignments, amplifying over-grant.

### AUTHZ-C02 — Access revoke does not clear legacy linkage

| Field | Value |
|-------|--------|
| **Severity** | Critical |
| **Endpoint** | `PATCH /api/access-requests/[id]` action=`revoke` |
| **Risk** | Revoke sets relationship `status='revoked'` and audits the action, but does **not** set `relationship_permissions.granted=false` or clear `profiles.assigned_clinician_id`. The legacy OR arm may still authorize full PHI access. |

### AUTHZ-C03 — Dual messaging INSERT policies bypass `message_patient`

| Field | Value |
|-------|--------|
| **Severity** | Critical |
| **Table** | `messages` |
| **Risk** | Postgres OR's permissive policies. Insert succeeds if **either** `messages_insert` (hardened) or `msg_participant_insert` (legacy, participant-ID-match only, no `message_patient` check) allows. |

### AUTHZ-C04 — Broad clinician SELECT on PHI tables (role-only)

| Field | Value |
|-------|--------|
| **Severity** | Critical |
| **Tables** | `patient_profiles`, `gratitude_entries`, `journal_entries`, `pdf_reports` |
| **Risk** | Any user with `get_my_role() ∈ {clinician, admin, superadmin}` can SELECT rows with no relationship or permission check. Cross-patient PHI disclosure / IDOR at the database layer. |

---

## High / Medium / Low Findings (summary)

- **AUTHZ-H01** Permission keys largely unenforced in APIs (only `view_assessment_history`, `generate_clinical_notes`, `message_patient` checked at runtime).
- **AUTHZ-H02** `/api/reports` denies clinicians; `view_reports`/`export_reports` unused.
- **AUTHZ-H03** Admin/superadmin skip relationship checks on clinical notes (no HMAC session).
- **AUTHZ-H04** Approve path does not clamp granted ⊆ requested permissions.
- **AUTHZ-H05** `/api/clinician/patients` queries non-existent `user_id` column (live is `patient_id`).
- **AUTHZ-M01** Partial RLS key coverage. **M02** `profiles` vs `view_profile` mismatch. **M03** Sparse PHI-read audit logging. **M04** Service role for `last_access_at`. **M05** `FORCE ROW LEVEL SECURITY` not enabled.
- **AUTHZ-L01** Messages UI legacy pairing. **L02** `upload_documents` unimplemented. **L03** Test gap on live dual policies.

*(Full evidence tables, permission matrix, privilege-escalation review, remediation roadmap, effort estimates, and appendices are preserved in the original document in git history on branch `cursor/authorization-enforcement-audit-25f2`. The critical and high findings above were the actionable core; all were addressed by the consolidation/relationship-scoping migrations now live on `main`.)*

---

## Final Decision (point-in-time, `f974762` baseline)

# NOT READY FOR PRODUCTION

**Why (at the time):** the product claim — a clinician may access **only** patient data authorized through `relationship_permissions` — was false for messaging inserts, multiple PHI tables, and any patient still linked by `assigned_clinician_id` (including after revoke). Phase 2.1/2.2 established the consent model; Phase 2.3 enforcement was incomplete.

**Disposition:** the criticals were subsequently remediated on `main` (see archival header). This verdict does not describe current `main`.

*End of Phase 2.3 Authorization Security Audit — no code or schema changes were made as part of this engagement.*
