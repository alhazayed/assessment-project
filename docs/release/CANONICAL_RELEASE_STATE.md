# Canonical Release State — V Welfare Platform v1.0.0

**Document status:** AUTHORITATIVE (Rank 1)  
**Last updated:** 2026-07-26  
**Supersedes:** all prior “Production Ready / AUTHORIZED / GO LIVE / Released” status claims

This is the **only** document that answers “What is the current release status?”

---

## Release identity

| Field | Canonical value |
|---|---|
| Release name | V Welfare Platform v1.0.0 |
| Version | `1.0.0` |
| Target git tag | `v1.0.0` |
| Tag status | **NOT CUT** |
| Documentation freeze SHA | `6e219e62e9f74273595ef10e31220bb24d0945f7` |
| GA tag SHA | *TBD at tag cut* |
| Repository | `alhazayed/assessment-project` |
| Default branch | `main` |
| Production alias | `https://app.vwelfare.com` |
| Database project (documented ref) | `wyzezyctpvlohuuhzyof` |
| Timeline | [`CANONICAL_RELEASE_TIMELINE.md`](./CANONICAL_RELEASE_TIMELINE.md) |

---

## Release decision

| Field | Value |
|---|---|
| **Decision** | ⚠️ **CONDITIONAL GO** |
| Meaning | Engineering package is freeze-eligible for a controlled maintenance window; GA tag and patient-open are **blocked** until Remaining Administrative Actions and Checklist §6 open gates are closed and §8 is signed |
| Not in force | Unconditional GO, AUTHORIZED for immediate public production, or “Released” |
| Verdict (docs package) | See [`RECONCILIATION_REPORT.md`](./RECONCILIATION_REPORT.md) |

---

## Domain status board

| Domain | Status | Notes |
|---|---|---|
| **Repository** | Freeze baseline recorded | Freeze SHA above. Further engineering is out of scope for this reconciliation. |
| **Database** | Reconciliation merged (PR #80 on `main`) | Operator must still file dry-run evidence per Operator Runbook §A. No new DDL in this docs package. |
| **Deployment** | Human promote only | Production alias may only serve promoted `main`-target builds. Auto-promote is **forbidden**. |
| **Security** | Conditionally accepted | Live HTTP `test:security` **not yet green**. Leaked-password protection **not yet enabled**. MFA / email confirmation / full admin audit trail = post-GA. |
| **Documentation** | Reconciled 2026-07-26 | This package is the sole authority. |
| **Operational gates** | **OPEN** | See gate board below. |
| **Release decision** | CONDITIONAL GO | Tag + patient-open after runbook completion. |

---

## Operational gate board (mirrors Checklist §6)

| # | Gate | Status | Evidence location |
|---|---|---|---|
| G1 | Migration reconciliation on `main` + dry-run evidence | ☑️ Merged on `main` (`514ec7b` / PR #80) · ☐ Dry-run artifact filed | Operator Runbook §A |
| G2 | Web CI gate on `main` + required status check | ☑️ Merged on `main` (`935912d` / PR #83) · ☐ Branch protection confirmed | Operator Runbook §B |
| G3 | Governance policy on `main` + Adopted | ☑️ Merged (`b0a4f85` / PR #81) · ☑️ Adopted 2026-07-26 | `docs/PRODUCTION_GOVERNANCE_POLICY.md` |
| G4 | Live HTTP `test:security` green | ☐ OPEN | Operator Runbook §C |
| G5 | Leaked-password protection enabled | ☐ OPEN | Operator Runbook §D |
| G6 | Production alias serves intended `main` build | ☐ OPEN | Operator Runbook §E |
| G7 | Sign-off (§8) completed | ☐ OPEN | `docs/RELEASE_CHECKLIST_v1.0.0.md` §8 |
| G8 | Annotated tag `v1.0.0` + GitHub Release | ☐ BLOCKED until G1–G7 | Operator Runbook §F |

---

## Canonical capability statements (do not contradict)

| Topic | Canonical truth |
|---|---|
| MFA | **Not implemented.** Deferred post-GA. |
| Audit trail | **Partial.** Centralized immutable admin/superadmin trail **not** complete. Deferred post-GA. |
| Email confirmation | **Disabled.** Deferred post-GA pending SMTP/templates/UX. |
| Incident response | **Runbook exists and is ACTIVE** (`INCIDENT_RESPONSE_RUNBOOK.md`). Emergency contacts still placeholders — admin action. |
| RTO | **4 hours** |
| RPO | **\< 1 hour** |
| PITR | **Must be confirmed** before GA (admin action). Do not claim “enabled” until confirmed. |
| Merge strategy | **Squash-merge** to `main` |
| Production promotion | **Deliberate human promote** of `main`-target builds only |

---

## Patient-open rule

Do **not** declare GA or open to real patients until:

1. Gates G1–G7 are ✅ in the Checklist,  
2. Operator Runbook §A–§F complete,  
3. Canonical Release State updated with GA tag SHA and decision **GO**.

---

*Rank 1 authority. Update this file when any gate flips or the tag is cut.*
