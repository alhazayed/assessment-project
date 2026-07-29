# V Welfare — Authoritative Release Package (v1.0.0)

**Document status:** AUTHORITATIVE  
**Package effective date:** 2026-07-26  
**Release name:** V Welfare Platform v1.0.0  
**Target tag:** `v1.0.0` (**not cut**)  
**Documentation freeze SHA:** `6e219e62e9f74273595ef10e31220bb24d0945f7`  
**Production alias:** `https://app.vwelfare.com`  
**Repository:** `alhazayed/assessment-project`  
**Current decision:** ⚠️ **CONDITIONAL GO**

---

## Authority hierarchy (single source of truth)

| Rank | Document | Role |
|---:|---|---|
| 1 | [`CANONICAL_RELEASE_STATE.md`](./CANONICAL_RELEASE_STATE.md) | **Current release status** — the only answer to “where are we?” |
| 2 | [`OPERATOR_RUNBOOK_v1.0.0.md`](./OPERATOR_RUNBOOK_v1.0.0.md) | **Only executable operator procedure** for remaining gates → GA |
| 3 | [`../RELEASE_CHECKLIST_v1.0.0.md`](../RELEASE_CHECKLIST_v1.0.0.md) | Gate evidence board + sign-off block |
| 4 | [`../PRODUCTION_GOVERNANCE_POLICY.md`](../PRODUCTION_GOVERNANCE_POLICY.md) | Adopted change-control policy |
| 5 | [`CANONICAL_RELEASE_TIMELINE.md`](./CANONICAL_RELEASE_TIMELINE.md) | Single timeline all docs reference |
| 6 | [`FREEZE_CERTIFICATE.md`](./FREEZE_CERTIFICATE.md) | Documentation / engineering freeze record |
| 7 | [`RECONCILIATION_REPORT.md`](./RECONCILIATION_REPORT.md) | Board reconciliation, score, verdict |

If any other document conflicts with rank 1–4, **this package wins**. Conflicting statements elsewhere are historical only.

---

## Final documentation index

### AUTHORITATIVE (in force)

| Path | Purpose |
|---|---|
| `docs/release/README.md` | This index + hierarchy |
| `docs/release/CANONICAL_RELEASE_STATE.md` | Current release state |
| `docs/release/OPERATOR_RUNBOOK_v1.0.0.md` | Operator runbook |
| `docs/release/CANONICAL_RELEASE_TIMELINE.md` | Canonical timeline |
| `docs/release/FREEZE_CERTIFICATE.md` | Freeze certificate |
| `docs/release/SUPERSESSION_MATRIX.md` | Status of every release artifact |
| `docs/release/CONTRADICTION_RESOLUTION_LOG.md` | One-answer resolutions |
| `docs/release/ISSUE_MATRIX.md` | Issue → resolution → action |
| `docs/release/REMAINING_ADMINISTRATIVE_ACTIONS.md` | Open admin actions only |
| `docs/release/RECONCILIATION_REPORT.md` | Board report + governance score + verdict |
| `docs/RELEASE_CHECKLIST_v1.0.0.md` | Gate board / sign-off |
| `docs/PRODUCTION_GOVERNANCE_POLICY.md` | Adopted governance |
| `INCIDENT_RESPONSE_RUNBOOK.md` | Incident response (contacts must be completed — see Remaining Actions) |
| `BACKUP_AND_DISASTER_RECOVERY.md` | Binding DR targets (RTO/RPO/PITR) |

### REFERENCE ONLY (post-GA / supporting; not launch authority)

| Path | Purpose |
|---|---|
| `docs/SECURITY_HARDENING_V1.1_PLAN.md` | Post-GA hardening plan |
| `docs/SUPERADMIN_OPERATIONS_MANUAL.md` | Superadmin ops |
| `docs/SUPERADMIN_DELETION_GUIDE.md` | Deletion guide |
| `docs/PACKAGES_PAYMENT_SYSTEM.md` | Packages/payments product docs |
| `docs/PLATFORM_TECHNICAL_DOSSIER.md` | Technical dossier (descriptive) |
| `PHASE_6_LOAD_TESTING_PROCEDURES.md` | Load-test procedures (execute post-gate or post-GA per runbook) |
| `CHANGELOG.md` | Changelog (must not contradict Canonical Release State) |

### SUPERSEDED (historical; do not use for go-live)

See [`SUPERSESSION_MATRIX.md`](./SUPERSESSION_MATRIX.md). Every superseded file carries a banner pointing here.

---

## Canonical constants (normalize everywhere)

| Constant | Value |
|---|---|
| Release name | V Welfare Platform v1.0.0 |
| Version | `1.0.0` |
| Git tag | `v1.0.0` (**not cut until Operator Runbook complete**) |
| Freeze SHA | `6e219e62e9f74273595ef10e31220bb24d0945f7` |
| GA tag SHA | *TBD — written into Canonical Release State at tag time* |
| Production alias | `https://app.vwelfare.com` |
| Decision | CONDITIONAL GO |
| Governance policy | **Adopted** (effective 2026-07-26) |
| Merge policy | Squash-merge to `main` |
| Promote policy | Human deliberate promote of `main`-target builds only |
| RTO | 4 hours |
| RPO | \< 1 hour |
| MFA | Not implemented (post-GA) |
| Email confirmation | Disabled (post-GA) |
| Central admin audit trail | Not complete (post-GA) |
| Incident response runbook | **Exists and is ACTIVE** (staffing/contacts incomplete) |

---

*Release Governance Board — documentation reconciliation 2026-07-26. No engineering, SQL, or infrastructure changes.*
