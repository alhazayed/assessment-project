# V Welfare — Database Architecture Report

**Audit date:** 2026-07-13
**Scope:** `/workspace/supabase/migrations/` (100 files), cross-referenced with `lib/supabase/*.ts` and `lib/types/kpi.ts`

---

## 0. Important Caveat on Auditability

**68 of the 100 migration files are stubs** — placeholder files whose content is a comment stating the actual DDL was "applied directly to the remote database; stub preserved for migration history." Only **32 files contain real SQL**. This means:

- The effective production schema **cannot be fully reconstructed from git alone**. This audit's conclusions about "final effective state" are based on the 32 real migrations plus the one large consolidated baseline (`20260619120000_schema_baseline.sql`), but any change made purely through the Supabase dashboard/SQL editor without a corresponding committed migration is invisible to this review.
- This is itself a **High** finding: for a regulated healthcare platform, schema history should be 100% reproducible from source control (disaster recovery, compliance audit trail, and safe environment promotion all depend on it). See DB-H2.

---

## 1. Migration Inventory

| Category | Count |
|---|---|
| Total migration files | 100 |
| Stub-only (no real SQL) | 68 |
| Full SQL (authoritative) | 32 |

Key non-stub migrations that drive the current effective schema: `20260619120000_schema_baseline.sql` (consolidated snapshot), `20260619210813_fix_duplicate_auth_trigger.sql`, `20260620100000_create_packages_tables.sql`, `20260620100001_packages_policies_fix.sql`, `20260621000000_package_sessions.sql`, `20260622010000_perf_indexes.sql`, `20260622020000_security_rls_fixes.sql`, `20260622175454_push_notification_tokens.sql`, `20260623211840_submit_assessment_atomic_fn.sql`, `20260623211848_missing_fk_indexes.sql`, `20260624044327_assessment_submissions_constraints.sql`, `20260624120000_clinician_patient_consent_system.sql`, `20260624190000_compound_performance_indexes.sql`, `20260624190100_atomic_rate_limit_function.sql`, `20260624190200_clinical_notes_and_messages_rls.sql`, `20260627180500_assessment_submissions_indexes.sql`, `20260627220000_admin_dashboard_materialized_views.sql`, `20260627220100_admin_dashboard_rpcs.sql`, `20260627220200_assessment_submissions_constraints.sql`, `20260627220300_package_results_fk_fix.sql`, `20260628071704_revoke_admin_matview_api_access.sql`.

---

## 2. Full Table Inventory (46 relations + 5 materialized views)

### Identity & profiles
`profiles` (central user record; role, demographics, `assigned_clinician_id`, `is_active`/`deactivated_at`), `patient_profiles`, `clinician_profiles`.

### Assessments
`assessment_definitions`, `assessment_governance`, `assessment_items`, `assessment_interpretation_templates`, `assessment_assignments`, `assessment_submissions`, `assessment_responses`.

### Clinical & patient-generated content
`clinical_notes`, `session_notes`, `messages`, `mood_logs`, `journal_entries`, `gratitude_entries`, `medications`, `medication_alerts`, `personality_results`, `wellness_plans`, `ai_insights`, `chat_sessions`, `pdf_reports`.

### Consent & collaboration
`clinician_verifications`, `patient_access_codes`, `clinician_invitations`, `clinician_patient_relationships`, `relationship_permissions`, `notification_events`.

### Platform / CMS / ops
`audit_log`, `rate_limit_log`, `notifications`, `notification_log`, `consent_documents`, `user_consents`, `feature_flags`, `platform_settings`, `platform_announcements`, `dismissed_announcements`, `cms_sections`, `content_articles`, `invitations`, `push_tokens`.

### Packages module
`packages`, `package_assessments`, `package_interpretations`, `package_results`, `package_sessions`.

### Materialized views (no RLS applicable; aggregate PHI)
`admin_daily_stats`, `admin_assessment_stats`, `admin_user_engagement_stats`, `admin_high_risk_alerts`, `admin_demographics_summary`.

**No payment/subscription tables exist anywhere in the schema.**

---

## 3. RLS Status — Sensitive Tables

RLS is **enabled** on every sensitive table reviewed. The question that matters is whether the *policies* are correct, not merely whether RLS is toggled on.

### `profiles` — ✅ Correct
Self-read/update via `auth.uid() = id`; admin read/update via `get_my_role() = ANY(['admin','superadmin'])`; delete restricted to `superadmin`. `get_my_role()` is `SECURITY DEFINER` + `SET search_path = public`, correctly avoiding the classic RLS self-recursion bug.

### `assessment_submissions` / `assessment_responses` — ⚠️ Correct policy, but insufficient on its own
Patient own read/insert (`auth.uid() = patient_id`); clinician read via `assigned_clinician_id` (legacy model — see Architecture Report §3.3); admin read all. **The INSERT policy only validates row ownership, not score integrity** — `total_score`, `severity_band`, and `high_risk_flag` are all client-writable columns from the database's point of view. This is fine when the *only* writer is the server-side `/api/submit-assessment` route (which validates before calling the atomic RPC), but it means the database itself provides **no defense** if any other writer (e.g., the mobile app) inserts directly. See Bug Report BUG-1 and Security Report SUPA/AUTH sections for the exploitation path.

### `clinical_notes` — ❌ **HIGH: Conflicting duplicate policies widen access**
Baseline created strict policies (`clinician_own_notes` requires assignment; `notes_patient_read_nonprivate` excludes `is_private=true` notes from patient view). Migration `20260624190200_clinical_notes_and_messages_rls.sql` added a **second set of policies without dropping the first** (`cn_clinician_own`, `cn_patient_read`). Because Postgres OR-combines RLS policies, the newer, looser policies win:
- Patients can read **private** notes about them (should be blocked).
- Clinicians can read/write notes for **unassigned** patients as long as they're the note's author.

**Severity: High.** Full detail and fix direction in Security Report SUPA-3.

### `messages` — ❌ **HIGH: Same conflicting-duplicate-policy pattern**
`msg_participant_insert` (added later, no assignment check) coexists with the baseline's assignment-checked `messages_insert`. Any patient/clinician pair can exchange messages without a verified relationship.

### `notifications` — ✅ Correct (`user_id = auth.uid()`, full CRUD scoped to owner)

### `audit_log` — ✅ Correct (admin read-all; self-insert only; no UPDATE/DELETE policy for any role — immutable, which is the right design for an audit trail)

### `rate_limit_log` — ✅ Fixed (was zero-policy prior to `20260622020000_security_rls_fixes.sql`; now admin-only read, service-role insert via `SECURITY DEFINER` function)

### `clinician_verifications` — ✅ Correct (`clinician_id = auth.uid()` OR admin)

### `patient_access_codes` — ✅ Correct by omission (SELECT-only policy for clients; writes only via service-role API, which was verified in the API audit)

### `clinician_patient_relationships` / `relationship_permissions` — ✅ Well-structured (parties + admin read; verified-clinician insert; patient-controlled permission updates; CHECK constraints on `status`/`permission_key`)

### `notification_events` — ⚠️ Medium: no INSERT policy for authenticated users (writes are service-role only — consistent with current usage, but should be documented as intentional so a future refactor doesn't accidentally "fix" it into a hole)

### `packages` / `package_results` — ✅ Correct (own-row read for results; `packages` catalog readable by any `authenticated` — see Architecture Report §14, this is a product decision, not a bug, since there's no payment gate to enforce)

**No table handling PHI/PII was found with RLS disabled.** The failures found are policy-*logic* errors (SUPA-3), not missing-RLS errors.

---

## 4. Recursive Policy / SECURITY DEFINER Risk

- **`get_my_role()`** — ✅ `SECURITY DEFINER`, `SET search_path = 'public'`. Correctly hardened; used throughout `profiles` policies without triggering recursion.
- **`current_user_role()`** — ⚠️ Exists in the baseline **without** `SECURITY DEFINER`. The baseline's own comment warns callers to prefer `get_my_role()`. It is not currently referenced by any RLS policy found in the migrations, so it is **dormant risk, not active** — but it should be removed or hardened so a future migration author doesn't accidentally use it in a `profiles` policy and reintroduce the recursion bug this codebase already fixed once.
- **Admin dashboard RPCs (8 functions)** — ❌ **CRITICAL.** Not `SECURITY DEFINER`-gated with a role check, and `GRANT EXECUTE ... TO authenticated`. See Security Report SUPA-1 for full detail — this is a database-layer finding as much as an API-security one.
- **`cleanup_rate_limit_log()`** — Medium: not `SECURITY DEFINER`; low risk since it only deletes old rate-limit rows, but inconsistent with the pattern used elsewhere.

---

## 5. Foreign Keys & Cascade Behavior

| Table.column | NOT NULL | ON DELETE | Assessment |
|---|---|---|---|
| `assessment_submissions.patient_id` | ✅ (added `20260627220200`) | CASCADE → `profiles(id)` | ✅ Good — supports clean account deletion |
| `assessment_submissions.assignment_id` | nullable | SET NULL → `assessment_assignments(id)` | ✅ Good — preserves results if assignment removed |
| `assessment_assignments.patient_id`/`clinician_id` | ✅ | CASCADE | ✅ |
| `assessment_responses.submission_id` | ✅ | CASCADE | ✅ |
| `mood_logs.patient_id` / `journal_entries.patient_id` | ✅ | CASCADE | ✅ |
| `messages.patient_id`/`clinician_id`/`sender_id` | ✅ | **NO ACTION (default)** | ⚠️ Medium — a deleted profile could leave orphaned message rows referencing a non-existent user; recommend CASCADE or a soft-delete strategy consistent with `profiles.is_active` |
| `clinical_notes.patient_id`/`clinician_id` | ✅ | **NO ACTION** | ⚠️ Medium — same concern; clinical notes are exactly the kind of record that should have an explicit, deliberate retention/cascade policy rather than the Postgres default |
| `package_results.user_id` | ✅ | CASCADE → `profiles(id)` (fixed in `20260627220300`) | ✅ |
| `package_sessions.user_id` | ✅ | CASCADE → **`auth.users`**, not `profiles(id)` | ⚠️ Medium — inconsistent with the sibling `package_results` fix; should reference `profiles(id)` for consistency with the rest of the app's data model |

**Missing FK recommendation:** `assessment_assignments.completed_submission_id` has no FK constraint to `assessment_submissions` — should be added for referential integrity.

---

## 6. Indexes

### Present (hot-path composite indexes)
`idx_assessment_submissions_patient_submitted (patient_id, submitted_at DESC)`, `idx_assessment_submissions_definition_submitted`, `idx_notifications_user_read_created`, `idx_messages_patient_clinician_created`, `idx_mood_logs_patient_date`, `idx_journal_entries_patient_created`, `idx_audit_log_actor_created`, `idx_rate_limit_key_created`, `idx_assessment_submissions_high_risk (high_risk_flag) WHERE high_risk_flag = true` (partial index — good practice).

### Missing (Medium — recommend adding)
`messages.sender_id`, `notification_log.recipient_id`, `chat_sessions.patient_id`, `gratitude_entries.patient_id`, `personality_results.patient_id`, `session_notes.patient_id`, `pdf_reports.submission_id`, `pdf_reports.generated_by`.

### Noise (Low — not harmful, but indicates process gaps)
The same or overlapping composite indexes were (re-)created across `20260622010000`, `20260622020000`, `20260624190000`, and `20260627180500` — all using `CREATE INDEX IF NOT EXISTS`, so they're harmless to reapply, but the duplication suggests migrations were written without checking what already existed, which increases the risk of a future migration silently no-op'ing when the author expected a change to take effect.

---

## 7. Check Constraints

### Present
`packages.status IN ('draft','active','archived')`, `package_results.status` / `package_sessions.status IN ('in_progress','completed')`, `push_tokens.platform IN ('ios','android','web')`, `clinician_verifications.status IN ('pending_verification','verified','rejected','suspended')`, `relationship_permissions.permission_key IN (...)`.

### Missing (Medium)
`profiles.role` — free text, no CHECK constraint. `assessment_submissions.severity_band` — free text; this is scoring-critical data with app-only validation. `assessment_assignments.status`, `invitations.status`, `content_articles.status`, `session_notes.status`, `notification_log.status` — all free text.

**Recommendation:** Add CHECK constraints on `profiles.role` and `assessment_submissions.severity_band` at minimum — these are the two columns where an unexpected value would have the most severe downstream effect (privilege model, clinical interpretation).

---

## 8. Triggers & RPC Functions

### Triggers
| Trigger | Table | Function | SECURITY | Note |
|---|---|---|---|---|
| `on_auth_user_created` | `auth.users` | `handle_new_user()` | DEFINER | ❌ **High** — see DB-H1 below |
| `prevent_role_escalation` | `profiles` | `prevent_role_self_escalation()` | DEFINER | ✅ Good — DB-layer defense against self-promotion to admin |
| `set_*_updated_at` | profiles, patient_profiles, chat_sessions | `handle_updated_at()` | Invoker | ✅ |
| `enforce_governance_on_activation` | `assessment_definitions` | `enforce_governance_before_activation()` | Invoker | ✅ Good — prevents activating an assessment without governance sign-off |
| `packages_updated_at` | `packages` | `packages_set_updated_at()` | Invoker | ✅ |

### DB-H1 — [HIGH] `on_auth_user_created` trigger is dropped in git with no recreate statement
```sql
-- 20260619210813_fix_duplicate_auth_trigger.sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- Function recreated with ON CONFLICT DO NOTHING, but no CREATE TRIGGER here
```
The function `handle_new_user()` is redefined, but the migration that follows never recreates the trigger that calls it on new signups. If the production database currently has a working trigger, it must exist under a different name applied directly on the remote (consistent with the stub-migration problem in §0) — meaning **a fresh database built from this migration history alone would not auto-create a `profiles` row on signup**, breaking registration.
**Fix direction:** Add a migration that explicitly creates (or recreates, idempotently) the trigger calling `handle_new_user()` on `auth.users` insert, so the migration history is self-sufficient.
**Effort:** Low, but requires careful verification against the live DB trigger name before applying (to avoid creating a duplicate).

### RPC / helper functions

| Function | SECURITY DEFINER | search_path pinned | Grants | Assessment |
|---|---|---|---|---|
| `get_my_role()` | ✅ | ✅ | — | ✅ |
| `submit_assessment_atomic()` | ✅ | ✅ | `authenticated` | ✅ Validates `auth.uid() = p_patient_id`, but does **not** re-derive the score from `assessment_items` — it trusts the caller's `p_total_score`/`p_severity_band`/`p_high_risk_flag` params. Safe only because the sole intended caller (the API route) validates first. This is a database-layer manifestation of the same trust boundary problem as BUG-1. |
| `check_and_record_rate_limit()` | ✅ | ✅ | `service_role` | ✅ |
| `generate_patient_access_code()` | ✅ | ✅ | (owner-implicit) | ✅ |
| `check_relationship_permission()` | ✅ | ✅ | `authenticated` | ✅ |
| `prune_rate_limit_log()` / `expire_stale_invitations()` | ✅ | ✅ | internal | ✅ |
| `cleanup_rate_limit_log()` | ❌ | ✅ | — | ⚠️ Medium (inconsistent, low practical risk) |
| 8× `get_admin_dashboard_stats`/`get_high_risk_patients`/etc. | ❌ (no internal role check) | ❌ | `authenticated` | ❌ **Critical — see SUPA-1** |

---

## 9. Materialized Views & Exposure

Created in `20260627220000_admin_dashboard_materialized_views.sql` with `GRANT SELECT ... TO authenticated` on all 5. Partially walked back in `20260628071704_revoke_admin_matview_api_access.sql`, which revokes 4 of 5 — **`admin_demographics_summary` was missed** (see Security Report SUPA-2).

### DB-C1 — [CRITICAL] Materialized views reference columns that don't exist in the live schema
```sql
-- 20260627220000_admin_dashboard_materialized_views.sql
p.user_type,    -- profiles has `role`, not `user_type`
p.full_name,    -- profiles has `full_name_en` / `full_name_ar`
p.email,        -- email lives in auth.users, not profiles
```
This is corroborated by an in-app workaround comment found in `app/api/admin/dashboard/risk/route.ts` acknowledging the views reference columns that don't exist in the live schema. **If these materialized views are refreshed/recreated from this migration file on a fresh environment, they will fail outright**, and even where they currently "work" in production it implies the applied-in-dashboard version has silently diverged from what's in git — another instance of the git/production drift problem from §0.
**Fix direction:** Correct the column references (`role`, `full_name_en`, join `auth.users` for email if truly needed) and re-test `REFRESH MATERIALIZED VIEW` against a clean database built purely from the migration history.
**Effort:** Medium.

---

## 10. Destructive / Risky Migration Patterns

- No `DROP TABLE` or `DROP COLUMN` was found anywhere in the migration history — a good sign for data-loss risk.
- `20260627220200_assessment_submissions_constraints.sql` uses a `DO $$ ... RAISE EXCEPTION ... $$` guard before adding `NOT NULL`, which safely aborts the migration if a NULL `patient_id` row already exists — good defensive practice, but see DB-H3 below for why this specific constraint is actually a functional landmine.
- `20260619210813` (DB-H1 above) is the one instance of a genuinely risky pattern: a `DROP TRIGGER` with no corresponding `CREATE TRIGGER` in the same or a later committed migration.

### DB-H3 — [HIGH] `patient_id NOT NULL` constraint conflicts with the guest-submission code path
The migration comment claims "guest submissions use a separate table so this is safe," but `app/api/submit-assessment-guest/route.ts` inserts into the **same** `assessment_submissions` table with `patient_id: null` for anonymous users. If this constraint is (or becomes) active in production, every guest submission will fail with a NOT NULL violation. This is a **schema/application contract mismatch**, not merely a documentation error, and should be resolved before relying on either the guest flow or the constraint.
**Fix direction:** Either (a) create a genuinely separate `guest_assessment_submissions` table and migrate the guest route to use it, or (b) keep `patient_id` nullable and add a `CHECK (patient_id IS NOT NULL OR is_guest = true)`-style constraint instead of a blanket `NOT NULL`.
**Effort:** Medium.

---

## 11. Duplicate / Conflicting Migrations (Technical Debt)

| Issue | Files |
|---|---|
| Triplicate assessment-submission constraints | `20260623220000`, `20260624044327`, `20260627220200` |
| Triplicate `package_results` FK fix | `20260623220100`, `20260624044337`, `20260627220300` |
| Quadruplicate performance-index migrations (harmless due to `IF NOT EXISTS`, but noisy) | `20260622010000`, `20260622020000`, `20260624190000`, `20260627180500` |
| Conflicting RLS additions without drops | `clinical_notes`/`messages` — see §3 |
| Column-name mismatch between app types and schema | `lib/types/kpi.ts` references `user_type`, `deleted_at`, `login_attempts`, `appointments` — **none of these exist in any migration.** The KPI dashboard code appears to have been written against an aspirational/future schema, not the current one; some of this is defensively coded (`available?: false` pattern), but it indicates the KPI feature was shipped ahead of its data model. |

---

## 12. Data Retention / Soft Delete

| Mechanism | Present? |
|---|---|
| `deleted_at` column anywhere | ❌ No |
| Soft deactivate | ✅ `profiles.is_active` / `deactivated_at`; `medications.deactivated_at` |
| Hard-delete cascade for GDPR erasure | ✅ `assessment_submissions.patient_id ON DELETE CASCADE` (and similar for mood/journal) |
| Automated PHI purge/archival policy | ❌ None beyond `rate_limit_log` pruning (`prune_rate_limit_log()`, stub cron job) |

For a healthcare platform, the absence of any documented/enforced retention policy for clinical notes, assessment results, and messages is a compliance gap worth resolving even though it is not, by itself, a security vulnerability.

---

## 13. Severity Summary

### Critical
1. **Admin dashboard RPCs are executable by any authenticated user with no role check** — direct PHI exposure path (SUPA-1 in Security Report).
2. **Admin materialized views reference non-existent columns** — will fail to build/refresh from a clean migration history; indicates git/production schema drift (DB-C1).

### High
3. **`clinical_notes`/`messages` RLS: conflicting duplicate policies widen access** beyond the assignment model (SUPA-3).
4. **68 stub migrations** — production schema is not fully reproducible from source control (§0, disaster-recovery/compliance risk).
5. **`on_auth_user_created` trigger dropped without a recreate statement** in git — registration would break on a fresh database built purely from migrations (DB-H1).
6. **`admin_demographics_summary` still exposed to `authenticated`** — revoke migration is incomplete (SUPA-2).
7. **`patient_id NOT NULL` constraint conflicts with the guest-submission code path** (DB-H3).

### Medium
8. Clinician PHI access is still keyed on legacy `assigned_clinician_id`, not the newer consent model (architectural, cross-referenced with Architecture Report §3.3).
9. `profiles.role` and `assessment_submissions.severity_band` lack CHECK constraints.
10. `current_user_role()` exists without `SECURITY DEFINER` — dormant recursion-bug risk if ever wired into a `profiles` policy.
11. `package_sessions.user_id` FK targets `auth.users` while the sibling `package_results` was fixed to target `profiles(id)` — inconsistent.
12. Missing indexes on several FK columns (`messages.sender_id`, `notification_log.recipient_id`, etc.).
13. `messages`/`clinical_notes` FKs use default `NO ACTION` on delete instead of an explicit, deliberate policy.

### Low
14. Duplicate/idempotent index migrations — noisy but harmless.
15. `notification_events` has no INSERT policy for authenticated users (intentional, but undocumented).

---

## Recommended Remediation Order

1. Fix the two Critical items first (both are pure SQL migrations, low implementation risk, high impact reduction): add role checks to the 8 admin RPCs; fix/verify the materialized view column references.
2. Fix `clinical_notes`/`messages` RLS conflict — requires careful design since it must account for both the legacy and new consent models (coordinate with the API-layer unification work in the Architecture Report).
3. Recreate the `on_auth_user_created` trigger explicitly in a migration (verify against production first to avoid duplicate-trigger errors).
4. Resolve the guest-submission vs. `NOT NULL` conflict.
5. Add the missing CHECK constraints and FK indexes as a lower-risk, low-effort batch.
6. Longer-term: commit a full, verified `pg_dump`-based baseline to replace the 68 stub migrations, so the repository becomes the source of truth again.
