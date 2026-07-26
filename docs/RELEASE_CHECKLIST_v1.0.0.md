# V Welfare — Release Checklist v1.0.0

**Document status:** ACTIVE (Rank 3) — subordinate to [`docs/release/CANONICAL_RELEASE_STATE.md`](./release/CANONICAL_RELEASE_STATE.md)  
**Release name:** V Welfare Platform v1.0.0  
**Target tag:** `v1.0.0` (**NOT CUT**)  
**Freeze SHA:** `6e219e62e9f74273595ef10e31220bb24d0945f7`  
**Production alias:** `https://app.vwelfare.com`  
**Prepared:** 2026-07-19 · **Reconciled:** 2026-07-26  
**Status:** ⚠️ **CONDITIONAL GO** — execute [`docs/release/OPERATOR_RUNBOOK_v1.0.0.md`](./release/OPERATOR_RUNBOOK_v1.0.0.md); cut tag only when §6 evidence is complete and §8 is signed.

Timeline: [`docs/release/CANONICAL_RELEASE_TIMELINE.md`](./release/CANONICAL_RELEASE_TIMELINE.md) (Freeze T6 = 2026-07-26; GA = T10 pending).

---

## 1. Verified security controls  [VERIFIED — historical observation retained]

| Control | Evidence |
|---|---|
| Cross-patient PHI isolation | Live RLS impersonation (read-only, rolled back): Patient A sees own=3/B=0; Patient B own=1/A=0 |
| Clinician-without-consent isolation | 0 access; `has_clinician_access → false` |
| Positive consent + granularity | Seeded in a rolled-back tx: `view_assessment_results` → sees consented patient's 3 subs; ungranted key → false; other patients still 0 |
| Anonymous lockout | PHI tables fail-closed (`42501`); admin RPCs / `check_relationship_permission` / `get_my_role` not executable by anon |
| Admin RPC lockdown | All 8 analytics RPCs `service_role`-only (anon/authenticated = false) |
| `has_clinician_access` integrity | Body md5 `06aedade9e809c61a3da2ee5a4764efc` unchanged from certified baseline |
| SECURITY DEFINER hardening | All 12 public SECURITY DEFINER functions have `search_path` pinned — no search-path injection |
| Anonymous authorization oracle | **Closed** — anon EXECUTE revoked on `check_relationship_permission` + `get_my_role` |
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
- ☐ **Live HTTP `test:security`** — open. Execute Operator Runbook §C. Command: `BASE_URL=https://app.vwelfare.com ATTACKER_COOKIE=<patient-B> npm run test:security`.

---

## 3. Remaining accepted operational risks

| Risk | Severity | Disposition |
|---|---|---|
| `npm audit`: 5 moderate (transitive `postcss` in Next, build-time CSS-stringify XSS) | Moderate | **Accepted** — not runtime-exploitable; re-evaluate when Next ships a patched `postcss`. |
| Leaked-password protection disabled | Medium | ☐ **Enable before GA** (Runbook §D / §6). |
| MFA for admin/clinician not implemented | Medium | **Deferred post-GA** (`docs/SECURITY_HARDENING_V1.1_PLAN.md`). |
| Email confirmation disabled | Low/Med | **Deferred post-GA** — gated on SMTP + templates readiness. |
| Mobile: AsyncStorage token storage + committed anon key | Low | **Deferred to mobile track**; rotate key after SecureStore port. |
| `get_my_role()` anon-revoke → `42501` on anon PHI-table access | Info | **Accepted** — fail-closed. |
| No centralized immutable admin audit trail | Medium | **Deferred post-GA** — required before regulated/enterprise onboarding. |

---

## 4. Rollback procedure

**Use the single procedure in** [`docs/release/OPERATOR_RUNBOOK_v1.0.0.md`](./release/OPERATOR_RUNBOOK_v1.0.0.md) **(Rollback section).**

Summary:

1. **Application:** Vercel → last-known-good production deployment → **Promote to Production** (human action). Confirm `app.vwelfare.com` SHA.  
2. **Database:** v1.0.0 app rollback requires **no** DB rollback.  
3. **Leaked-password:** toggle off reverts instantly.

---

## 5. Recovery procedure (disaster recovery)

Binding targets: **RTO 4 hours · RPO \< 1 hour** — see `BACKUP_AND_DISASTER_RECOVERY.md`.  
Quarterly rebuild-from-`main` validation per Adopted Governance Policy.  
Incident record per Governance Policy + `INCIDENT_RESPONSE_RUNBOOK.md`.

---

## 6. Release gate — all evidence ✅ before cutting `v1.0.0`

Execute via Operator Runbook. Do not invent parallel checklists.

| # | Gate | Merge / policy fact | Evidence still required |
|---|---|---|---|
| 1 | Migration reconciliation | ☑️ PR #80 on `main` (`514ec7b`) | ☐ Dry-run artifact (Runbook §A) |
| 2 | Web CI gate | ☑️ PR #83 on `main` (`935912d`) | ☐ Required status check on `main` (Runbook §B) |
| 3 | Governance policy | ☑️ PR #81 on `main` (`b0a4f85`) · ☑️ **Adopted 2026-07-26** | — |
| 4 | Live HTTP `test:security` green | — | ☐ Runbook §C |
| 5 | Leaked-password protection enabled | — | ☐ Runbook §D |
| 6 | Production alias serves intended `main` build | — | ☐ Runbook §E (human promote only) |
| 7 | Sign-off (§8) completed | — | ☐ Named humans below |

When 1–7 evidence is ✅: cut annotated tag `v1.0.0` on the certified commit and publish the GitHub Release (Runbook §F). Update Canonical Release State to **GO**.

---

## 7. Deferred to post-GA (tracked, non-blocking for tag once §6 complete)

MFA rollout · email confirmation · mobile SecureStore + anon-key rotation · centralized admin audit trail · BAAs/DPAs (Gemini, Supabase, Vercel) — **with risk acceptance before patient-open** · data-retention automation.

**Incident response runbook:** **ACTIVE** (`INCIDENT_RESPONSE_RUNBOOK.md`). Not deferred as a document. Open item is **staffing/contacts completion** (Remaining Administrative Actions A7–A8).

See `docs/SECURITY_HARDENING_V1.1_PLAN.md` and `docs/PRODUCTION_GOVERNANCE_POLICY.md`.

---

## 8. Sign-off

Blank signatures are **invalid**. All three roles required for GO.

| Role | Name | Decision (GO / CONDITIONAL / NO GO) | Date | Signature |
|---|---|---|---|---|
| Release Manager | | | | |
| Security Lead | | | | |
| Clinical/Compliance | | | | |

*Cut `v1.0.0` only with all §6 evidence ✅ and this block signed with real names.*
