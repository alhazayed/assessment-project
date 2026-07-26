# Contradiction Resolution Log — V Welfare Platform v1.0.0

**Document status:** AUTHORITATIVE  
**Board date:** 2026-07-26  
**Rule:** One answer per topic. All documents must match.

---

| # | Topic | Conflicting claims | **Canonical answer** | Binding document |
|---|---|---|---|---|
| 1 | Launch decision | GO / CONDITIONAL GO / AUTHORIZED / CERTIFIED FOR PUBLIC PRODUCTION | **CONDITIONAL GO** | Canonical Release State |
| 2 | Tag status | Released / tag created / tag only after gates | **`v1.0.0` NOT CUT** | Canonical Release State |
| 3 | Version / release name | Mixed | **V Welfare Platform v1.0.0** / version `1.0.0` | README constants |
| 4 | Commit SHA | `f4fa238` vs `649cef6` vs others | **Freeze SHA `6e219e62e9f74273595ef10e31220bb24d0945f7`**; GA SHA TBD at cut | Freeze Certificate |
| 5 | Production alias | Mixed hostnames | **`https://app.vwelfare.com`** | Canonical State |
| 6 | MFA | “MFA support” vs not implemented | **Not implemented; post-GA** | Canonical State § capability |
| 7 | Audit trail | “Complete audit trail” vs gap | **Partial; centralized admin trail post-GA** | Canonical State + Governance §6 |
| 8 | Email confirmation | Verified working vs disabled | **Disabled; post-GA** | Canonical State |
| 9 | Incident response | Deferred post-GA vs COMPLETE | **Runbook ACTIVE**; deferral applies to **staffing/contacts completion**, not document existence | IR Runbook + Remaining Actions |
| 10 | RTO | 4h vs 8h | **4 hours** | `BACKUP_AND_DISASTER_RECOVERY.md` |
| 11 | RPO | \<1h vs 4h | **\< 1 hour** | `BACKUP_AND_DISASTER_RECOVERY.md` |
| 12 | PITR | Enabled vs confirm plan | **Unconfirmed until admin verifies**; required to meet RPO | Remaining Actions + Runbook |
| 13 | Merge strategy | Squash vs fast-forward | **Squash-merge** | Governance Policy §4 |
| 14 | Promotion policy | Auto-deploy vs human promote | **Human deliberate promote of `main`-target builds only; no auto-promote** | Governance Policy §4 |
| 15 | Governance status | Proposed vs merged gate | **Adopted effective 2026-07-26** | Governance Policy header |
| 16 | Gate G1–G3 checkboxes | All ☐ vs PRs merged on `main` | **Merged on `main`; dry-run / branch-protection evidence still required** | Canonical State gate board |
| 17 | Anon authorization oracle | Closed vs still revoke | **Closed** per Checklist §1 (revokes done). Residual WARNs tracked only if advisors reopen | Checklist §1 |
| 18 | Leaked-password | Accepted risk vs GA gate | **GA gate (must enable before tag)** | Checklist §6 / Runbook §D |
| 19 | Appointments / full audit marketing claims | Release notes feature list | **Not certified capabilities for GA messaging**; do not claim in GA release notes | Release Notes (rewritten) |
| 20 | Timeline | Multiple implied GA dates | **Freeze T6 = 2026-07-26; GA = T10 pending** | Canonical Timeline |
| 21 | Duplicate procedures | Many deploy checklists | **Only Operator Runbook** | Operator Runbook |
| 22 | Break-glass | Hardening Option B vs Governance §5 | **Governance §5 wins** (incident + same-day backfill). Option B is not authorized while Governance is Adopted | Governance Policy §5 |
| 23 | Mobile in v1.0.0 GA | Implied included vs deferred hardening | **Web GA track.** Mobile patient traffic / Play promotion is a **separate track**; not required to cut web `v1.0.0` but not claimed “mobile GA complete” | Canonical State |
| 24 | Unsigned AUTHORIZED stamps | Present in env/final certs | **Invalid.** Sign-off requires named humans in Checklist §8 | Checklist §8 |

---

*End of resolution log. New contradictions → amend this log and Canonical State in the same docs PR.*
