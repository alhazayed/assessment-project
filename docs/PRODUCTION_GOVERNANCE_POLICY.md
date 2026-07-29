# V Welfare — Production Governance Policy

**Document status:** ACTIVE (Rank 4)  
**Status:** **Adopted (v1.0)** · **Effective:** 2026-07-26 · **Owner:** Release Manager / DevSecOps Lead  
**Applies to:** `alhazayed/assessment-project` (web + mobile + Supabase `wyzezyctpvlohuuhzyof`)  
**Authority:** Subordinate to [`docs/release/CANONICAL_RELEASE_STATE.md`](./release/CANONICAL_RELEASE_STATE.md) for release decision; this policy binds change control.

This policy exists because production DDL has twice reached the database without a corresponding merged repo migration, causing repo↔production drift (repaired in the reconciliation PR). Its goal is simple and non-negotiable for a platform handling mental-health PHI: **production must always be reproducible from `main`, and every production change must be traceable to a reviewed commit.**

This is a process document. It makes **no** code, schema, RLS, or authorization change.

Release timeline: [`docs/release/CANONICAL_RELEASE_TIMELINE.md`](./release/CANONICAL_RELEASE_TIMELINE.md).  
Operator procedures: [`docs/release/OPERATOR_RUNBOOK_v1.0.0.md`](./release/OPERATOR_RUNBOOK_v1.0.0.md).

---

## 1. Source-of-truth rule

- `main` is the single source of truth. Production (application, schema, RLS, grants, edge functions) must be reconstructable from `main` at any commit.
- Weekly drift check (§7) must show zero divergence. Any drift is an incident.

## 2. Migration rules

- **All DDL reaches production only via a migration file merged to `main`.** No dashboard SQL, no MCP `apply_migration`, no `execute_sql` DDL against production outside the emergency procedure (§5).
- One logical change per migration file. Never edit a migration that has been applied anywhere — supersede it with a new one.
- Migration version = the real apply timestamp recorded in `supabase_migrations.schema_migrations`. Never hand-author round-number timestamps (this was the root cause of the drift).
- A migration PR touches **only** `supabase/`. It must not mix in application code, docs, or CI (see §3).
- Before merge, an operator runs `supabase db push --dry-run` (expect zero unexpected pending) and `supabase migration list` (Local/Remote aligned).

## 3. Change-isolation rule (small, single-concern PRs)

Never mix these in one PR — each is its own branch and PR:

| Category | Path scope |
|---|---|
| Database / migration | `supabase/` |
| Application code | `app/`, `lib/`, components |
| Documentation | `docs/`, `*.md` |
| Mobile | `mobile/` |
| CI / tooling | `.github/`, config |
| Security-config | Supabase Auth / dashboard settings (tracked via a docs PR describing the change) |

## 4. Branch & deployment policy

- Short-lived branches off `main`; draft PR until checks green; **squash-merge**.
- **Only promoted `main`-target builds** may serve the production alias (`https://app.vwelfare.com`). Do not promote a preview/branch build to production.
- Every production promote is a **deliberate human action**. **No auto-promote** of un-reviewed builds. (Historical docs that said “Vercel auto-deploys to production” are SUPERSEDED and incorrect for policy.)
- Rollback path: Vercel instant rollback / promote previous (app) + documented inverse migration (DB, when reversible). See Operator Runbook.

## 5. Emergency SQL procedure (break-glass)

Direct production SQL is permitted **only** when all of the following hold:

1. A named incident record is opened first (what, why, who, when).
2. The statement is idempotent and minimal.
3. A backfill migration PR reproducing the exact DDL (with prod's recorded version) is opened the **same day** and merged to `main`.
4. The weekly drift check (§7) is run immediately after to confirm no residual divergence.

Skipping the same-day backfill is a policy violation and a drift incident.

**Conflict rule:** Any alternate “Option B hotfix” language in planning docs that omits same-day backfill is **not authorized** while this policy is Adopted.

## 6. Audit requirements

- Retain Supabase audit logs and the application `security_events` table.
- Implement a centralized, immutable audit trail for admin/superadmin actions (currently only failed admin login is logged — this is a **known gap**, deferred post-GA; required before enterprise/regulated onboarding).
- Every migration PR and every emergency-SQL incident is part of the audit record.

## 7. Weekly verification procedure

Run and record results weekly (and after any production change):

1. `supabase migration list` → Local/Remote aligned (0 drift).
2. Security advisors → 0 ERROR; review WARNs.
3. Function-grant + RLS fingerprint snapshot (admin RPCs service_role-only; `has_clinician_access` body md5 unchanged; PHI-table policy counts unchanged).
4. Vercel runtime errors (24h) → 0 organic.
5. Confirm production alias points at the intended `main` build.

## 8. Disaster-recovery validation

- Binding objectives: **RTO 4 hours · RPO \< 1 hour** (`BACKUP_AND_DISASTER_RECOVERY.md`).
- Quarterly: provision a scratch database from `main` migrations only, then `supabase db diff` against production → expect empty.
- Verify backup/restore (and PITR posture) on the same cadence.

## 9. Edge functions

- Edge-function source lives in the repo (`supabase/functions/`) and deploys from `main`. (Known gap: three live JWT-protected functions — `create-invitation`, `submit-assessment`, `add-medication` — have no repo source; commit them so they are reproducible — post-GA tracked item.)

---

*Adopted by Release Governance Board 2026-07-26 as part of documentation reconciliation. Documentation only; no running-system change.*
