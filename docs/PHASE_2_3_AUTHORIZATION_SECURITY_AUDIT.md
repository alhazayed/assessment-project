# V Welfare Phase 2.3 Authorization Security Audit

**Date:** 15 July 2026  
**Auditor:** Claude Principal Software Architect  
**Code baseline:** `origin/main` @ `f974762` (includes Phase 2.1, 2.2, PR #61)  
**Live database:** Supabase project `wyzezyctpvlohuuhzyof`  
**Scope:** End-to-end clinician–patient authorization enforcement (audit only; no code or migration changes)

---

## Executive Summary

**Overall authorization health:** Partial. The permission *model* is canonical and validated at grant-time (Phase 2.2). Enforcement at read/write time is inconsistent across API and RLS layers.

**Security rating:** 48 / 100 for the stated goal (“clinician may access ONLY data explicitly authorized through `relationship_permissions`”).

**Production readiness:** **NOT READY FOR PRODUCTION** against that goal.

Phase 2.1/2.2 correctly introduced `has_clinician_access()`, a CHECK constraint on `relationship_permissions.permission_key`, and `validatePermissionKeys()`. Several PHI tables are correctly gated. However:

1. The legacy `profiles.assigned_clinician_id` arm of `has_clinician_access()` grants **full access ignoring permission keys**.
2. Revoke does **not** clear `assigned_clinician_id`, so revoked clinicians may retain access.
3. Legacy permissive RLS policies remain alongside hardened ones (notably `messages.msg_participant_insert`).
4. Several tables still allow **any authenticated clinician** to SELECT patient PHI (`patient_profiles`, `gratitude_entries`, shared `journal_entries`, `pdf_reports`).
5. Most of the 10 permission keys are **not enforced** in APIs; some have no RLS binding at all.

**Bottom line:** A clinician cannot yet be trusted to see “only what the patient granted.” Consent keys are advisory for many data planes.

---

## Critical Findings

### AUTHZ-C01 — Legacy `assigned_clinician_id` bypasses permission keys

| Field | Value |
|-------|--------|
| **Severity** | Critical |
| **Layer** | Database (`has_clinician_access`) → all RLS/API callers |
| **Risk** | Any clinician linked via `profiles.assigned_clinician_id` passes `has_clinician_access(..., p_permission)` for **every** permission string, regardless of `relationship_permissions.granted`. |

**Evidence (live DB):**

```sql
-- has_clinician_access =
check_relationship_permission(...)
OR EXISTS (
  SELECT 1 FROM profiles pr
  WHERE pr.id = p_patient_id
    AND pr.assigned_clinician_id = p_clinician_id
);
```

Phase 2.1 migration also backfilled active relationships with **all 10 keys granted** for legacy assignments, amplifying over-grant.

---

### AUTHZ-C02 — Access revoke does not clear legacy linkage

| Field | Value |
|-------|--------|
| **Severity** | Critical |
| **Endpoint** | `PATCH /api/access-requests/[id]` action=`revoke` |
| **Risk** | Revoke sets relationship `status='revoked'` and audits the action, but does **not** (a) set `relationship_permissions.granted=false`, or (b) clear `profiles.assigned_clinician_id`. Modern permission check fails (`status != 'active'`), but the legacy OR arm may still authorize full PHI access. |

**Evidence:** `app/api/access-requests/[id]/route.ts` revoke branch updates status only; no `assigned_clinician_id` update.

---

### AUTHZ-C03 — Dual messaging INSERT policies bypass `message_patient`

| Field | Value |
|-------|--------|
| **Severity** | Critical |
| **Table** | `messages` |
| **Policy** | `msg_participant_insert` (legacy) coexists with `messages_insert` (hardened) |
| **Risk** | Postgres OR’s permissive policies. Insert succeeds if **either** policy allows. Legacy WITH CHECK is only `(patient_id = auth.uid() OR clinician_id = auth.uid())` — **no** `message_patient` check. |

**Evidence (live):**

| Policy | WITH CHECK |
|--------|------------|
| `messages_insert` | Requires `has_clinician_access(..., 'message_patient')` |
| `msg_participant_insert` | Participant ID match only |

---

### AUTHZ-C04 — Broad clinician SELECT on PHI tables (role-only)

| Field | Value |
|-------|--------|
| **Severity** | Critical |
| **Tables** | `patient_profiles`, `gratitude_entries`, `journal_entries`, `pdf_reports` |
| **Risk** | Any user with `get_my_role() ∈ {clinician, admin, superadmin}` can SELECT rows with no relationship or permission check. Cross-patient PHI disclosure / IDOR at the database layer. |

**Evidence (live policies):**

| Table | Policy | USING |
|-------|--------|-------|
| `patient_profiles` | `patient_prof_clinician` | `get_my_role() = ANY (clinician, admin, superadmin)` |
| `gratitude_entries` | `gratitude_clinician` | same |
| `journal_entries` | `journal_clinician_shared` | `is_shared AND role ∈ clinician/admin/superadmin` |
| `pdf_reports` | `pdf_reports_clinician` | role-only SELECT |

---

## High Findings

### AUTHZ-H01 — Permission keys largely unenforced in APIs

Only three API paths call `clinicianHasPatientAccess()`:

| Endpoint | Permission checked |
|----------|-------------------|
| `/api/assignments` | `view_assessment_history` |
| `/api/clinical-notes` (clinician role only) | `generate_clinical_notes` |
| `/api/notify-message` | `message_patient` |

**No API enforcement found for:** `view_profile`, `view_assessment_results`, `view_reports`, `view_progress_tracking`, `view_mood_tracking`, `export_reports`, `upload_documents`.

Grep of `app/api/**` for those keys returns zero matches.

---

### AUTHZ-H02 — `/api/reports` denies clinicians; keys `view_reports` / `export_reports` unused

| Field | Value |
|-------|--------|
| **Severity** | High (security gap + functional mismatch) |
| **Endpoint** | `GET /api/reports` |
| **Issue** | Authz allows only `user.id === patientId` or HMAC admin session. No clinician + `export_reports` / `view_reports` path. |

If clinician UI links to this route, access fails (fail-closed — safe but shows the permission model is not wired). Keys remain dead code.

---

### AUTHZ-H03 — Admin/superadmin skip relationship checks on clinical notes

| Field | Value |
|-------|--------|
| **Severity** | High |
| **Endpoint** | `GET/POST/PUT /api/clinical-notes` |
| **Issue** | `clinicianHasPatientAccess` runs only when `callerProfile.role === 'clinician'`. Admin/superadmin proceed without HMAC `verifyAdminSession()` and without patient relationship checks. |

Contrast with assignments/reports which use HMAC admin session for privileged paths.

---

### AUTHZ-H04 — Approve path does not clamp to requested permissions

| Field | Value |
|-------|--------|
| **Severity** | High |
| **Endpoint** | `PATCH /api/access-requests/[id]` approve |
| **Issue** | Validates keys are canonical, then grants whatever the patient posts — including keys **not** in `requested_permissions`. Connect token flow clamps; approve does not. |

Enables over-grant beyond what the clinician requested (consent integrity / least privilege).

---

### AUTHZ-H05 — `/api/clinician/patients` assessment lookup uses wrong column

| Field | Value |
|-------|--------|
| **Severity** | High (functional; also authz surface if “fixed” without permission check) |
| **Endpoint** | `GET /api/clinician/patients` |
| **Evidence** | Query uses `.in('user_id', patientIds)` but live column is `patient_id` only. |
| **Authz note** | No API-level `view_assessment_results` check; relies on RLS. Intent appears to expose `severity_band` for list UI without verifying that permission is granted. |

---

## Medium Findings

### AUTHZ-M01 — Partial RLS consolidation incomplete

**PASS for:** `assessment_submissions` (`view_assessment_results`), `assessment_assignments` (write/mutate with `view_assessment_history`), `clinical_notes` (`generate_clinical_notes`), `mood_logs` (`view_mood_tracking`), `user_consents` (`view_profile`), hardened `messages_insert`/`messages_update`.

**FAIL for:** tables in AUTHZ-C03/C04; no documents/storage ACL tied to `upload_documents`; no progress/report table gated by `view_progress_tracking` / `view_reports`.

---

### AUTHZ-M02 — `profiles` has no clinician SELECT via `view_profile`

Live `profiles` SELECT policy: self or admin only (`profiles_self_read`). Clinicians cannot read other profiles through RLS even with `view_profile` granted. Authorization and product model disagree: key exists, RLS never uses it for `profiles`.

---

### AUTHZ-M03 — PHI access audit trail incomplete

**Logged:** relationship invite/connect/approve/reject/revoke; some assessment submissions; export/deletion requests.

**Not logged (typical):** clinician reads of assessments/mood/notes/reports; permission toggle (partial — permissions route writes `audit_log`); message sends; PDF generation; clinician patients list access (updates `last_access_at` only).

Weak accountability vs healthcare access-logging expectations.

---

### AUTHZ-M04 — Service role used for non-admin convenience writes

`GET /api/clinician/patients` uses `createAdminClient()` to bump `last_access_at` for all active relationships. Service role bypasses RLS by design; risk is mitigated if updates are narrowly scoped, but expands blast radius on bugs.

---

### AUTHZ-M05 — FORCE ROW LEVEL SECURITY not enabled

Tables relevant to PHI have `relrowsecurity=true` but `relforcerowsecurity=false`. Table owners / elevated DB roles can bypass RLS if misused. Standard hardening gap for healthcare.

---

## Low Findings

### AUTHZ-L01 — UI ↔ API drift on messaging

Messages UI still leans on `assigned_clinician_id` for patient–clinician pairing (`app/(app)/messages/page.tsx`), while consent model uses relationships. Confusing authorization UX; may encourage legacy path use.

---

### AUTHZ-L02 — `upload_documents` / document storage ACL absent

Permission key exists in types + CHECK constraint. No matching `documents` table / storage policies enforcing that key were found in scope. Dead permission from an enforcement perspective.

---

### AUTHZ-L03 — Permission validation tests do not prove RLS/API denial

`__tests__/security/permission-validation.test.ts` covers key shape validation. SQL fixture tests exist for consolidation, but production dual policies (`msg_*`) are not covered in live-policy assertions.

---

## Permission Model Verification

| Check | Result |
|-------|--------|
| Canonical `PermissionKey` in `lib/types.ts` | **PASS** |
| `ALL_PERMISSION_KEYS` matches type union (10 keys) | **PASS** |
| `lib/permissions.ts` `isPermissionKey` / `validatePermissionKeys` | **PASS** |
| Entry points validate (invite, access-requests, connect, permissions PATCH, approve) | **PASS** |
| DB CHECK on `relationship_permissions.permission_key` matches 10 keys | **PASS** (live) |
| Patient clinicians UI uses `ALL_PERMISSION_KEYS` (PR #61) | **PASS** |
| Single source of truth for *definitions* | **PASS** |
| Single source of truth for *enforcement* | **FAIL** (legacy OR arm + dual policies + role-only SELECT) |

**Section result: PASS (model) / FAIL (enforcement consistency)**

**Evidence:** Types + permissions helpers + CHECK constraint aligned. Enforcement layers diverge (see Critical/High).

---

## Permission Matrix

Expected vs observed for a clinician with an active relationship.

| Permission | Expected Allowed | Expected Denied | Enforced at API? | Enforced at RLS? | Observed gap |
|------------|------------------|-----------------|------------------|------------------|--------------|
| `view_profile` | Patient; clinician with grant | Unauth; other clinician; clinician without grant | No | Partial (`user_consents` only; not `profiles` / `patient_profiles`) | Broader PII via `patient_profiles` role SELECT |
| `view_assessment_results` | Granted clinician | Ungranted / unauth | No (list API) | Yes (`submissions_clinician`) | Bypassed by legacy `assigned_clinician_id` |
| `view_assessment_history` | Granted clinician | Ungranted | Yes (`/api/assignments`) | Yes (assignments) | Legacy bypass |
| `view_reports` | Granted clinician | Ungranted | No | No | Dead key; `/api/reports` clinician-denied |
| `view_progress_tracking` | Granted clinician | Ungranted | No | No | Dead key |
| `view_mood_tracking` | Granted clinician | Ungranted | No | Yes (`mood_clinician`) | Legacy bypass |
| `export_reports` | Granted clinician | Ungranted | No | No (`pdf_reports` role SELECT) | Over-broad PDF SELECT; export API clinician-denied |
| `message_patient` | Granted clinician / patient pair | Ungranted clinician | Yes (`notify-message`) | Partial (hardened insert OR’d with weak insert) | **Bypass via `msg_participant_insert`** |
| `upload_documents` | Granted clinician | Ungranted | No | No | Dead key |
| `generate_clinical_notes` | Granted clinician | Ungranted | Yes (clinician role) | Yes | Admin skip; legacy bypass |

**Unauthenticated:** Denied at API auth gates for listed endpoints (PASS).  
**Different clinician without relationship:** Generally denied where `has_clinician_access` is sole gate; **not** denied on role-only PHI tables (FAIL).

---

## Privilege Escalation Review

| Scenario | Risk | Notes |
|----------|------|-------|
| Limited-permission clinician accesses unauthorized assessments | **Critical** | Legacy arm OR role-broad tables |
| Access another patient's data without relationship | **Critical** | `patient_profiles` / gratitude / shared journals / pdf_reports |
| Clinical notes without `generate_clinical_notes` | **High** | Blocked for consent-only clinicians if no legacy link; admins unrestricted |
| Export unauthorized reports | **Medium** | API blocks clinicians; RLS on `pdf_reports` over-broad if client queries table directly |
| Modify own permissions upward | **Low–Medium** | Patient manages permissions via RLS `rp_patient_manage`; clinicians should not. Approve over-grant is patient-driven |
| Impersonate another clinician | **Low** | No evidence of spoofing clinician_id past auth.uid() on hardened paths; weak message insert still requires being listed as `clinician_id` |
| Retain access after revoke | **Critical** | AUTHZ-C02 |

---

## Audit Trail Review

| Event | Recorded? |
|-------|-----------|
| Permission changes | Yes (`/api/relationships/[id]/permissions`, approve details) |
| Clinician approvals / rejects / revokes | Yes (`audit_log`) |
| Relationship / invite creation | Yes |
| Access revocation | Yes (relationship status); incomplete vs legacy linkage |
| Sensitive data access (read PHI) | **Mostly no** |

**Gap:** Access accountability for reads is insufficient for healthcare least-privilege audits.

---

## Healthcare Privacy Review (technical alignment only)

| Principle | Alignment | Gap |
|-----------|-----------|-----|
| Least privilege | Weak | Role-level PHI SELECT; legacy full access |
| Data minimization | Partial | List endpoints may intend severity without key check |
| Purpose limitation | Partial | Keys exist but not bound to all data categories |
| Access accountability | Weak | Sparse PHI read logging |
| Consent / revoke effectiveness | Weak | Revoke ≠ loss of access if legacy link remains |
| GDPR integrity/confidentiality | At risk | Cross-patient SELECT possible for any clinician |

No certification claimed.

---

## Database Security Assessment

**FAIL**

**Evidence:**

- RLS enabled on core tables: yes.
- Correct permission-keyed policies: present on submissions, assignments, mood, clinical_notes, user_consents, hardened messages.
- Critical residual: dual message INSERT; role-only SELECT on patient_profiles / gratitude / journals / pdf_reports.
- `has_clinician_access` privilege escalation via `assigned_clinician_id`.
- No `FORCE ROW LEVEL SECURITY`.
- Service role used from APIs (expected for admin; also used for clinician last_access updates).

---

## API Authorization Assessment

**FAIL**

**Evidence:**

- Authn present on clinician-related routes reviewed.
- Permission validation at grant entry points: PASS (Phase 2.2).
- Runtime permission checks: only 3 endpoints.
- IDOR residual risk: broad RLS + patients list / messages UI legacy paths.
- Reports/clinical-notes admin paths inconsistent with HMAC pattern.
- Patient ownership validation uneven.

---

## RLS Assessment

**FAIL**

**Evidence:** Live policy inventory (15 Jul 2026) shows both consolidated and legacy policies. Permissive OR semantics make the weakest policy authoritative for INSERT on `messages`.

---

## Layer Trace (required mental model)

```
Login (Supabase Auth)
  → API (getUser / role)
    → Server authz (clinicianHasPatientAccess — sparse)
      → Supabase query (user JWT)
        → RLS (mixed: keyed / role-only / dual)
          → Returned data
```

**Broken links:** API often skips permission; RLS sometimes role-only; SQL helper sometimes ignores keys (legacy OR); revoke incomplete.

---

## Recommended Remediation Roadmap

### Phase 1 — Production blockers

1. **Drop** `msg_participant_insert` and `msg_participant_read` (retain hardened `messages_*` + admin read).
2. **Revoke path:** clear `assigned_clinician_id` when matching clinician; set all `relationship_permissions.granted=false` (or delete rows); keep audit.
3. **Narrow or replace** role-only SELECT policies on `patient_profiles`, `gratitude_entries`, `journal_entries`, `pdf_reports` with `has_clinician_access` + appropriate keys.
4. **Change `has_clinician_access`:** remove permission-agnostic legacy OR, or map legacy to an explicit permission set after backfill verification; stop treating any permission string as true for assigned clinicians.
5. Clamp approve `granted_permissions` ⊆ `requested_permissions`.

### Phase 2 — Security improvements

1. Wire API checks for all 10 keys on every clinician PHI endpoint (including `/api/clinician/patients` severity → require `view_assessment_results`).
2. Align `/api/reports` with `export_reports` / `view_reports` + relationship checks.
3. Require HMAC admin session for clinical-notes admin/superadmin; do not skip relationship blindly without privileged session.
4. Fix `user_id` → `patient_id` in clinician patients query after permission check.
5. Implement document/storage policies for `upload_documents` or remove the key.
6. Add PHI read audit events for assessments, notes, reports, mood, messages.

### Phase 3 — Architecture improvements

1. Retire `assigned_clinician_id` after migration completeness verified.
2. Enable `FORCE ROW LEVEL SECURITY` on PHI tables.
3. Single client path for messaging based on relationships, not assigned_clinician_id.
4. Continuous policy tests against live `pg_policies` (fail CI if dual/legacy policies reappear).
5. Permission matrix as automated integration tests (matrix in this doc as oracle).

---

## Release Checklist (authorization subset)

| Item | Status |
|------|--------|
| Security (authorization goal) | **FAIL** |
| Authentication | PASS (out of scope nuances) |
| Authorization (consent-scoped) | **FAIL** |
| Database RLS completeness | **FAIL** |
| APIs permission-keyed | **FAIL** |
| Assessments clinician access | PARTIAL |
| Exports | PARTIAL (clinician blocked) |
| Audit / monitoring of access | **FAIL** |
| Revocation effectiveness | **FAIL** |

---

## Final Decision

# NOT READY FOR PRODUCTION

**Why:** The product claim under audit is that a clinician may access **only** patient data authorized through `relationship_permissions`. Live DB + code tracing show that claim is **false** for messaging inserts, multiple PHI tables, and any patient still linked by `assigned_clinician_id` (including after relationship revoke). Phase 2.1/2.2 correctly established the consent model; Phase 2.3 enforcement is incomplete and contains privilege-escalation paths that are unacceptable for a mental-health platform prior to production launch under that authorization guarantee.

If launch proceeds without fixing Criticals, do so only with an explicit risk acceptance that **relationship permissions are not the effective ACL**, and treat remediation as an immediate post-launch P0 — this audit does **not** recommend that path.

---

## Appendix A — Finding ID Index

| ID | Severity | Title |
|----|----------|-------|
| AUTHZ-C01 | Critical | Legacy assigned_clinician_id ignores permission keys |
| AUTHZ-C02 | Critical | Revoke does not clear legacy access |
| AUTHZ-C03 | Critical | Dual messages INSERT bypasses message_patient |
| AUTHZ-C04 | Critical | Role-only clinician SELECT on PHI tables |
| AUTHZ-H01 | High | Most permission keys unused in APIs |
| AUTHZ-H02 | High | Reports API ignores view/export_reports |
| AUTHZ-H03 | High | Clinical notes admin path skips relationship authz |
| AUTHZ-H04 | High | Approve does not clamp to requested permissions |
| AUTHZ-H05 | High | Clinician patients uses non-existent user_id column |
| AUTHZ-M01 | Medium | Incomplete RLS key coverage |
| AUTHZ-M02 | Medium | profiles vs view_profile mismatch |
| AUTHZ-M03 | Medium | Sparse PHI access audit logs |
| AUTHZ-M04 | Medium | Service role for last_access_at |
| AUTHZ-M05 | Medium | FORCE RLS not enabled |
| AUTHZ-L01 | Low | Messages UI legacy pairing |
| AUTHZ-L02 | Low | upload_documents unimplemented |
| AUTHZ-L03 | Low | Test gap on live dual policies |

## Appendix B — Effort estimates (remediation design only)

| Fix | Est. engineering hours | Notes |
|-----|------------------------|-------|
| Drop dual message policies + verify | 2–4 | Migration + regression |
| Revoke clears legacy + permissions | 4–8 | Careful data migration |
| Replace role-only PHI SELECTs | 8–16 | Per-table key mapping |
| Remove/narrow has_clinician_access legacy OR | 8–16 | High regression risk |
| Clamp approve to requested | 1–2 | Mirror connect tests |
| Wire APIs for all keys + reports | 16–24 | Endpoint inventory |
| Clinical notes HMAC admin | 2–4 | Align with assignments |
| Fix user_id bug + permission gate | 2–4 | |
| Documents key or remove | 8–16 | Or drop key |
| PHI read audit events | 8–16 | |
| FORCE RLS + retire assigned_clinician_id | 16–32 | Phase 3 |

---

*End of Phase 2.3 Authorization Security Audit — no code or schema changes were made as part of this engagement.*
