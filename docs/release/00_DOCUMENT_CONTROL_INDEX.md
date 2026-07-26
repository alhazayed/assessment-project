# V Welfare — Release Documentation Control Index

| Field | Value |
|---|---|
| **Document ID** | `REL-DOC-INDEX` |
| **Document version** | `1.0.0` |
| **Document status** | `ACTIVE` |
| **Effective date (UTC)** | `2026-07-26` |
| **Owner** | Release Manager |
| **Custodian** | DevSecOps Lead |
| **Approver** | Release Manager + Security Lead |
| **Applies to release** | `v1.0.0` |
| **Classification** | Internal — Operational / Audit Evidence |
| **Review cycle** | Per release + annual |

---

## 1. Purpose

This index is the **master document control record** for the V Welfare v1.0.0 production release package. It defines document hierarchy, terminology, status labels, approval format, and the single authoritative procedure for each operational concern.

External auditors (ISO 27001, SOC 2, healthcare security review) should start here.

---

## 2. Document hierarchy (authority order)

When two documents disagree, the **higher** document wins for its scope. Technical conclusions in closed investigations are not reopened by this index.

| Rank | Document | Authority scope |
|---:|---|---|
| **1** | `docs/PRODUCTION_GOVERNANCE_POLICY.md` | Standing change-control / source-of-truth policy (all releases) |
| **2** | `docs/release/PRODUCTION_RELEASE_PACKAGE_v1.0.0.md` | **Authoritative execution procedure** for the v1.0.0 maintenance window |
| **3** | `docs/release/RELEASE_FREEZE_CERTIFICATE_v1.0.0.md` | Freeze attestations for the window |
| **4** | `docs/RELEASE_CHECKLIST_v1.0.0.md` | Pre-window certification evidence + residual risk register input |
| **5** | `BACKUP_AND_DISASTER_RECOVERY.md` | **Authoritative** backup / RTO / RPO / restore procedures |
| **6** | `INCIDENT_RESPONSE_RUNBOOK.md` | Incident severity, response, communications |
| **7** | `docs/release/*` forms & registers (this folder) | Evidence capture, abort, closure, monitoring |
| **8** | Historical / superseded docs | Reference only — not executable |

**Supersession (verified inconsistency resolved here):**

- `docs/DISASTER_RECOVERY.md` is **SUPERSEDED** for RTO/RPO and Postgres version. Authoritative objectives for v1.0.0 are those in `BACKUP_AND_DISASTER_RECOVERY.md` and the Production Release Package: **RTO = 4 hours**, **RPO &lt; 1 hour**, production Postgres per release package baseline.
- `DEPLOYMENT_VERIFICATION.md` / `DEPLOYMENT_ACTION_PLAN.md` are **historical**; they do not override the Production Release Package for v1.0.0.

---

## 3. Normalized terminology

| Term | Meaning (use only this) |
|---|---|
| **Release** | `v1.0.0` annotated git tag on certified `main` commit after sign-off |
| **RELEASE_COMMIT** | SHA of `main` tip certified for the window |
| **LKG** | Last-known-good Production deployment (recorded before promote) |
| **Production alias** | `https://app.vwelfare.com` |
| **Freeze** | Period from signed Freeze Certificate until Release Closure |
| **GO LIVE** | Unconditional production acceptance |
| **GO LIVE WITH CONDITIONS** | Acceptance with signed residual risks / exceptions |
| **NO GO** / **DO NOT GO LIVE** | Abort or rollback; no tag |
| **PHI** | Protected health / mental-health information in scope |
| **Gate Gn** | Decision gate in Production Release Package §8 |
| **Abort** | Stop window before/during execution per Abort Matrix |
| **Rollback** | Restore LKG app and/or Auth toggle / DB per Package §9 |

**Decision labels (only these three):** `GO LIVE` · `GO LIVE WITH CONDITIONS` · `NO GO`

---

## 4. Normalized status labels

| Status | Meaning |
|---|---|
| `DRAFT` | Work in progress; not for execution |
| `ACTIVE` | Approved for use |
| `AUTHORITATIVE` | Binding for its scope during the window |
| `SUPERSEDED` | Replaced; retain for audit history |
| `CLOSED` | Investigation or window completed; no further change without new version |

---

## 5. Normalized date / version / approval formats

- **Dates:** `YYYY-MM-DD` (UTC). Timestamps in logs: `YYYY-MM-DDTHH:MM:SSZ`.
- **Document version:** `MAJOR.MINOR.PATCH` aligned to release when release-specific (`1.0.0` for GA package).
- **Document ID:** `REL-…` for release pack; `POL-…` for standing policy; `FRM-…` for forms.
- **Approval block (required on all ACTIVE docs):**

| Role | Name | Decision | Date (UTC) | Signature |
|---|---|---|---|---|
| Owner | | APPROVED / REJECTED | | |
| Approver | | APPROVED / REJECTED | | |

- **Checklist style:** `- [ ]` open · `- [x]` done · tables use `☐` for window execution marks.
- **Tables:** Markdown pipe tables; first column = subject; severity uses `Critical` / `High` / `Medium` / `Low` / `Info`.

---

## 6. Artifact inventory (this package)

| Doc ID | Path | Status | Owner |
|---|---|---|---|
| `REL-DOC-INDEX` | `docs/release/00_DOCUMENT_CONTROL_INDEX.md` | ACTIVE | Release Manager |
| `REL-PKG-100` | `docs/release/PRODUCTION_RELEASE_PACKAGE_v1.0.0.md` | AUTHORITATIVE | Release Manager |
| `REL-FRZ-100` | `docs/release/RELEASE_FREEZE_CERTIFICATE_v1.0.0.md` | AUTHORITATIVE | Release Manager |
| `REL-CHK-100` | `docs/RELEASE_CHECKLIST_v1.0.0.md` | ACTIVE | Security Lead |
| `POL-GOV-100` | `docs/PRODUCTION_GOVERNANCE_POLICY.md` | ACTIVE | DevSecOps Lead |
| `REL-ART-100` | `docs/release/RELEASE_ARTIFACT_INVENTORY_v1.0.0.md` | ACTIVE | Release Manager |
| `REL-ABT-100` | `docs/release/ABORT_MATRIX_v1.0.0.md` | AUTHORITATIVE | Release Manager |
| `REL-EVD-100` | `docs/release/EVIDENCE_REGISTER_v1.0.0.md` | ACTIVE | Security Lead |
| `REL-MWL-100` | `docs/release/MAINTENANCE_WINDOW_LOG_v1.0.0.md` | ACTIVE | Operator |
| `REL-OPL-100` | `docs/release/OPERATOR_LOG_v1.0.0.md` | ACTIVE | Senior DBA |
| `REL-VAL-100` | `docs/release/PRODUCTION_VALIDATION_RECORD_v1.0.0.md` | ACTIVE | Security Lead |
| `REL-CLS-100` | `docs/release/RELEASE_CLOSURE_REPORT_v1.0.0.md` | ACTIVE | Release Manager |
| `REL-MON-100` | `docs/release/POST_RELEASE_MONITORING_v1.0.0.md` | ACTIVE | DevOps On-call |
| `REL-CAB-100` | `docs/release/CHANGE_ADVISORY_RECORD_v1.0.0.md` | ACTIVE | Release Manager |
| `REL-CFG-100` | `docs/release/CONFIGURATION_FREEZE_RECORD_v1.0.0.md` | ACTIVE | DevOps On-call |
| `REL-RSK-100` | `docs/release/RISK_REGISTER_AND_RESIDUAL_ACCEPTANCE_v1.0.0.md` | ACTIVE | Security Lead |
| `REL-EXC-100` | `docs/release/SECURITY_EXCEPTION_REGISTER_v1.0.0.md` | ACTIVE | Security Lead |
| `REL-RACI-100` | `docs/release/RACI_AND_APPROVAL_CHAIN_v1.0.0.md` | ACTIVE | Release Manager |
| `FRM-INC-100` | `docs/release/INCIDENT_REPORT_TEMPLATE.md` | ACTIVE | Security Lead |
| `FRM-LL-100` | `docs/release/LESSONS_LEARNED_TEMPLATE.md` | ACTIVE | Release Manager |
| `REL-REV-100` | `docs/release/DOCUMENTATION_REVIEW_REPORT_v1.0.0.md` | ACTIVE | Chief Release Architect |
| `DR-BAK-100` | `BACKUP_AND_DISASTER_RECOVERY.md` | AUTHORITATIVE (DR) | DevOps Lead |
| `INC-RB-100` | `INCIDENT_RESPONSE_RUNBOOK.md` | ACTIVE | Security Lead |

---

## 7. Approval chain (release package)

See `docs/release/RACI_AND_APPROVAL_CHAIN_v1.0.0.md`.

Minimum for GA tag:

1. Senior DBA — technical execution evidence complete  
2. Security Lead — security gates + advisors + live suite  
3. Clinical / Compliance — clinical safety / PHI residual acceptance  
4. Release Manager — final GO / GO WITH CONDITIONS / NO GO  

---

## 8. Audit trail & evidence retention

- Complete `EVIDENCE_REGISTER_v1.0.0.md` during the window.
- Retain release evidence **≥ 7 years** or per organizational legal hold for mental-health records adjacent audit artifacts (logs without unnecessary PHI).
- Do not store raw PHI in evidence packs; redact patient identifiers from screenshots/logs.

---

## 9. Document change control

- Edits to AUTHORITATIVE window docs during freeze require Release Manager approval and a new patch version note in this index.
- After release closure, bump document versions for the next release; do not rewrite closed v1.0.0 evidence in place — supersede with a new release folder if material changes are needed.

---

## Approval

| Role | Name | Decision | Date (UTC) | Signature |
|---|---|---|---|---|
| Owner — Release Manager | | | | |
| Approver — Security Lead | | | | |
| Approver — Clinical / Compliance | | | | |
