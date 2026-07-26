# V Welfare — Release Freeze Certificate v1.0.0

| Field | Value |
|---|---|
| **Document ID** | `REL-FRZ-100` |
| **Document version** | `1.0.0` |
| **Document status** | `AUTHORITATIVE` |
| **Effective date (UTC)** | `2026-07-26` |
| **Owner** | Release Manager |
| **Approver** | Release Manager |
| **Release** | `v1.0.0` (first production GA) |
| **Document generated at (UTC)** | `2026-07-26` |
| **Freeze baseline commit (`main`)** | Record at freeze start: `________________` |
| **Production alias** | `https://app.vwelfare.com` |
| **Supabase project** | `wyzezyctpvlohuuhzyof` |
| **Governing runbook** | `docs/release/PRODUCTION_RELEASE_PACKAGE_v1.0.0.md` (`REL-PKG-100`) |
| **Companion** | `docs/release/CONFIGURATION_FREEZE_RECORD_v1.0.0.md` (`REL-CFG-100`) |
| **Operator** | _______________________________ |
| **Release Manager** | _______________________________ |
| **Hierarchy** | Rank 3 (`docs/release/00_DOCUMENT_CONTROL_INDEX.md`) |

---

## 1. Purpose

This certificate attests that, from the moment it is signed until Release Closure (`REL-CLS-100`), production remains under **release freeze**: no out-of-band changes outside the approved runbook steps.

Sign **at freeze start (T−60m or earlier)**, after CAB approval (`REL-CAB-100`). Re-affirm at window close if required by the Release Manager.

---

## 2. I certify that

- [ ] No direct production SQL has been executed after this document was generated (except read-only Package §6 queries after T0 GO, and §5.2.1 only if authorized).
- [ ] No production hotfix has been applied.
- [ ] No database objects were manually modified.
- [ ] No environment variables were changed (see Configuration Freeze Record; Auth leaked-password toggle is the sole runbook exception after T0 GO).
- [ ] No GitHub force-push occurred.
- [ ] No Supabase dashboard schema edits occurred.

---

## 3. Freeze scope (explicit)

During freeze, the **only** permitted production actions are those listed in `REL-PKG-100` after Decision Gate **G0**, and only when the Release Manager has called **GO** at T0:

| Permitted (runbook-only) | Forbidden |
|---|---|
| Read-only SQL verification queries (§6) | Ad-hoc / dashboard DDL or DML |
| `supabase db push` **only** if dry-run shows solely accepted `ipip120` (§5.2.1) | Any other `db push`, MCP `apply_migration`, or SQL Editor writes |
| Enable leaked-password protection toggle (§5.3) | Other Auth/schema dashboard edits |
| Vercel Production promote of certified `RELEASE_COMMIT` (§5.5) | Hotfix commits, force-push, env var edits |
| Rollback to recorded LKG (§9) / Abort Matrix if a gate fails | Manual object edits to “fix forward” outside governance |

Any exception requires an opened incident (`FRM-INC-100`) and the emergency procedure in `docs/PRODUCTION_GOVERNANCE_POLICY.md` §5 (same-day backfill migration mandatory).

---

## 4. Signed

| Role | Name | Signature | Date (UTC) |
|---|---|---|---|
| **Release Manager** | | _____________________ | |
| **Operator / Senior DBA** | | _____________________ | |
| **Security Lead** (countersign) | | _____________________ | |

**Release Manager**

_____________________

---

*Void if any checkbox above is false at signing time. Open an incident and do not proceed to T0.*
