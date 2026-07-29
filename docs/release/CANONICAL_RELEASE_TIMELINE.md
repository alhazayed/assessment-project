# Canonical Release Timeline — V Welfare Platform v1.0.0

**Document status:** AUTHORITATIVE  
**All release documents must reference this timeline.**

---

## Timeline

| Phase | Date (UTC) | Event | Artifact |
|---|---|---|---|
| T0 | 2026-06-30 | Historical operational-hardening / certification wave (now SUPERSEDED as launch authority) | Superseded cert docs |
| T1 | 2026-07-01 | Independent go-live certification (CONDITIONAL) — historical | `GO_LIVE_CERTIFICATION_2026_07_01.md` (SUPERSEDED) |
| T2 | 2026-07-10 | Runtime certification with minor conditions — historical | `FINAL_CERTIFICATION.md` (SUPERSEDED) |
| T3 | 2026-07-18 | RC security gate + production release report (CONDITIONAL) — historical | RC / Production release reports (SUPERSEDED) |
| T4 | 2026-07-19 | Release checklist authored | `docs/RELEASE_CHECKLIST_v1.0.0.md` |
| T5 | 2026-07-20 | Checklist merged to `main` (#84); freeze baseline SHA established | `6e219e62e9f74273595ef10e31220bb24d0945f7` |
| T5a | (on `main` before T5) | PR #80 migration reconcile, #81 governance, #83 CI gate merged | Gate G1–G3 merge facts |
| **T6 — RELEASE FREEZE** | **2026-07-26** | **Documentation reconciliation; engineering frozen for this board action** | `FREEZE_CERTIFICATE.md` |
| T7 | *Pending* | Maintenance window: execute Operator Runbook §A–§E | Runbook evidence log |
| T8 | *Pending* | Sign-off (Checklist §8) | Checklist §8 |
| T9 | *Pending* | Cut annotated tag `v1.0.0` + publish GitHub Release | Operator Runbook §F |
| **T10 — PRODUCTION GA** | *Pending* | Canonical Release State → **GO**; patient-open allowed | `CANONICAL_RELEASE_STATE.md` |

---

## Rules

1. **Release freeze** begins at **T6 (2026-07-26)**.  
2. **Production GA** is **T10** and does not exist until Canonical Release State is updated.  
3. Statements dated T0–T5 that say “Released,” “AUTHORIZED,” or unconditional “GO LIVE” are **historical records only**.  
4. No document may invent a GA date before T10 is recorded here and in Canonical Release State.

---

*Referenced by every authoritative package document.*
