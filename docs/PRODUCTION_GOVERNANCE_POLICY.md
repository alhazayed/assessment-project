# V Welfare — Production Governance Policy

| Field | Value |
|---|---|
| **Document ID** | `POL-GOV-100` |
| **Document version** | `1.0.0` |
| **Document status** | `ACTIVE` |
| **Effective date (UTC)** | `2026-07-26` |
| **Owner** | DevSecOps Lead |
| **Approver** | Release Manager + Security Lead |
| **Applies to** | `alhazayed/assessment-project` (web + mobile + Supabase `wyzezyctpvlohuuhzyof`) |
| **Hierarchy** | Rank 1 — standing policy (`docs/release/00_DOCUMENT_CONTROL_INDEX.md`) |

This policy exists because production DDL has twice reached the database without a corresponding merged repo migration, causing repo↔production drift (repaired in the reconciliation PR). Its goal is simple and non-negotiable for a platform handling mental-health PHI: **production must always be reproducible from `main`, and every production change must be traceable to a reviewed commit.**

This is a process document. It makes **no** code, schema, RLS, or authorization change.

**Release execution:** For the v1.0.0 maintenance window, operational steps are defined solely in `docs/release/PRODUCTION_RELEASE_PACKAGE_v1.0.0.md` (`REL-PKG-100`). This policy does not redefine window commands.

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

- Short-lived branches off `main`; draft PR until checks green; squash-merge.
- **Only promoted `main`-target builds** may serve the production alias (`app.vwelfare.com`). Do not promote a preview/branch build to production.
- Every production promote is a deliberate human action. No auto-promote of un-reviewed builds.
- Rollback path: Vercel instant rollback (app) + documented `.down`/inverse migration or revert commit (DB, when reversible).

## 5. Emergency SQL procedure (break-glass)

Direct production SQL is permitted **only** when all of the following hold:

1. A named incident record is opened first (what, why, who, when).
2. The statement is idempotent and minimal.
3. A backfill migration PR reproducing the exact DDL (with prod's recorded version) is opened the **same day** and merged to `main`.
4. The weekly drift check (§7) is run immediately after to confirm no residual divergence.

Skipping the same-day backfill is a policy violation and a drift incident.

## 6. Audit requirements

- Retain Supabase audit logs and the application `security_events` table.
- Implement a centralized, immutable audit trail for admin/superadmin actions (currently only failed admin login is logged — this is a gap to close before enterprise/regulated onboarding).
- Every migration PR and every emergency-SQL incident is part of the audit record.

## 7. Weekly verification procedure

Run and record results weekly (and after any production change):

1. `supabase migration list` → Local/Remote aligned (0 drift).
2. `get_advisors(security)` → 0 ERROR; review WARNs.
3. Function-grant + RLS fingerprint snapshot (admin RPCs service_role-only; `has_clinician_access` body md5 unchanged; PHI-table policy counts unchanged).
4. Vercel runtime errors (24h) → 0 organic.
5. Confirm production alias points at the intended `main` build.

## 8. Disaster-recovery validation

- **Authoritative DR objectives for production operations:** RTO **4 hours**, RPO **&lt; 1 hour** — see `BACKUP_AND_DISASTER_RECOVERY.md` (`DR-BAK-100`). (`docs/DISASTER_RECOVERY.md` is superseded for RTO/RPO.)
- Quarterly: provision a scratch database from `main` migrations only, then `supabase db diff` against production → expect empty. This proves the source-of-truth rule holds and DR is real.
- Verify backup/restore of the Supabase project on the same cadence.

## 9. Edge functions

- Edge-function source lives in the repo (`supabase/functions/`) and deploys from `main`. (Current gap: three live JWT-protected functions — `create-invitation`, `submit-assessment`, `add-medication` — have no repo source; commit them so they are reproducible.)

---

## 10. Approval

| Role | Name | Decision | Date (UTC) | Signature |
|---|---|---|---|---|
| Owner — DevSecOps Lead | | | | |
| Approver — Release Manager | | | | |
| Approver — Security Lead | | | | |

*Adopting this policy closes the change-control finding from the production certification. It is documentation only and changes no running system.*
