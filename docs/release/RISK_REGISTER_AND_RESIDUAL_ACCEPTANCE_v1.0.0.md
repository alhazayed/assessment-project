# V Welfare — Risk Register & Residual Risk Acceptance v1.0.0

| Field | Value |
|---|---|
| **Document ID** | `REL-RSK-100` |
| **Document version** | `1.0.0` |
| **Document status** | `ACTIVE` |
| **Effective date (UTC)** | `2026-07-26` |
| **Owner** | Security Lead |
| **Approver** | Release Manager + Clinical / Compliance |
| **Release** | `v1.0.0` |
| **Source** | Verified findings in `REL-CHK-100` (closed investigations) |

---

## 1. Risk register (pre-accepted / deferred)

| Risk ID | Description | Severity | Probability | Impact | Disposition | Owner | Revisit |
|---|---|---|---|---|---|---|---|
| R-001 | Transitive `postcss` moderate via Next (build-time) | Medium | Low | Low | **Accepted** — not runtime-exploitable | SEC | Next patch |
| R-002 | MFA not implemented for admin/clinician | Medium | Medium | High | **Deferred post-GA** | SEC | v1.1 |
| R-003 | Email confirmation disabled | Low/Med | Medium | Medium | **Deferred** — SMTP/templates | OPS | v1.1 |
| R-004 | Mobile AsyncStorage + committed anon key | Low | Medium | Low | **Deferred** — mobile release; rotate after SecureStore | Mobile | Mobile GA |
| R-005 | No centralized immutable admin audit trail | Medium | Medium | Medium | **Deferred** — before enterprise/regulated onboarding | SEC | Pre-enterprise |
| R-006 | BAA/DPA finalization (Gemini/Supabase/Vercel) | Medium | Medium | High | **Tracked commercially** | CLIN/Legal | ASAP |
| R-007 | Leaked-password disabled at checklist time | Medium | Low | Medium | **Must enable in window (G3)** or exception | SEC | Window |
| R-008 | Live HTTP `test:security` not yet run at checklist time | High (until run) | — | High | **Must pass G8** before open to patients | SEC | Window |

---

## 2. Residual risk acceptance (sign only if GO WITH CONDITIONS)

List only risks still open **after** the window that are explicitly accepted for GA:

| Risk ID | Residual statement | Compensating control | Accepted by (SEC) | Accepted by (CLIN) | Accepted by (RM) | Date (UTC) |
|---|---|---|---|---|---|---|
| | | | | | | |

**Rule:** Patient-isolation or export-authorization failures (**R-008** style) are **not** acceptable residual risks. They require rollback.

---

## 3. Clinical / PHI statement

I understand V Welfare processes mental-health assessment data. Residual risks above do not knowingly permit cross-patient PHI disclosure, unauthorized export, or disabled backup/restore verification for this GA.

| Role | Name | Decision | Date (UTC) | Signature |
|---|---|---|---|---|
| Security Lead | | | | |
| Clinical / Compliance | | | | |
| Release Manager | | | | |
