# Archived — Cursor Security Audits (2026-07-13)

> **ARCHIVED / HISTORICAL RECORD.** These two point-in-time audits were produced by Cursor Cloud Agents on 2026-07-13 against the then-default branch `claude/project-functionality-UDm55` (Next.js 14 era, ~101 migrations). They are **superseded**: every code-level finding was independently remediated on `main` during later hardening work. This file is retained for provenance and audit-trail continuity only — it is **not** a current status document.
>
> Originating PRs (closed as superseded): **#54**, **#55**. Full original reports remain retrievable from git history on `cursor/platform-audit-fixes-11a0` and `cursor/security-audit-fixes-866e`.

---

## Where the findings live now (disposition)

| Finding area | 2026-07-13 audit status | Current state on `main` |
|---|---|---|
| Clinician cross-patient PHI isolation (RLS) | Fixed via cursor migration | ✅ Live — canonical `has_clinician_access(clinician,patient,permission_key)` model + relationship-scoped RLS (prod migrations `…consolidate_clinician_authorization`, `…scope_clinician_phi_rls_to_relationship`) |
| Admin API dual-factor (HMAC session) | Fixed in cursor branch | ✅ Live — `lib/admin-auth.ts` (`requireAdminApi` / role + HMAC) |
| Clinician access helper | New `lib/clinician-access.ts` | ✅ Live — `lib/authz/clinician-access.ts` |
| PHI scrubbing before Gemini | Fixed | ✅ Live — `lib/security/anonymizePHI.ts`, applied in `ai-chat` / `clinical-notes` |
| Password-reset redirect validation | New `lib/validate-redirect.ts` | ✅ Live — `lib/security/redirect.ts` (+ `redirect-allowlist` test) |
| Safe logging (no PHI in logs) | New `lib/safe-log.ts` | ✅ Live — `lib/logger.ts` |
| Secure mobile PDF export | New route | ✅ Live — `app/api/export/pdf/[submissionId]/route.tsx` |
| Signup role escalation | Fixed via migration | ✅ Live — `…harden_signup_role_assignment` |
| Admin RPC / matview lockdown | Fixed via migration | ✅ Live — admin RPCs `service_role`-only; matview API access revoked |
| `function_search_path` pinning | (see PR #43) | ✅ Live — `…repin_function_search_paths` |
| **Cursor migrations** `20260713100000` / `20260713120000` | proposed | ❌ **Not applied** — superseded by prod's consolidated hardening (`20260713152251_production_security_hardening` and later). Do **not** apply the cursor files. |

---

## Audit A — Platform Technical Audit (PR #54)

- **Branch:** `cursor/platform-audit-fixes-11a0` · **Verdict at the time:** ⚠️ GO LIVE WITH CONDITIONS · **Overall security (post-fix):** 82/100
- **Critical (all since remediated on `main`):** overlapping `clinical_notes`/`messages` RLS; clinician verification self-escalation; broad clinician SELECT IDOR on PHI tables; signup role escalation via `user_metadata`.
- **High:** admin route missing PIN/HMAC; KPI-alert inconsistent admin auth; admin RPCs callable by any authenticated user; admin matviews granted to `authenticated`; matview schema drift; package draft leakage.
- **Notable remaining (non-code) recommendations:** Upstash Redis for rate limiting at scale; live staging security tests; legal/privacy review; DR schema backfill.

## Audit B — Security Audit & Remediation (PR #55)

- **Branch:** `cursor/security-audit-fixes-866e` · **Verdict at the time:** ⚠️ GO LIVE WITH CONDITIONS · **Overall readiness:** 81/100 · **18 findings.**
- **Critical/High (all since remediated on `main`):** admin APIs skipped HMAC; RLS clinician cross-patient reads; assignments IDOR; unverified clinicians listing patients; patients reading private clinical notes; PHI to Gemini without scrubbing; missing secure mobile PDF endpoint; email in deletion audit log.
- **Explicitly not code-fixable (carried forward as debt):** BAA/DPA with Google Gemini; Next.js dependency CVEs (since resolved — `main` is on Next 16); `localStorage` assessment drafts; guest-data retention policy + auto-purge job.

---

*Archived by the release-engineering cleanup that closed PRs #54 and #55. No running system is affected by this document.*
