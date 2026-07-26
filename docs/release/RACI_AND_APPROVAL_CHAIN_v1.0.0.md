# V Welfare — RACI & Approval Chain v1.0.0

| Field | Value |
|---|---|
| **Document ID** | `REL-RACI-100` |
| **Document version** | `1.0.0` |
| **Document status** | `ACTIVE` |
| **Effective date (UTC)** | `2026-07-26` |
| **Owner** | Release Manager |
| **Approver** | Release Manager |
| **Release** | `v1.0.0` |
| **Parent** | `REL-DOC-INDEX` |

---

## 1. Roles

| Role | Abbreviation | Primary duty |
|---|---|---|
| Release Manager | RM | Go/no-go commander; freeze; closure |
| Senior DBA | DBA | Migrations dry-run; SQL verification; backup confirm |
| Security Lead | SEC | Advisors; live security suite; exceptions |
| DevOps / App On-call | OPS | Vercel promote/rollback; env freeze observe |
| Clinical / Compliance | CLIN | PHI/clinical residual acceptance |
| Operator (executing engineer) | OPSR | May be DBA or OPS; fills Operator Log |

R = Responsible · A = Accountable · C = Consulted · I = Informed

---

## 2. RACI — maintenance window

| Activity | RM | DBA | SEC | OPS | CLIN |
|---|---|---|---|---|---|
| Sign Release Freeze Certificate | A | R | C | I | I |
| Backup / LKG record (G0) | A | R | I | C | I |
| Migration dry-run (G1) | A | R | C | I | I |
| SQL fingerprint (G2/G6) | A | R | C | I | I |
| Leaked-password enable (G3) | A | C | R | I | I |
| Production promote (G5) | A | I | C | R | I |
| Security advisors (G7) | A | C | R | I | I |
| Live `test:security` (G8) | A | C | R | C | I |
| Smoke P0 (G9) | A | C | C | R | C |
| Application rollback | A | C | C | R | I |
| DB restore (last resort) | A | R | C | C | I |
| Residual risk acceptance | A | C | R | I | R |
| Cut tag `v1.0.0` | A/R | I | C | I | C |
| Release closure report | A/R | C | C | C | C |

---

## 3. Approval chain (sequence)

1. **Change Advisory Record** approved (CAB) — before freeze  
2. **Configuration Freeze Record** + **Release Freeze Certificate** signed — T−60m  
3. **Decision Gates G0–G10** evidence complete  
4. **Production Validation Record** signed by SEC (+ DBA for SQL)  
5. **Residual Risk / Security Exception** registers signed if CONDITIONAL  
6. **Release Package §14** signatures (RM, DBA, SEC, CLIN)  
7. **Tag + GitHub Release** by RM  
8. **Release Closure Report** within 48h  
9. **Lessons Learned** within 10 business days  

**Rollback authority:** Release Manager (Accountable). DevOps executes. DBA executes DB restore only on RM order.

---

## Approval

| Role | Name | Decision | Date (UTC) | Signature |
|---|---|---|---|---|
| Owner — Release Manager | | | | |
