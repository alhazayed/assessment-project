# V Welfare — Evidence Register v1.0.0

| Field | Value |
|---|---|
| **Document ID** | `REL-EVD-100` |
| **Document version** | `1.0.0` |
| **Document status** | `ACTIVE` |
| **Effective date (UTC)** | `2026-07-26` |
| **Owner** | Security Lead |
| **Approver** | Release Manager |
| **Release** | `v1.0.0` |
| **Retention** | ≥ 7 years (or legal hold) |
| **PHI rule** | Redact patient identifiers; no raw assessment answers in vault |

---

## 1. How to use

During the window, append one row per evidence item. Store binaries in the secure evidence vault; record only the vault path here.

---

## 2. Register

| Evid. ID | Gate / Control | Description | Collected by | Timestamp (UTC) | Vault path / link | Result (PASS/FAIL) | Redaction done ☐ |
|---|---|---|---|---|---|---|---|
| E-001 | G0 | Backup Success screenshot + PITR window | DBA | | | | ☐ |
| E-002 | G0 | LKG deployment ID + commit SHA | OPS | | | | ☐ |
| E-003 | G1 | `supabase migration list` transcript | DBA | | | | ☐ |
| E-004 | G1 | `supabase db push --dry-run` transcript | DBA | | | | ☐ |
| E-005 | G2 | `has_clinician_access` md5 query output | DBA | | | | ☐ |
| E-006 | G2 | RLS policy count + names output | DBA | | | | ☐ |
| E-007 | G3 | Leaked-password Enabled screenshot | SEC | | | | ☐ |
| E-008 | G4 | CI green for RELEASE_COMMIT | OPS | | | | ☐ |
| E-009 | G5 | Production alias = RELEASE_COMMIT | OPS | | | | ☐ |
| E-010 | G6 | Admin RPC grants query (8 rows) | DBA | | | | ☐ |
| E-011 | G6 | Anon helper grants query | DBA | | | | ☐ |
| E-012 | G7 | Security advisors 0 ERROR export | SEC | | | | ☐ |
| E-013 | G8 | `npm run test:security` full log | SEC | | | | ☐ |
| E-014 | G8 | PDF non-owner denial proof (status only) | SEC | | | | ☐ |
| E-015 | G9 | Smoke P0 checklist marked copy | OPS | | | | ☐ |
| E-016 | §10 | `/api/health` response (no secrets) | OPS | | | | ☐ |
| E-017 | §10 | Security headers capture | SEC | | | | ☐ |
| E-018 | G11 | Signed Package §14 + Freeze Certificate | RM | | | | ☐ |
| E-019 | Closure | Release Closure Report | RM | | | | ☐ |
| E-020 | PHI | Patient isolation summary (counts only) | SEC | | | | ☐ |

---

## 3. Healthcare / audit mapping

| Control theme | Evidence IDs | Framework notes |
|---|---|---|
| Access control / patient isolation | E-005, E-006, E-013, E-020 | SOC 2 CC6; HIPAA §164.312(a) |
| Audit / change control | E-003, E-004, E-008, E-018, E-019 | ISO 27001 A.8 / A.5; SOC 2 CC8 |
| Cryptography / transmission | E-017 | HIPAA §164.312(e) |
| Contingency / backup | E-001, E-002 | HIPAA §164.308(a)(7); DR audit |
| Vulnerability / config | E-007, E-012 | ISO 27001 A.8.8 |
| Clinical export safety | E-014, E-015 | Clinical safety / PHI minimum necessary |

---

## Approval

| Role | Name | Decision | Date (UTC) | Signature |
|---|---|---|---|---|
| Owner — Security Lead | | | | |
| Approver — Release Manager | | | | |
