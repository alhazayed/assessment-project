# V Welfare Database Report
**Basis:** static review of 100 SQL migrations and application queries. Deployed schema, policies, extensions, query plans, and migration history were not available; all production claims require Supabase verification.

## Model
`auth.users` backs `profiles`, then patient/clinician subtype tables. Assessments are normalized into definitions, items, submissions and responses; clinical activity includes notes, messages, mood, journal and AI insights. Relationship and permission tables are intended to govern clinician access. Packages, notifications, audit, rate limit, CMS, feature flags, consent, and admin materialized views complete the schema.

## Critical
| ID | Evidence | Impact | Remedy | Effort |
|---|---|---|---|---|
| DB-01 | `20260627220200_assessment_submissions_constraints.sql` makes `patient_id` NOT NULL; `app/api/submit-assessment-guest/route.ts:293-307` inserts `patient_id: null` | Guest assessment production failure after migration | Choose a dedicated guest-submission table or allow nullable patient IDs with strict guest-only controls; align route, constraints, retention and reporting. | 4–8 h |
| DB-02 | `20260627220000_admin_dashboard_materialized_views.sql:55-87` references `profiles.user_type`, `full_name`, `email`; baseline defines `role`, `full_name_en/ar` | View creation/refresh fails, blocking dashboard/RPCs | Rewrite views against actual schema; do not join `auth.users` from exposed objects; stage and refresh-test. | 4–6 h |
| DB-03 | `20260624190200_clinical_notes_and_messages_rls.sql` adds policies without removing baseline policies | PostgreSQL permissive policies combine with OR and may broaden PHI access | Replace whole policy set in one migration and add RLS integration matrix. | 6–10 h |

## High
- **DB-04:** `relationship_permissions` has a CHECK vocabulary different from API/UI keys. Consent grants are nonfunctional or inconsistent. Create a canonical DB enum/lookup and generated/shared TypeScript type; backfill. (6–10 h)
- **DB-05:** materialized-view RPCs are granted to `authenticated`; revoke public grants and apply role checks inside hardened wrappers. (3–5 h)
- **DB-06:** clinicians can read broad patient/AI/journal datasets in baseline policies rather than only active, consented relationships. Scope all RLS predicates to relationship and permission. (8–14 h)
- **DB-07:** `handle_new_user` trusts `raw_user_meta_data.role`. Lock to patient and use protected provisioning. (2–4 h)

## Integrity, scale, and migration quality
- `submit_assessment_atomic` has a useful `auth.uid() = p_patient_id` check. Keep scoring and response insertion transactional.
- Key FK/compound indexes and an atomic rate-limit function are present, but a duplicate patient/submission index appears in baseline and `20260627180500`.
- `/api/clinician/patients` selects `user_id` from `assessment_submissions`, whose schema uses `patient_id`; its last-assessment lookup fails and the fallback may over-fetch.
- Research and analytics routes load thousands of records into function memory. Move aggregates/pagination to SQL after fixing views and add query-plan thresholds.
- Many migrations are “applied remotely” stubs and constraints/fixes are duplicated across timestamps. Fresh reset cannot be assumed equivalent to production. Reconcile remote migration history before schema changes; do not squash or delete production history without a tested restoration plan.
- `generate_patient_access_code()` is security-definer without an explicit PUBLIC execute revoke in the consent migration. Restrict execute grants and set a fixed safe search path.
- No committed storage bucket/policy migration was found, despite clinician certificate/document URL workflow. Treat storage authorization as unverified.

## Required database verification
1. Compare `supabase migration list` with remote history and export schema/policies/functions to a controlled baseline.
2. Run Supabase security/performance advisors and inspect `pg_policies`, function grants, view owner/security options, and bucket policies.
3. For every exposed table/function, run anon, patient, clinician-with-permission, clinician-revoked, admin, and service-role tests.
4. Run `EXPLAIN (ANALYZE, BUFFERS)` on dashboard, results, research, clinician patient list, notifications and exports with representative volume.
5. Verify backup/PITR retention and restore to a separate project; run schema and RLS smoke tests.

## Design recommendations
Adopt one clinician-patient authorization source of truth; use explicit FKs/checks and indexes for every join/filter; isolate guest PII from authenticated PHI; prevent exposed SECURITY DEFINER functions by default; and establish migration CI that verifies a clean database can replay committed history.
