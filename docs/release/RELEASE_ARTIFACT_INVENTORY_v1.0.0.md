# V Welfare — Release Artifact Inventory v1.0.0

| Field | Value |
|---|---|
| **Document ID** | `REL-ART-100` |
| **Document version** | `1.0.0` |
| **Document status** | `ACTIVE` |
| **Effective date (UTC)** | `2026-07-26` |
| **Owner** | Release Manager |
| **Approver** | Release Manager |
| **Release** | `v1.0.0` |

---

## 1. Software artifacts

| Artifact | Identifier (fill at window) | Location | Verified ☐ |
|---|---|---|---|
| Git commit | `RELEASE_COMMIT=` | `origin/main` | ☐ |
| Annotated tag | `v1.0.0` | GitHub | ☐ (post sign-off) |
| GitHub Release | URL= | GitHub Releases | ☐ |
| Vercel Production deployment | ID= | Vercel | ☐ |
| LKG deployment | ID= | Vercel | ☐ |
| Production alias | `https://app.vwelfare.com` | DNS/Vercel | ☐ |

## 2. Database / Auth artifacts

| Artifact | Identifier | Location | Verified ☐ |
|---|---|---|---|
| Supabase project | `wyzezyctpvlohuuhzyof` | Supabase | ☐ |
| Pre-window backup timestamp | | Dashboard Backups | ☐ |
| PITR earliest/latest | | Dashboard Backups | ☐ |
| Optional `pg_dump` file (encrypted vault path) | | Secure vault | ☐ |
| Leaked-password setting | Enabled / Exception | Auth | ☐ |
| Migration tip versions (top 5) | | `schema_migrations` | ☐ |

## 3. Evidence artifacts

| Artifact | Path / store | Owner | Verified ☐ |
|---|---|---|---|
| Evidence Register | `docs/release/EVIDENCE_REGISTER_v1.0.0.md` | SEC | ☐ |
| Maintenance Window Log | `docs/release/MAINTENANCE_WINDOW_LOG_v1.0.0.md` | OPSR | ☐ |
| Operator Log | `docs/release/OPERATOR_LOG_v1.0.0.md` | DBA | ☐ |
| Production Validation Record | `docs/release/PRODUCTION_VALIDATION_RECORD_v1.0.0.md` | SEC | ☐ |
| Security suite console log | Evidence vault | SEC | ☐ |
| Advisor export | Evidence vault | SEC | ☐ |
| SQL fingerprint outputs | Evidence vault | DBA | ☐ |

## 4. Governance artifacts

| Artifact | Doc ID | Signed ☐ |
|---|---|---|
| Document Control Index | `REL-DOC-INDEX` | ☐ |
| Change Advisory Record | `REL-CAB-100` | ☐ |
| Configuration Freeze Record | `REL-CFG-100` | ☐ |
| Release Freeze Certificate | `REL-FRZ-100` | ☐ |
| Risk / Residual Acceptance | `REL-RSK-100` | ☐ |
| Security Exception Register | `REL-EXC-100` | ☐ |
| Release Closure Report | `REL-CLS-100` | ☐ |

## 5. Explicitly out of scope this release

| Item | Disposition |
|---|---|
| Mobile SecureStore + anon key rotation | Deferred — separate mobile release |
| MFA admin/clinician | Deferred — `docs/SECURITY_HARDENING_V1.1_PLAN.md` |
| Email confirmation enablement | Deferred — SMTP/templates |
| Centralized immutable admin audit trail | Deferred — pre-enterprise |
| BAA/DPA finalization | Tracked commercially |

---

## Approval

| Role | Name | Decision | Date (UTC) | Signature |
|---|---|---|---|---|
| Owner — Release Manager | | | | |
