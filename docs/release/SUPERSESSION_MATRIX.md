# Supersession Matrix — V Welfare Platform v1.0.0

**Document status:** AUTHORITATIVE  
**Effective:** 2026-07-26  
**Rule:** Every release artifact is exactly one of: AUTHORITATIVE · ACTIVE · REFERENCE ONLY · SUPERSEDED · ARCHIVED

---

## AUTHORITATIVE / ACTIVE (in force)

| Document | Class | Notes |
|---|---|---|
| `docs/release/README.md` | AUTHORITATIVE | Index + hierarchy |
| `docs/release/CANONICAL_RELEASE_STATE.md` | AUTHORITATIVE | Current status |
| `docs/release/OPERATOR_RUNBOOK_v1.0.0.md` | AUTHORITATIVE | Only operator procedure |
| `docs/release/CANONICAL_RELEASE_TIMELINE.md` | AUTHORITATIVE | Only timeline |
| `docs/release/FREEZE_CERTIFICATE.md` | AUTHORITATIVE | Freeze record |
| `docs/release/SUPERSESSION_MATRIX.md` | AUTHORITATIVE | This matrix |
| `docs/release/CONTRADICTION_RESOLUTION_LOG.md` | AUTHORITATIVE | Resolutions |
| `docs/release/ISSUE_MATRIX.md` | AUTHORITATIVE | Issues |
| `docs/release/REMAINING_ADMINISTRATIVE_ACTIONS.md` | AUTHORITATIVE | Open admin work |
| `docs/release/RECONCILIATION_REPORT.md` | AUTHORITATIVE | Board report |
| `docs/RELEASE_CHECKLIST_v1.0.0.md` | ACTIVE | Gate board / sign-off |
| `docs/PRODUCTION_GOVERNANCE_POLICY.md` | ACTIVE | Adopted policy |
| `INCIDENT_RESPONSE_RUNBOOK.md` | ACTIVE | IR procedures (complete contacts) |
| `BACKUP_AND_DISASTER_RECOVERY.md` | ACTIVE | Binding DR (RTO 4h / RPO \<1h) |

---

## REFERENCE ONLY

| Document | Notes |
|---|---|
| `docs/SECURITY_HARDENING_V1.1_PLAN.md` | Post-GA plan |
| `docs/SUPERADMIN_OPERATIONS_MANUAL.md` | Ops reference |
| `docs/SUPERADMIN_DELETION_GUIDE.md` | Ops reference |
| `docs/PACKAGES_PAYMENT_SYSTEM.md` | Product reference |
| `docs/PLATFORM_TECHNICAL_DOSSIER.md` | Descriptive; not launch authority |
| `docs/security/PHASE_2_3_AUTHORIZATION_AUDIT.md` | Historical security deep-dive |
| `PHASE_1_DATABASE_SECURITY_MATRIX_2026_06_30.md` | Phase evidence (not GO authority) |
| `PHASE_2_STORAGE_SECURITY_2026_06_30.md` | Phase evidence |
| `PHASE_3_CLINICAL_VALIDATION_2026_06_30.md` | Phase evidence |
| `PHASE_4_PDF_VERIFICATION_2026_06_30.md` | Phase evidence |
| `PHASE_6_LOAD_TESTING_PROCEDURES.md` | Execute via schedule; not GA gate |
| `EMAIL_INFRASTRUCTURE_VERIFICATION.md` | Reference; email confirmation remains disabled per Canonical State |
| `NEXTJS_CVE_REMEDIATION.md` | Historical remediation notes |
| `CHANGELOG.md` | Must align with Canonical State (tag not cut) |
| `STAGING_QA_CHECKLIST.md` | QA reference |
| `capacitor/MOBILE_QA_CHECKLIST.md` | Mobile track |
| `capacitor/PRODUCTION_BUILD.md` | Mobile track |
| `PLAY_STORE_READINESS.md` | Mobile track |
| `mobile-production-readiness.md` | Mobile track |
| `mobile-release-candidate-report.md` | Mobile track |
| `android-release-report.md` | Mobile track |
| `repository-mobile-readiness-audit.md` | Mobile track |
| `RESPONSIVE_CERTIFICATION.md` | Responsive evidence |
| `RESPONSIVE_AUDIT.md` | Responsive evidence |

---

## SUPERSEDED (launch authority revoked)

Each file below must carry a supersession banner. Do **not** use for go-live decisions.

| Document | Superseded by | Reason |
|---|---|---|
| `RELEASE_NOTES.md` | Canonical Release State + Checklist | Claimed “Released” / Production Ready while tag not cut |
| `DEPLOYMENT_VERIFICATION.md` | Operator Runbook | Alternate SHA; claimed tag created; duplicate procedure |
| `DEPLOYMENT_ACTION_PLAN.md` | Operator Runbook + Governance | Auto-deploy narrative; obsolete Phase-1 blocker path |
| `ENVIRONMENT_VERIFICATION_AND_CHECKLIST.md` | Operator Runbook + Canonical State | “AUTHORIZED” with blank signatures |
| `PRODUCTION_RELEASE_REPORT.md` | Canonical State + Runbook | Fast-forward/auto-deploy; historical PR #75 integration |
| `RELEASE_CANDIDATE_SECURITY_CERTIFICATION.md` | Canonical State + Checklist | Historical RC gate 2026-07-18 |
| `PRODUCTION_SECURITY_PATCH_REPORT.md` | Canonical State | Historical patch report |
| `FINAL_CERTIFICATION.md` | Canonical State | Historical 🟡 certification |
| `FINAL_GO_LIVE_CERTIFICATION_REPORT_2026_06_30.md` | Canonical State | Unconditional CERTIFIED — revoked as authority |
| `FINAL_GO_LIVE_AUDIT_REPORT_2026_06_30.md` | Canonical State | Unconditional GO LIVE — revoked |
| `GO_LIVE_CERTIFICATION_2026_07_01.md` | Canonical State | Historical CONDITIONAL cert |
| `GO_LIVE_AUDIT_2026_07_01.md` | Canonical State | Historical audit |
| `OPERATIONAL_HARDENING_COMPLETION_SUMMARY.txt` | Canonical State | Unconditional CERTIFIED summary |
| `OPERATIONAL_HARDENING_SPRINT_STATUS_2026_06_30.md` | Canonical State | Historical sprint status |
| `PRODUCTION_AUDIT.md` | Canonical State | Historical audit |
| `SECURITY_AUDIT.md` | Canonical State | Historical |
| `SECURITY_AUDIT_REPORT.md` | Canonical State | Historical GO WITH CONDITIONS as authority |
| `AUDIT_REPORT.md` | Canonical State | Historical |
| `AUDIT_REPORT_2026_06_24.md` | Canonical State | Historical |
| `AUDIT_FINAL_SUMMARY.md` | Canonical State | Historical |
| `PHASE_7_FINAL_LIVE_VERIFICATION.md` | Operator Runbook §C | Duplicate E2E; unsafe prod password guidance |
| `docs/DISASTER_RECOVERY.md` | `BACKUP_AND_DISASTER_RECOVERY.md` | Conflicting RTO/RPO |
| `KNOWN_ISSUES.md` | Canonical State + Remaining Actions | Obsolete migration-sync narrative as current state |
| `PHASE_1_COMPLETION_REPORT.md` | REFERENCE phase folder / superseded for release | Not launch authority |
| `PHASE_2_SPECIFICATION.md` | REFERENCE / superseded for release | Not launch authority |
| `PAYMENTS_AUDIT_2026_07_02.md` | Canonical State (payments not a v1.0.0 GA gate) | Historical payments audit |
| `branding-report.md` | N/A (non-release) | Out of release package |
| `upgrade-report.md` | N/A | Out of release package |

---

## ARCHIVED

No separate archive directory move is required for this reconciliation. SUPERSEDED files remain in-place with banners for audit continuity. Physical relocation may occur in a later docs-hygiene window without changing authority.

---

*Matrix owned by Release Governance Board.*
