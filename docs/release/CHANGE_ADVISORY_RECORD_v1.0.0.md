# V Welfare — Change Advisory Record (CAB) v1.0.0

| Field | Value |
|---|---|
| **Document ID** | `REL-CAB-100` |
| **Document version** | `1.0.0` |
| **Document status** | `ACTIVE` |
| **Effective date (UTC)** | `2026-07-26` |
| **Owner** | Release Manager |
| **Approver** | CAB (RM + SEC + DBA) |
| **Release** | `v1.0.0` |
| **Change type** | Standard / Normal production GA window |

---

## 1. Change summary

| Field | Value |
|---|---|
| Change title | V Welfare v1.0.0 Production GA |
| Business reason | First production GA of mental-health assessment platform |
| Authoritative procedure | `REL-PKG-100` Production Release Package |
| Risk level | Medium (PHI platform; low schema churn expected) |
| Planned window start (UTC) | |
| Planned window end (UTC) | |
| Downtime expected | None (blue/green); restore path 20–45m if DB last-resort |

---

## 2. Scope

**In scope**

- Confirm production alias on certified `main` (`RELEASE_COMMIT`)
- Optional accepted idempotent `ipip120` only if dry-run sole pending
- Enable leaked-password protection
- Live security suite + smoke + sign-off + tag `v1.0.0`

**Out of scope**

- MFA, email confirmation, mobile SecureStore, admin immutable audit trail, BAA negotiation (see residual risk register)

---

## 3. Impact assessment

| Area | Impact | Mitigation |
|---|---|---|
| PHI confidentiality | High if gates fail | G8 mandatory; abort matrix |
| Clinical availability | Low expected | Instant Vercel rollback |
| Data integrity | Low expected (no destructive DDL planned) | Fingerprints + backups |
| Compliance evidence | Positive if package completed | Evidence Register |

---

## 4. CAB decision

| Member | Role | Vote (`APPROVE` / `REJECT` / `ABSTAIN`) | Date (UTC) | Signature |
|---|---|---|---|---|
| | Release Manager | | | |
| | Security Lead | | | |
| | Senior DBA | | | |
| | Clinical / Compliance | | | |

**CAB outcome:** ☐ APPROVED · ☐ REJECTED · ☐ DEFER  

**Conditions of approval:**  

---

*CAB approval is required before Freeze Certificate signing.*
