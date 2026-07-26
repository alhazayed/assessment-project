# V Welfare — Security Exception Register v1.0.0

| Field | Value |
|---|---|
| **Document ID** | `REL-EXC-100` |
| **Document version** | `1.0.0` |
| **Document status** | `ACTIVE` |
| **Effective date (UTC)** | `2026-07-26` |
| **Owner** | Security Lead |
| **Approver** | Release Manager + Clinical / Compliance |
| **Release** | `v1.0.0` |

---

## 1. Purpose

Record time-bounded security exceptions that allow **GO LIVE WITH CONDITIONS**. Exceptions are never used to waive patient isolation, PDF/export authorization, or backup verification failures.

---

## 2. Exception entries

| Exc. ID | Control waived | Justification | Compensating control | Expiry (UTC) | SEC | RM | CLIN | Status |
|---|---|---|---|---|---|---|---|---|
| EX-001 | *(example)* Leaked-password enable delayed | *(fill)* | Heightened password policy monitoring | | | | | OPEN/CLOSED |
| | | | | | | | | |

---

## 3. Forbidden exceptions (never approve)

- Cross-patient PHI isolation failures  
- Non-owner PDF/export returning PHI  
- Security advisor **ERROR** left unaddressed without fix/rollback  
- Missing backup/PITR verification when DB write occurred  
- Disabling RLS or granting `anon` EXECUTE on admin RPCs  

---

## Approval

| Role | Name | Decision | Date (UTC) | Signature |
|---|---|---|---|---|
| Security Lead | | | | |
| Release Manager | | | | |
| Clinical / Compliance | | | | |
