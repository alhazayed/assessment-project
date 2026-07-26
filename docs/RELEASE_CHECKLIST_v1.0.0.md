# V Welfare — Release Checklist v1.0.0

| Field | Value |
|---|---|
| **Document ID** | `REL-CHK-100` |
| **Document version** | `1.0.0` |
| **Document status** | `ACTIVE` |
| **Effective date (UTC)** | `2026-07-19` |
| **Last governance normalize (UTC)** | `2026-07-26` |
| **Owner** | Security Lead |
| **Approver** | Release Manager |
| **Release** | `v1.0.0` (first production GA) |
| **Platform** | V Welfare Mental Health Platform (web + mobile + Supabase `wyzezyctpvlohuuhzyof`) |
| **Hierarchy** | Rank 4 — pre-window certification evidence (`docs/release/00_DOCUMENT_CONTROL_INDEX.md`) |

**Authority clarification (normalized 2026-07-26):** This checklist is the **pre-window certification evidence record**. It is **not** the maintenance-window execution procedure. Execution, abort, rollback order, and tag authority are defined solely in `docs/release/PRODUCTION_RELEASE_PACKAGE_v1.0.0.md` (`REL-PKG-100`). Decision labels: `GO LIVE` · `GO LIVE WITH CONDITIONS` · `NO GO`.

**Prepared status:** CONDITIONAL — tag `v1.0.0` is cut only after Package gates **G0–G11** are green and Package §14 is signed.

Every ✅ below was verified directly (live DB / code / deployment) in closed investigations; every ☐ is an open gate that must be closed in the window. Do not re-investigate closed technical conclusions.

---

## 1. Verified security controls  [VERIFIED — direct observation]

| Control | Evidence |
|---|---|
| Cross-patient PHI isolation | Live RLS impersonation (read-only, rolled back): Patient A sees own=3/B=0; Patient B own=1/A=0 |
| Clinician-without-consent isolation | 0 access; `has_clinician_access → false` |
| Positive consent + granularity | Seeded in a rolled-back tx: `view_assessment_results` → sees consented patient's 3 subs; ungranted key → false; other patients still 0 |
| Anonymous lockout | PHI tables fail-closed (`42501`); admin RPCs / `check_relationship_permission` / `get_my_role` not executable by anon |
| Admin RPC lockdown | All 8 analytics RPCs `service_role`-only (anon/authenticated = false) |
| `has_clinician_access` integrity | Body md5 `06aedade9e809c61a3da2ee5a4764efc` unchanged from certified baseline |
| SECURITY DEFINER hardening | All 12 public SECURITY DEFINER functions have `search_path` pinned — no search-path injection |
| Anonymous authorization oracle | Closed — anon EXECUTE revoked on `check_relationship_permission` + `get_my_role` |
| Permission-key model | App `ALL_PERMISSION_KEYS` == DB CHECK constraint == grantable superset of RLS-required keys (locked by regression test) |
| AI PHI pipeline | Emergency detection on raw message before scrub; `scrubPHI` before Gemini (message + history); history `role` validated (anti prompt-injection); hardcoded Gemini endpoint (no SSRF); generic errors (no PHI in logs) |
| PDF export authorization | Owner / admin / `has_clinician_access('view_reports')` decided before any PHI read |
| Secrets | No server secret client-exposed; no `NEXT_PUBLIC_` secret |
| Security headers | HSTS+preload, X-Frame DENY, nosniff, Referrer-Policy, Permissions-Policy; per-request CSP nonce |
| Supabase advisors | 0 ERROR |
| Runtime health | 0 organic runtime errors (24h) |

---

## 2. Test evidence

- Offline security suites: **60/60** (`phi`, `permission-validation`, `redirect-allowlist`, `ai-phi-scrub`, `permission-key-db-contract`, `payments`).
- `tsc --noEmit`: clean. `eslint .`: 0 errors (35 pre-existing `no-console` warnings). `next build`: exit 0.
- Live DB isolation battery (read-only / rolled back): all pass (see §1).
- Migration reconciliation acceptance: resulting repo version set vs prod `schema_migrations` → **0 prod-only remaining**; only local-only is idempotent `ipip120`.
- ☐ **Live HTTP `test:security`** (PDF non-owner 403, AI runtime, cross-user IDOR) — *must pass Package G8 before open to patients*. Command: `BASE_URL=https://app.vwelfare.com ATTACKER_COOKIE=<patient-B> npm run test:security`.

---

## 3. Remaining operational risks

Tracked for acceptance / window action in `docs/release/RISK_REGISTER_AND_RESIDUAL_ACCEPTANCE_v1.0.0.md` (`REL-RSK-100`).

| Risk | Severity | Disposition |
|---|---|---|
| `npm audit`: 5 moderate (transitive `postcss` in Next, build-time CSS-stringify XSS) | Medium | **Accepted** — not runtime-exploitable; only fix is a breaking Next downgrade. Re-evaluate when Next ships a patched `postcss`. |
| Leaked-password protection disabled | Medium | ☐ **Enable in window (Package G3)** — Supabase Auth dashboard toggle. |
| MFA for admin/clinician not implemented | Medium | Deferred post-GA (`docs/SECURITY_HARDENING_V1.1_PLAN.md`). |
| Email confirmation disabled | Low/Med | Deferred — gated on SMTP + templates readiness. |
| Mobile: AsyncStorage token storage + committed anon key | Low (anon key is RLS-bounded, repo public) | Deferred to mobile release; rotate key after SecureStore port. |
| `get_my_role()` anon-revoke → `42501` on anon PHI-table access | Info | **Accepted** — fail-closed; PHI tables never anon-reachable. |
| No centralized immutable admin audit trail | Medium | Deferred — required before regulated/enterprise onboarding. |

---

## 4. Rollback procedure (pointer)

**Do not maintain a second rollback procedure here.** Authoritative rollback order is `REL-PKG-100` §9 and `REL-ABT-100` Abort Matrix.

Summary (non-normative):

- **Application:** Promote LKG / `vercel rollback` to recorded LKG deployment; confirm `app.vwelfare.com` SHA.
- **Database:** v1.0.0 expects no required destructive DDL; app rollback does not require DB restore. If optional accepted `ipip120` was applied and fails, use forward inverse migration or PITR per Package §9.3–§9.4 (never edit migration history).
- **Auth:** Leaked-password toggle off reverts instantly.

---

## 5. Recovery procedure (disaster recovery pointer)

**Authoritative DR:** `BACKUP_AND_DISASTER_RECOVERY.md` — **RTO 4 hours**, **RPO &lt; 1 hour**.

After restore: re-run Package §6 fingerprints + advisors 0 ERROR + isolation battery; redeploy certified `main`; record incident via `docs/release/INCIDENT_REPORT_TEMPLATE.md`.

---

## 6. Pre-window certification gates → Package mapping

Close these before or during the window as mapped. Tag only after Package **G11**.

| Checklist gate | Package gate | Status |
|---|---|---|
| Migration reconciliation / dry-run only accepted `ipip120` | G1 | ☐ |
| Web CI gate required on `main` | G4 | ☐ |
| Governance policy ACTIVE | Policy `POL-GOV-100` | ☐ |
| Live HTTP `test:security` green | G8 | ☐ |
| Leaked-password protection enabled | G3 | ☐ |
| Production alias serves intended `main` build | G5 | ☐ |
| Sign-off completed | G11 / Package §14 | ☐ |

When Package G0–G11 are ✅: tag certified `main` as `v1.0.0` (annotated) and publish GitHub Release per Package §5.7.

---

## 7. Deferred to post-GA (tracked, non-blocking)

MFA rollout · email confirmation · mobile SecureStore + anon-key rotation · centralized admin audit trail · BAAs/DPAs (Gemini, Supabase, Vercel) · data-retention automation.

**Note (inconsistency corrected):** An incident-response runbook **exists** (`INCIDENT_RESPONSE_RUNBOOK.md` + `FRM-INC-100`). It is **not** deferred; continue to exercise and improve it post-GA.

See `docs/SECURITY_HARDENING_V1.1_PLAN.md` and `docs/PRODUCTION_GOVERNANCE_POLICY.md`.

---

## 8. Sign-off

Use Package §14 as the binding sign-off for tag authority. This block may mirror it for checklist archival:

| Role | Name | Decision (`GO LIVE` / `GO LIVE WITH CONDITIONS` / `NO GO`) | Date (UTC) | Signature |
|---|---|---|---|---|
| Release Manager | | | | |
| Security Lead | | | | |
| Clinical / Compliance | | | | |

*Cut `v1.0.0` only with Package G0–G11 ✅ and Package §14 signed.*
