# Phase 1 Security Remediation — Impact Report

| | |
|---|---|
| **Date** | 2026-07-18 |
| **Branch** | `claude/v-welfare-technical-dossier-fvah3o` |
| **Scope** | Phase 1 database authorization hardening (migration-only; no application/UI code changed) |
| **Change type** | 4 SQL migrations + 1 SQL regression suite |
| **Verification** | Regression suite executed on PostgreSQL 16 — **all assertions passed (exit 0)** |

This change set moves five authorization weaknesses from the application layer (or from an incidental/broken state) into enforced **PostgreSQL RLS / SECURITY DEFINER** controls, per the rule *"every authorization decision must exist in PostgreSQL."* Current functionality is preserved via a backfill + sync trigger that keep the legacy `assigned_clinician_id` model and the canonical `clinician_patient_relationships` model in step.

---

## 1. Deliverables

### SQL migrations
| File | Objective(s) | What it does |
|---|---|---|
| `supabase/migrations/20260718090000_phase1_admin_rpc_authz_lockdown.sql` | 1, 2 | Recreates all 8 admin dashboard RPCs as `SECURITY DEFINER` with a leading `is_admin()` gate (raises `42501` for non-admins). Revokes `EXECUTE` from `PUBLIC` and `anon`. |
| `supabase/migrations/20260718090100_phase1_clinician_relationship_helpers_backfill.sql` | 5 (foundation) | Adds `relationship_active()` / `clinician_can_access()` helpers; backfills active relationships (+ default permissions) from `assigned_clinician_id`; installs a trigger to keep them in sync on future assignment writes (respecting revoked consent). |
| `supabase/migrations/20260718090200_phase1_rls_clinical_notes_messages_fix.sql` | 3, 4 | Dynamically drops **all** existing policies on `clinical_notes` and `messages`, then recreates a single correct set (private-note confidentiality; sender + active-relationship checks on message writes). |
| `supabase/migrations/20260718090300_phase1_rls_clinician_scope_relationships.sql` | 5 | Rewrites every clinician-scoped policy across 14 PHI tables to require an **active** `clinician_patient_relationship` instead of `assigned_clinician_id` or a bare role check. |

### Regression tests
`supabase/tests/phase1_security_regression.test.sql` — self-contained (`BEGIN … ROLLBACK`) RLS regression suite. Runnable in CI via `supabase test db`, or locally via the Supabase-emulation bootstrap used to verify this change.

---

## 2. Vulnerabilities remediated (before → after)

### Objective 1 & 2 — Admin dashboard RPCs
**Before.** The 8 `get_admin_*` / `get_*` RPCs (`20260627220100_admin_dashboard_rpcs.sql`) were `SECURITY INVOKER` and `GRANT EXECUTE … TO authenticated` with **no authorization check**. Any authenticated patient could call e.g. `get_high_risk_patients()`, `get_patient_risk_profile()`, or `get_demographics_breakdown()` to read other patients' PHI. The only barrier was an incidental revoke of the materialized-view grant — fragile and functionality-breaking.

**After.** Each RPC is `SECURITY DEFINER` with `IF NOT public.is_admin() THEN RAISE EXCEPTION … ERRCODE '42501'` as its first statement — a **database-level admin authorization check**. `EXECUTE` is revoked from `PUBLIC` and `anon`. A non-admin authenticated caller is rejected in the database before any row is read; an admin succeeds.

### Objective 3 — `clinical_notes` overlapping policies
**Before.** Baseline policies coexisted with the later additive set (`20260624190200`) without either being dropped. Because permissive policies OR-combine, the looser policy won:
- `cn_patient_read` (`patient_id = me`) OR-ed with `notes_patient_read_nonprivate` (`… AND is_private = false`) → **patients could read their own PRIVATE clinician notes.**
- `cn_clinician_own` (`clinician_id = me`, no patient scope) → **a clinician could read/write notes for any patient.**

**After.** A single consolidated set: clinician access requires `clinician_id = auth.uid()` **and** an active relationship; patients may read only `is_private = false` notes; admins retain full access.

### Objective 4 — `messages` RLS authorization
**Before.** `msg_participant_insert` (`patient_id = me OR clinician_id = me`) OR-ed with the baseline insert policy dropped the sender check and the relationship requirement → **a user could inject messages into arbitrary conversations and forge `sender_id`.**

**After.** Insert requires `sender_id = auth.uid()` **and** the sender is a participant **and** `relationship_active(clinician_id, patient_id)`. Reads are participant/admin-scoped; updates are sender-only and relationship-gated.

### Objective 5 — Clinician patient access via `clinician_patient_relationships`
**Before.** Clinician access was granted either by the legacy `assigned_clinician_id` pointer or, worse, by a bare role check that let **any clinician read every patient's** insights, gratitude entries, shared journals, medications, medication alerts, personality results, PDF reports, chat sessions, and patient profiles.

**After.** All 14 clinician-facing policies require `relationship_active((SELECT auth.uid()), <patient>)`. Admin/superadmin and patient-owner access are unchanged. A backfill creates active relationships for existing assignments, and a trigger (`sync_relationship_on_assignment`) keeps future `assigned_clinician_id` writes in sync — so no current access path is lost, while a **revoked** relationship is never resurrected.

---

## 3. Functionality preservation

- **Backfill** (`20260718090100`): every current `assigned_clinician_id` pairing without a relationship gets an `active` relationship + default granted permissions → assigned clinicians keep access.
- **Sync trigger**: future writes to `profiles.assigned_clinician_id` (e.g. `app/api/assignments`, `patients-content.tsx`) auto-create/refresh the relationship at the DB layer — **no application change required**, so the shipped assignment flow keeps working.
- **Admin dashboards**: the four routes that call RPCs via the cookie-authenticated client (`app/api/admin/dashboard/{stats,assessments,engagement,demographics}`) still work — `SECURITY DEFINER` lets the function read the admin views, and the admin caller passes the `is_admin()` gate.
- **Messaging & notes**: verified that legitimate participant sends and related-clinician note writes still succeed under the new policies (regression tests below).

---

## 4. Tests executed

**Environment.** PostgreSQL 16.x, with a Supabase-compatible emulation (roles `anon`/`authenticated`/`service_role`, `auth.uid()` resolving from `request.jwt.claim.sub`, RLS enforced by impersonating `authenticated`). The emulation reproduced the **vulnerable pre-fix state** (baseline + overlapping policies, ungated RPC), then applied the four Phase 1 migrations, then ran `supabase/tests/phase1_security_regression.test.sql`.

**Result: all assertions passed — `psql` exit code 0.**

| # | Assertion | Result |
|---|---|---|
| 1 | `anon` cannot `EXECUTE` `get_admin_dashboard_stats` / `get_high_risk_patients` | PASS |
| 2 | Non-admin authenticated user calling `get_admin_dashboard_stats` → denied (`42501`) | PASS |
| 3 | Admin calling `get_admin_dashboard_stats` → succeeds | PASS |
| 4 | Patient sees own **shared** note, **not** the private note | PASS |
| 5 | Related clinician (C1) reads both P1 notes and can write a note | PASS |
| 6 | Unrelated clinician (C2) cannot read or write P1 notes | PASS |
| 7 | Unrelated clinician cannot inject a message into (P1,C1) | PASS |
| 8 | `sender_id` forgery rejected; legitimate participant send allowed | PASS |
| 9 | Non-participant clinician cannot read the conversation | PASS |
| 10 | Related clinician reads P1 submissions + mood; not P2's | PASS |
| 11 | C2 reads related P2 submissions; not unrelated P1's | PASS |
| 12 | Sync trigger created relationship for assigned P1 | PASS |
| 13 | Assigning P3 → relationship activates → clinician gains access | PASS |
| 14 | Re-assigning a **revoked** (C1,P2) does **not** resurrect access | PASS |
| 15 | Exactly 3 `clinical_notes` policies / 6 `messages` policies; baseline loose policies gone | PASS |

**How to reproduce**
```bash
# CI (recommended): against a Supabase preview branch with migrations applied
supabase test db

# Local: emulate Supabase, apply the 4 migrations, run the suite
#  (see the bootstrap used in this change; auth.uid() reads request.jwt.claim.sub)
psql -f bootstrap.sql            # roles + auth.uid() + schema subset + \i migrations
psql -f supabase/tests/phase1_security_regression.test.sql
```

**Not run here:** the existing HTTP suites (`__tests__/security/*.test.ts`) require a live `BASE_URL` server, which is not available in this environment; they are unchanged by this work.

---

## 5. Remaining risks & recommended follow-ups

1. **Admin RPC `authenticated` grant retained (gated).** To keep the shipped admin dashboards working without application changes, `EXECUTE` remains granted to `authenticated` — but is inert for non-admins because of the in-function `is_admin()` gate. **Full lockdown** (revoke `authenticated`, grant `service_role` only) requires migrating `app/api/admin/dashboard/{stats,assessments,engagement,demographics}/route.ts` to the service-role client. That is an application change, out of scope for a migration-only change set. *Recommended: Phase 2 app change, then flip the grant.*

2. **Broken admin materialized views remain.** `admin_high_risk_alerts` / `admin_user_engagement_stats` / `admin_demographics_summary` still reference non-existent columns (`user_type`, `email`, `full_name`) and contain SQL syntax errors (`20260627220000`). The RPCs that read them (`get_high_risk_patients`, `get_patient_risk_profile`, etc.) are now locked down but still functionally broken. *Recommended: repair or drop these views in a dedicated migration.*

3. **`clinical_notes` write path also guarded in-app by `assigned_clinician_id`.** The route (`app/api/clinical-notes`) still checks `assigned_clinician_id`. With the sync trigger this stays consistent, but the app-layer check is now redundant with (and weaker than) the RLS. *Recommended: simplify the route to rely on RLS in Phase 2.*

4. **Migration-sync drift (pre-existing).** `KNOWN_ISSUES.md` documents that the remote DB and local migrations have diverged. The dynamic `DROP POLICY` loops in migration `…090200` make the `clinical_notes`/`messages` fix drift-safe, but the other migrations assume baseline policy/table names. *Recommended: run `supabase test db` against a preview branch before promoting, and reconcile the migration history.*

5. **Consent granularity not yet enforced at row level.** Clinician read policies gate on an **active relationship**, not on the specific granted `permission_key` (e.g. `view_mood_tracking`). This matches prior behaviour (assigned clinicians saw all patient data) and avoids breakage, but the per-permission model (`relationship_permissions` / `check_relationship_permission`) is not yet the RLS authority. *Recommended: Phase 2 — tighten policies to the relevant `permission_key` per table.*

6. **`storage.objects` policies not covered.** Document uploads implied by `clinician_verifications.document_urls` are outside this phase and were not audited. *Recommended: separate storage-policy review.*

7. **Regression suite is impersonation-based.** It relies on `auth.uid()` reading `request.jwt.claim.sub`. Confirm the CI harness (`supabase test db`) wires this the same way, or adapt the impersonation preamble.
