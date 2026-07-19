# V Welfare — Release Checklist v1.0.0

**Target release:** v1.0.0 (first production GA) · **Platform:** V Welfare Mental Health Platform (web + mobile + Supabase `wyzezyctpvlohuuhzyof`)
**Prepared:** 2026-07-19 · **Status:** ⚠️ CONDITIONAL GO — tag `v1.0.0` is cut only after the release gate (§6) is fully green.

This checklist is the authoritative release record. Every ✅ was verified directly (live DB / code / deployment) this cycle; every ☐ is an open gate that must be closed before sign-off. "Signed" = the sign-off block in §8 completed by the named release owner.

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

## 2. Test evidence

- Offline security suites: **60/60** (`phi`, `permission-validation`, `redirect-allowlist`, `ai-phi-scrub`, `permission-key-db-contract`, `payments`).
- `tsc --noEmit`: clean. `eslint .`: 0 errors (35 pre-existing `no-console` warnings). `next build`: exit 0.
- Live DB isolation battery (read-only / rolled back): all pass (see §1).
- Migration reconciliation acceptance: resulting repo version set vs prod `schema_migrations` → **0 prod-only remaining**; only local-only is idempotent `ipip120`.
- ☐ **Live HTTP `test:security`** (PDF non-owner 403, AI runtime, cross-user IDOR) — *not yet run*; requires a network-permitted runner + seeded accounts. Command: `BASE_URL=https://app.vwelfare.com ATTACKER_COOKIE=<patient-B> npm run test:security`.

## 3. Remaining accepted operational risks

| Risk | Severity | Disposition |
|---|---|---|
| `npm audit`: 5 moderate (transitive `postcss` in Next, build-time CSS-stringify XSS) | Moderate | **Accepted** — not runtime-exploitable; only fix is a breaking `next@9` downgrade. Re-evaluate when Next ships a patched `postcss`. |
| Leaked-password protection disabled | Medium | ☐ **To enable** before GA (§6) — Supabase Auth dashboard toggle. |
| MFA for admin/clinician not implemented | Medium | Deferred post-GA (plan in `docs/SECURITY_HARDENING_V1.1_PLAN.md`). |
| Email confirmation disabled | Low/Med | Deferred — gated on SMTP + templates readiness. |
| Mobile: AsyncStorage token storage + committed anon key | Low (anon key is RLS-bounded, repo public) | Deferred to mobile release; rotate key after SecureStore port. |
| `get_my_role()` anon-revoke → `42501` on anon PHI-table access | Info | **Accepted** — fail-closed; PHI tables never anon-reachable. |
| No centralized immutable admin audit trail | Medium | Deferred — required before regulated/enterprise onboarding. |

## 4. Rollback procedure

**Application (Vercel):**
1. `Vercel → assessment-project → Deployments →` select the last-known-good production deployment → **Promote to Production** (instant rollback), or `vercel rollback`.
2. Confirm `app.vwelfare.com` serves the rolled-back build (check commit SHA in deployment meta).

**Database (migrations):**
- v1.0.0 ships **no** new production DDL beyond what is already live (the reconciliation PR is repo-side only). Therefore **no DB rollback is required** for a v1.0.0 app rollback.
- If a future migration must be reverted: apply the migration's inverse/`.down` as a new forward migration (never edit history); verify via `supabase migration list` + the §1 fingerprint checks.

**Config (Supabase Auth / leaked-password):** toggling leaked-password protection off in the dashboard reverts it instantly (no data impact).

## 5. Recovery procedure (disaster recovery)

1. **Source of truth:** production is reproducible from `main` migrations (guaranteed by the reconciliation PR + governance policy). Verify quarterly: provision a scratch DB from `main` migrations → `supabase db diff` against prod = empty.
2. **Restore:** restore the Supabase project from its most recent automated backup (`Supabase → Database → Backups`), or point-in-time recovery if enabled.
3. **Re-verify after restore:** run the §1 checks — admin RPC grants `service_role`-only, `has_clinician_access` md5 unchanged, RLS policy fingerprint (clinical_notes 4 / messages 5 / assessment_assignments 3 / patient_profiles 4 / clinician_patient_relationships 3), advisors 0 ERROR, and the live isolation battery.
4. **Redeploy app:** trigger a Vercel deploy of `main`; confirm the production alias serves it; run the offline + (network-permitted) live security suites.
5. **Incident record:** log the event, cause, actions, and verification results per the governance policy.

## 6. Release gate — all must be ✅ before cutting the `v1.0.0` tag

1. ☐ **Migration reconciliation merged** (PR #80) after an operator's `supabase db push --dry-run` shows only the idempotent `ipip120` pending — repo == prod.
2. ☐ **Web CI gate merged** (PR #83) and made a required status check on `main`.
3. ☐ **Governance policy merged** (PR #81).
4. ☐ **Live HTTP `test:security` green** (§2) — patient/clinician isolation + PDF non-owner 403 + AI checks.
5. ☐ **Leaked-password protection enabled** (Supabase Auth).
6. ☐ Production alias confirmed serving the intended `main` build.
7. ☐ Sign-off (§8) completed.

When 1–7 are ✅: tag the certified `main` commit `v1.0.0` (annotated) and publish the GitHub release referencing this checklist.

## 7. Deferred to post-GA (tracked, non-blocking)

MFA rollout · email confirmation · mobile SecureStore + anon-key rotation · centralized admin audit trail · BAAs/DPAs (Gemini, Supabase, Vercel) · data-retention automation · incident-response runbook. See `docs/SECURITY_HARDENING_V1.1_PLAN.md` and `docs/PRODUCTION_GOVERNANCE_POLICY.md`.

## 8. Sign-off

| Role | Name | Decision (GO / CONDITIONAL / NO GO) | Date | Signature |
|---|---|---|---|---|
| Release Manager | | | | |
| Security Lead | | | | |
| Clinical/Compliance | | | | |

*Cut `v1.0.0` only with all §6 gates ✅ and this block signed.*
