# RELEASE FREEZE CERTIFICATE

| Field | Value |
|---|---|
| **Date** | 2026-07-26 |
| **Release** | V Welfare v1.0.0 (first production GA) |
| **Document generated at (UTC)** | 2026-07-26 (with Production Release Package) |
| **Freeze baseline commit (`main`)** | Record at freeze start: `________________` |
| **Production alias** | `https://app.vwelfare.com` |
| **Supabase project** | `wyzezyctpvlohuuhzyof` |
| **Governing runbook** | `docs/release/PRODUCTION_RELEASE_PACKAGE_v1.0.0.md` |
| **Operator** | _______________________________ |
| **Release Manager** | _______________________________ |

---

## Purpose

This certificate attests that, from the moment it is signed until the maintenance window completes (or is formally aborted), production remains under **release freeze**: no out-of-band changes outside the approved runbook steps.

Sign **at freeze start (T−60m or earlier)**. Re-affirm at window close if required by the Release Manager.

---

## I certify that:

- [ ] No direct production SQL has been executed after this document was generated.
- [ ] No production hotfix has been applied.
- [ ] No database objects were manually modified.
- [ ] No environment variables were changed.
- [ ] No GitHub force-push occurred.
- [ ] No Supabase dashboard schema edits occurred.

---

## Freeze scope (explicit)

During freeze, the **only** permitted production actions are those listed in `docs/release/PRODUCTION_RELEASE_PACKAGE_v1.0.0.md` after Decision Gate **G0**, and only when the Release Manager has called **GO** at T0:

| Permitted (runbook-only) | Forbidden |
|---|---|
| Read-only SQL verification queries (§6) | Ad-hoc / dashboard DDL or DML |
| `supabase db push` **only** if dry-run shows solely accepted `ipip120` (§5.2.1) | Any other `db push`, MCP `apply_migration`, or SQL Editor writes |
| Enable leaked-password protection toggle (§5.3) | Other Auth/schema dashboard edits |
| Vercel Production promote of certified `RELEASE_COMMIT` (§5.5) | Hotfix commits, force-push, env var edits |
| Rollback to recorded LKG (§9) if a gate fails | Manual object edits to “fix forward” outside governance |

Any exception requires an opened incident and the emergency procedure in `docs/PRODUCTION_GOVERNANCE_POLICY.md` §5 (same-day backfill migration mandatory).

---

## Signed

| Role | Name | Signature | Date (UTC) |
|---|---|---|---|
| **Release Manager** | | _____________________ | |
| **Operator / Senior DBA** | | _____________________ | |
| **Security Lead** (optional countersign) | | _____________________ | |

---

**Release Manager**

_____________________

---

*Void if any checkbox above is false at signing time. Open an incident and do not proceed to T0.*
