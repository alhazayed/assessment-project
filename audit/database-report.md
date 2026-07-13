# V Welfare Database Audit

**Database:** Supabase Postgres  
**Local config target:** `wyzezyctpvlohuuhzyof`  
**Database score:** **45/100**

## Scope

All local migration files and `supabase/config.toml` were reviewed. The deployed database was inspected read-only through table metadata, policies, functions, triggers, constraints, grants, advisors, cron jobs, and migration history.

The local directory ends at migration `20260628071704`. Production ends at `20260706085904`: **17 deployed migrations are missing locally**. The deployed database is the stronger evidence for current controls; the local migration set is the evidence for reproducibility.

## Live schema summary

All observed public base tables have RLS enabled. Live data contains 58 public tables, including:

- identity: `profiles`, patient/clinician profiles;
- assessments: definitions, items, submissions, responses, assignments, drafts, governance, interpretation templates;
- clinical: mood, journal, messages, notes, medications, AI insights, reports;
- consent/relationships: consent documents/events, access codes, invitations, relationships, permissions;
- packages/payments: packages, Stripe catalog/configuration, payments, purchases, promo codes, webhook events;
- operations: notifications, audit log, rate-limit log, feature/platform configuration;
- ADHD check-ins and push tokens.

The local migrations model only the pre-payment subset and omit drafts, payments, ADHD check-ins, and later hardening.

## Core relationships

| Parent | Child | Relationship |
|---|---|---|
| `auth.users` | `profiles` | 1:1, cascade |
| `profiles` | `patient_profiles`, `clinician_profiles` | subtype 1:1 |
| `assessment_definitions` | `assessment_items` | 1:N |
| `assessment_definitions` | `assessment_submissions` | 1:N |
| `profiles` | `assessment_submissions` | patient 1:N |
| `assessment_submissions` | `assessment_responses` | 1:N |
| profiles patient/clinician | `assessment_assignments` | 1:N |
| packages | package assessments/results/sessions | 1:N / N:N |
| clinician/patient profiles | relationships | N:N relationship entity |
| relationships | permissions | 1:N |

Local integrity gap: `assessment_assignments.completed_submission_id` has no declared FK in the baseline (`schema_baseline.sql:172`).

## Critical findings

### DB-01 — Migration history cannot recreate production

Seventeen deployed migrations are absent. Approximately 78 older local files are stubs saying changes were applied directly. A fresh local apply does not faithfully represent the sequence that built production.

Consequences:

- disaster recovery can silently omit tables and security patches;
- preview environments differ from production;
- schema review cannot establish exactly which SQL was approved;
- rollback and incident response are unsafe.

**Remediation:** pull/reconstruct the complete schema and missing migrations, validate a clean build, compare schema hashes, and block deployment on drift.

**Effort:** 16–32 hours.

### DB-02 — Authorization role originates in user metadata

The live signup trigger invokes `handle_new_user()`, which reads `raw_user_meta_data.role`. This is user-controlled and creates a privileged profile through a definer function.

**Remediation:** hard-code `patient`; move clinician/admin elevation to audited server-only procedures; review existing privileged accounts.

**Effort:** 6–10 hours.

### DB-03 — RLS exposes unrelated patient records to clinicians

Live role-only policies remain on patient profiles, AI insights, chat sessions, shared journals, PDF reports, personality results, and all assessment assignments.

**Remediation:** active verified relationship + permission predicates, with admin policies separate. Test every table with cross-user fixtures.

**Effort:** 20–32 hours.

### DB-04 — Permissive policy overlap weakens clinical data controls

The later notes/messages migration adds policies without removing stricter predecessors. Because permissive policies OR together:

- private notes become patient-readable;
- clinicians can create notes for unassigned patients;
- message insert relationship enforcement can be bypassed.

**Remediation:** consolidate and explicitly drop obsolete policies.

**Effort:** 12–20 hours.

## High findings

### DB-05 — Guest submission schema contradiction

Live `assessment_submissions.patient_id` is NOT NULL. The guest API inserts NULL and no local guest table exists. The local constraint migration comments claim guests use a separate table, but they do not.

**Risk:** guaranteed guest-flow failure or pressure to weaken core ownership constraints.

**Remediation:** dedicated minimized guest-result table with no patient FK, short retention, abuse controls, and explicit consent—or remove guest persistence.

**Effort:** 12–20 hours.

### DB-06 — Relationship permission vocabulary is inconsistent

The database CHECK allows keys such as `view_profile`, `view_reports`, `export_reports`, and `generate_clinical_notes`. API/UI code uses different keys such as `view_clinical_notes`, `export_patient_data`, and `assign_assessments`.

**Risk:** failed approvals, missing grants, or ad hoc bypasses.

**Remediation:** one generated enum/source of truth shared by SQL and TypeScript; migration to normalize existing rows.

**Effort:** 8–16 hours.

### DB-07 — Privileged function grants are too broad

Live:

- `check_relationship_permission` is SECURITY DEFINER and executable by anon/authenticated;
- `get_my_role` is SECURITY DEFINER and externally executable;
- admin analytics functions are broadly executable, though invoker permissions limit some reads;
- `get_patient_risk_profile` is granted to PUBLIC/anon/authenticated.

**Remediation:** revoke PUBLIC/anon by default, grant only required roles, validate caller identity inside unavoidable definer functions, and move internal helpers to a private schema.

**Effort:** 6–12 hours.

## Integrity and normalization findings

| ID | Finding | Risk | Recommendation | Effort |
|---|---|---|---|---:|
| DB-08 | duplicate UPDATE triggers on `profiles` | redundant execution, migration noise | retain one role trigger and one timestamp trigger | 2–4h |
| DB-09 | legacy `assigned_clinician_id` plus relationship graph | contradictory source of truth | migrate to relationship entity; temporary compatibility view | 16–32h |
| DB-10 | package session user FK differs from result convention locally | inconsistent cascade/data model | align to `profiles(id)` where profile existence is required | 2–4h |
| DB-11 | free text role in local baseline | local rebuild lacks live role constraint | include live `profiles_role_check` migration | 1–2h |
| DB-12 | guest demographics attached to clinical submissions | mixed anonymous/identified model | separate and apply retention/minimization | 8–12h |
| DB-13 | no local storage bucket/object policies | upload authorization not reproducible | version-control private bucket and object policies | 8–16h |

## Index and query performance

Live Supabase performance advisor returned 362 findings:

| Finding | Count | Interpretation |
|---|---:|---|
| multiple permissive policies | 199 warnings | security clarity and per-query policy overhead |
| RLS auth init-plan | 51 warnings | auth functions evaluated per row in affected policies |
| duplicate indexes | 19 warnings | write/storage amplification |
| unindexed foreign keys | 17 info | slower joins/deletes and relationship checks |
| unused indexes | 76 info | review only after representative observation period |

Unindexed FKs include relationships around clinician verification, invitations, relationship revocation/modification, notification senders, and assessment drafts. These columns are likely used in authorization joins and delete cascades.

Duplicate families affect assessment submissions/responses/assignments, messages, clinical notes, notifications, journal entries, and rate-limit logs.

**Recommendations:**

1. Fix RLS correctness first.
2. Use `(select auth.uid())` and consolidate same-role/action policies.
3. Index FK columns used in joins and cascades.
4. Compare duplicate definitions before dropping.
5. Observe `pg_stat_user_indexes` over a real workload before removing “unused” indexes.

## Functions and concurrency

### Strengths

- `check_and_record_rate_limit` uses an advisory transaction lock.
- `submit_assessment_atomic` writes submission/responses in one transaction.
- package and access-code uniqueness constraints reduce duplicates.
- live function search paths were later repinned.
- live migration revoked public access to patient access-code generation.

### Risks

- `submit_assessment_atomic` accepts caller-supplied score, severity, risk flag, and responses. Its identity check is useful, but direct authenticated execution still allows a user to submit clinically invalid values unless the function validates item membership/ranges and recomputes scoring.
- No optimistic concurrency/version field was found for mutable clinical records.
- Admin materialized views have no observed refresh cron; only rate-limit cleanup is scheduled.

## Materialized views and cron

Live production has four admin materialized views and denies anon/authenticated direct SELECT. This corrects the local migration’s grant concern.

Only one live cron job was found:

```sql
0 * * * * DELETE FROM public.rate_limit_log
WHERE created_at < NOW() - INTERVAL '25 hours';
```

No materialized-view refresh job was present. Admin metrics can become stale unless refreshed elsewhere.

## Data retention, backups, and recovery

`docs/DISASTER_RECOVERY.md` describes a 4-hour RPO and 8-hour RTO but says PITR must be confirmed. No retention jobs were found for:

- audit logs;
- clinical notes/messages;
- notifications;
- AI interactions;
- guest demographics;
- payment webhook records.

Healthcare/GDPR production requires documented purpose, legal basis, retention, deletion exceptions, backup deletion behavior, and restoration drills.

## Database release gates

- [ ] Complete migrations committed and clean-build verified
- [ ] Signup role fixed and privileged accounts reviewed
- [ ] Every PHI table relationship-scoped
- [ ] Private notes and messages regression-tested
- [ ] Guest data model resolved
- [ ] Payment migrations and webhook controls present locally
- [ ] Storage policies version-controlled
- [ ] RLS test matrix automated
- [ ] PITR/restore drill evidenced
- [ ] Materialized-view freshness monitored

## Verdict

Database release readiness: **FAIL**. The deployed database has RLS enabled broadly, but current policy semantics and non-reproducible migration state are launch blockers.

