# V Welfare — Abort Matrix v1.0.0

| Field | Value |
|---|---|
| **Document ID** | `REL-ABT-100` |
| **Document version** | `1.0.0` |
| **Document status** | `AUTHORITATIVE` |
| **Effective date (UTC)** | `2026-07-26` |
| **Owner** | Release Manager |
| **Approver** | Release Manager + Security Lead |
| **Release** | `v1.0.0` |
| **Parent** | `REL-PKG-100` §8 |

---

## 1. Purpose

Single abort/rollback decision table for the v1.0.0 window. Overrides informal judgment. Aligns to Production Release Package Decision Gates **G0–G11**.

---

## 2. Abort vs rollback

| Term | Definition |
|---|---|
| **ABORT** | Stop before Production alias changes (or before tag). Leave LKG serving. Do not tag. |
| **ROLLBACK** | Production alias already changed (or Auth toggle applied) — restore LKG / reverse toggle per Package §9. Do not tag. |
| **HOLD** | Pause clock; extend window only with RM written approval; no improvised fixes. |

---

## 3. Matrix

| Trigger | Gate | Action | Authority | Patient impact control |
|---|---|---|---|---|
| Backups missing / PITR invalid / LKG unknown | G0 | **ABORT** | RM | No promote |
| Migration dry-run shows unexpected pending or prod-only drift | G1 | **ABORT** + drift incident | RM + DBA | No `db push` |
| SQL fingerprint md5/count mismatch pre-change | G2 | **ABORT** | RM + DBA + SEC | No promote |
| Cannot enable leaked-password and no signed exception | G3 | **ABORT** or **GO WITH CONDITIONS** only if `REL-EXC-100` signed | RM + SEC | No unconditional GA |
| CI not green on RELEASE_COMMIT | G4 | **ABORT** | RM | No promote |
| Alias wrong commit / 5xx after promote | G5 | **ROLLBACK** app | RM → OPS | Confirm LKG health |
| Post-change grants/RLS fail | G6 | **ROLLBACK** app; DB incident if grants wrong | RM + DBA + SEC | **Do not open to patients** |
| Security advisors ERROR &gt; 0 | G7 | **HOLD** then **ABORT/ROLLBACK** | SEC + RM | Block GA |
| Live `test:security` fail (PHI isolation / PDF non-owner) | G8 | **ROLLBACK** app immediately | RM + SEC | **Do not open to patients** |
| Smoke P0 fail (auth, assessment, scoring, export) | G9 | **ROLLBACK** or **HOLD** per severity | RM | Clinical safety first |
| Acceptance criteria incomplete | G10 | **ABORT** tag | RM | Alias may stay only if G8/G9 green |
| Sign-off incomplete | G11 | **ABORT** tag | RM | No GitHub Release |
| Suspected PHI exposure during window | — | **ROLLBACK** + P1 incident (`FRM-INC-100`) | RM + SEC | Immediate containment |
| Platform outage (Vercel/Supabase P1) mid-window | — | **HOLD** or **ABORT** | RM | Resume only after vendor green |

---

## 4. Clinical safety abort rules (healthcare)

Abort or rollback **without debate** if any of the following occur:

1. Cross-patient PHI readable by unauthorized principal  
2. PDF/export returns another patient’s content (`200` with body)  
3. Assessment scoring wrong vs certified server-side rules in a way that could mislead care  
4. Backup/restore path unverified when a DB write was attempted  
5. Security advisor **ERROR** introduced by the window  

---

## 5. Communication on abort/rollback

1. RM announces decision phrase: `NO GO — execute Section 9 Rollback; do not tag.` (or ABORT variant)  
2. OPS/DBA execute Abort Matrix action  
3. File `FRM-INC-100` if P1/P2  
4. Complete Maintenance Window Log with outcome `ABORTED` or `ROLLED_BACK`  
5. Do **not** cut `v1.0.0`  

---

## Approval

| Role | Name | Decision | Date (UTC) | Signature |
|---|---|---|---|---|
| Owner — Release Manager | | | | |
| Approver — Security Lead | | | | |
