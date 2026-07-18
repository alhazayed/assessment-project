# V Welfare — Security Hardening v1.1 — Implementation Plan (NO CODE)

**Date:** 2026-07-18
**Status:** Planning only — no code changes. Awaiting approval before any implementation.
**Approved for merge:** PR #76 (Phase 3 anon-oracle revoke) — item 1 below folds in its deploy prerequisite.
**Live DB re-verification:** Supabase MCP requires re-authorization in this session; drift facts below are from the repo tree plus the last certified live verification (prod migration tail `20260718124550`). Re-confirm with `supabase migration list` once MCP is re-authed before executing item 1.

---

## Scope

| # | Item | Type |
|---|---|---|
| 1 | Migration drift reconciliation | Plan (unblocks PR #76 deploy) |
| 2 | Supabase MFA | **Plan only** (no implementation) |
| 3 | Leaked-password protection | Config change plan |
| 4 | Email confirmation readiness | Readiness review |
| 5 | Session management policy | Proposal |

Each item is specified with: **architecture impact · security impact · files affected · migration requirements · rollback strategy**.

---

## 1. Migration Drift Reconciliation Plan

### Problem
The repo migration history and the production migration history have diverged. Repo `supabase/migrations/` ends at `20260716140000_schema_hygiene_reconcile_and_dedupe_triggers.sql` and then jumps straight to the new `20260719120000_revoke_anon_check_relationship_permission.sql`. Production has applied migrations **through `20260718124550`** — at least three prod-only migrations (`20260716205251`, `20260717224016`, `20260718124550`) exist in the remote `supabase_migrations.schema_migrations` table but are **not** in the repo. Consequences:
- `supabase db push` fails the remote-vs-local reconciliation check (local history is not a prefix of remote).
- PR #76's `20260719120000` migration cannot be deployed through the normal pipeline until the gap is filled — this is its documented deploy prerequisite.
- The repo is not a faithful source of truth for the deployed schema (audit/DR risk).

### Recommended approach — **Option A: pull-down reconciliation (preferred)**
Bring the prod-only migrations into the repo so local history becomes a true prefix of remote, then deploy `20260719120000` normally.

1. Re-auth Supabase MCP (or use `supabase` CLI with the project ref) and run `supabase migration list` to enumerate **every** remote version between `20260716140000` and `20260718124550` (the three named above may not be exhaustive).
2. For each prod-only version, capture the exact deployed DDL. Two sources: (a) `supabase db pull` to auto-generate the migration files, or (b) reconstruct each from the change that produced it and verify the resulting schema hash matches prod.
3. Commit the recovered migration files with their **original timestamps** so ordering is preserved and `20260719120000` remains the newest.
4. Verify: `supabase db push --dry-run` reports only `20260719120000` pending.
5. Merge PR #76; deploy applies exactly one migration.

### Fallback — **Option B: controlled SQL hotfix + backfill**
If the prod-only DDL cannot be faithfully recovered in the near term, apply the idempotent `REVOKE`/`GRANT` from `20260719120000` directly as a Supabase SQL hotfix, then insert its version row into `supabase_migrations.schema_migrations` so the pipeline treats it as applied. Still complete Option A afterward to remove the drift permanently. (Option B ships the security fix without waiting on full reconciliation but leaves the repo-truth gap open — track as a follow-up.)

### Architecture impact
None to runtime. This is history/source-of-truth reconciliation. No schema, RLS, function, or grant is *changed* by reconciliation itself — the recovered files must exactly reproduce already-deployed state (net-zero diff when replayed on prod).

### Security impact
Positive/enabling: unblocks the Phase 3 anon-oracle revoke (`20260719120000`). Restores repo-as-source-of-truth, which is a SOC2/audit control (change traceability) and a disaster-recovery precondition (rebuild-from-migrations must match prod).

### Files affected
- **New (recovered):** `supabase/migrations/20260716205251_*.sql`, `supabase/migrations/20260717224016_*.sql`, `supabase/migrations/20260718124550_security_phase1_hardening.sql`, plus any others `migration list` reveals in the gap.
- **Existing:** `supabase/config.toml` — correct `major_version = 15` → `17` (prod is Postgres 17); a mismatch here misleads local dev and any `db diff`.
- **No change** to `20260719120000_revoke_anon_check_relationship_permission.sql` (already correct).

### Migration requirements
Each recovered file must, when replayed on a fresh DB, produce a schema **identical** to prod (verify via `supabase db diff` returning empty, or object-hash comparison of `has_clinician_access`, policy set, and grants against the certified baseline). Timestamps must preserve real apply order.

### Rollback strategy
- Reconciliation commits are metadata/history only — reverting the commit restores the prior repo state with **zero** production impact (nothing was deployed by the recovery itself).
- Option B's hotfix rollback = re-`GRANT EXECUTE ... TO anon` on `check_relationship_permission` (reverts to prior behavior) and delete the backfilled `schema_migrations` row.

---

## 2. Supabase MFA — Implementation Plan (PLAN ONLY, NO CODE)

Policy: **mandatory for `admin`/`superadmin` and `clinician`; optional (opt-in) for patients.** Supabase supports TOTP (authenticator app) and, on paid plans, phone factors. Recommend **TOTP** (no SMS cost, no telco dependency, works with the existing bilingual UI).

### Enrollment & step-up model
- Enrollment: `supabase.auth.mfa.enroll({ factorType: 'totp' })` → show QR → `challenge()` + `verify()`. Adds a verified factor.
- Assurance levels: a session is **AAL1** (password only) or **AAL2** (password + verified factor this session). `getAuthenticatorAssuranceLevel()` returns `currentLevel` and `nextLevel`.
- **Enforcement point (middleware):** for privileged areas, if the user's role requires MFA and `nextLevel === 'aal2' && currentLevel !== 'aal2'`, redirect to a step-up challenge page before granting access. This layers on top of the existing `getUser()` gate in `middleware.ts` — no change to the authorization model, only an added assurance gate.
- **RLS (optional, defense-in-depth):** privileged RLS policies can additionally require `(auth.jwt()->>'aal') = 'aal2'`. Defer to a later phase — start with app-layer enforcement to avoid touching the certified policy set.

### Rollout sequencing (avoid lockout)
1. Ship enrollment UI + optional MFA for all roles (no enforcement).
2. Notify admins/clinicians; grace window to enroll.
3. Flip enforcement for `admin`/`superadmin` first (smallest, highest-value group), then `clinician`.
4. Patients remain opt-in indefinitely.

### Architecture impact
- New enrollment/challenge UI routes and a step-up flow. New assurance check in `middleware.ts` (additive branch). Admin HMAC cookie is **independent** of Supabase AAL — decide whether admin panel entry also requires AAL2 (recommended: yes, gate `/x/control/*` on AAL2 in addition to the PIN/HMAC).
- Mobile (`@supabase/supabase-js` in Expo) supports the same MFA APIs; enrollment/challenge screens needed there too (later sub-phase).

### Security impact
Large positive: closes the "password-only admin/clinician" gap — the single biggest residual auth risk for a PHI platform (OWASP A07, HIPAA access-control best practice). Mitigates credential-stuffing/phishing for privileged accounts.

### Files affected (when implemented — not now)
- `supabase/config.toml` — add `[auth.mfa]` (enable TOTP; set `[auth.mfa.totp] enroll_enabled = true, verify_enabled = true`).
- `middleware.ts` — additive AAL2 step-up gate for privileged roles/paths.
- New: enrollment page/route, challenge page/route, MFA settings section in profile (web); mirror screens in `mobile/`.
- `lib/admin-auth.ts` — optionally require AAL2 in `requireAdmin()`/`verifyAdminSession()`.
- Tests: enrollment/challenge happy-path + enforcement (privileged role without AAL2 blocked).

### Migration requirements
None at the schema level for the standard flow (Supabase manages `auth.mfa_factors`). If RLS AAL2 checks are later added, that is a separate, additive policy migration.

### Rollback strategy
- Enforcement is config/middleware-flag driven — disable the enforcement branch to revert to AAL1 access without data impact.
- Enrolled factors persist harmlessly if enforcement is turned off. A per-user factor can be unenrolled via `mfa.unenroll()` or admin API to recover a locked-out privileged user (document a break-glass admin recovery procedure as part of rollout).

---

## 3. Leaked-Password Protection — Configuration Plan

Supabase Auth can check new/changed passwords against HaveIBeenPwned (k-anonymity range query — the password never leaves in cleartext). Currently **disabled** (flagged by advisors across every prior audit).

### Architecture impact
None. Server-side Auth setting; no app code required. Rejection surfaces as an Auth error at signup/reset that the existing error handling already renders.

### Security impact
Blocks registration/reset with known-breached passwords → directly mitigates credential stuffing (OWASP A07). Cheap, high-value.

### Files affected
- **Dashboard toggle** (Authentication → Policies → "Leaked password protection") — the authoritative production switch; **or**
- `supabase/config.toml` → `[auth]` add `password_hibp_enabled = true` (if managing Auth via config; must be applied to the remote project, not just local).
- Recommended companion: set `minimum_password_length` (e.g. 10) and `password_requirements` in the same block — currently unset.
- UX copy: confirm the register/reset forms show a clear "this password appeared in a data breach, choose another" message (bilingual AR/EN). Review only; likely no code if the generic Auth-error path already displays the message.

### Migration requirements
None (Auth config, not schema).

### Rollback strategy
Toggle off (dashboard) or set `password_hibp_enabled = false`. Instant, no data impact. Existing users unaffected (only enforced on set/change).

---

## 4. Email Confirmation — Readiness Review

Current: `config.toml [auth.email] enable_confirmations = false` — users can sign in without verifying email ownership. For a PHI platform this is a meaningful gap (account belongs to an unverified address; password-reset and notifications target an unproven inbox).

### Readiness findings (what must be true before enabling)
1. **SMTP sender configured.** Enabling confirmations makes email delivery load-bearing for onboarding. Confirm a production SMTP provider (custom SMTP, not the Supabase built-in low-rate sender) is set, with SPF/DKIM/DMARC on the sending domain — otherwise confirmations land in spam and block signups.
2. **Bilingual templates.** Confirmation + reset email templates must exist in AR and EN and render RTL correctly. Review current templates.
3. **Redirect allow-list.** Confirmation links use the same redirect machinery as reset. The `site_url`/`additional_redirect_urls` in prod must include the real web origin and `vwelfare://` deep link (note: `config.toml` still shows localhost — verify prod dashboard values, which are authoritative).
4. **Flow UX.** Add a "check your inbox / resend confirmation" state to registration. This *is* app work — scope it before flipping the flag.
5. **Existing-user migration.** Decide handling for already-registered unverified users: grandfather them or force a one-time verification. Grandfathering avoids locking out live users; document the choice.

### Architecture impact
Registration becomes a two-step flow (register → confirm → sign in). Requires a pending/resend UI state. Deep-link handling on mobile for the confirmation URL.

### Security impact
Positive: proves email ownership → strengthens account-recovery integrity and reduces spam/abuse signups. GDPR-adjacent (accurate contact data).

### Files affected (when implemented)
- `supabase/config.toml` → `enable_confirmations = true` (apply to remote).
- Supabase Auth email templates (dashboard) — AR/EN.
- Registration UI: pending-confirmation + resend screen (web + mobile).
- SMTP provider configuration (infra, not repo).

### Migration requirements
None (Auth config + templates).

### Rollback strategy
Set `enable_confirmations = false` → immediate revert to current behavior. Users confirmed in the interim stay confirmed (no harm). No data impact.

**Recommendation:** treat as **conditional** — do not enable until items 1–4 above are satisfied; otherwise it will block real signups. Not a v1.1 quick-flip.

---

## 5. Session Management Policy — Proposal

Two independent session mechanisms exist today:

| Session | Mechanism | Lifetime | Storage |
|---|---|---|---|
| **Supabase user** | JWT access token + refresh token, rotation on, `refresh_token_reuse_interval = 10` | `jwt_expiry = 3600` (1h access); refresh long-lived | Web: httpOnly cookies via `@supabase/ssr`. Mobile: **AsyncStorage (plaintext)** — hardening still pending on `main`. |
| **Admin panel** | HMAC-of-`userId:role` cookie (`admin_session`) | `maxAge` 8h | httpOnly, secure, sameSite=lax |

### Proposed policy
1. **Keep** access-token TTL at 1h with refresh rotation + reuse-interval detection (already strong; rotation makes stolen refresh tokens detectable). No change recommended.
2. **Admin session hardening.** 8h admin cookie is long for a PHI admin surface. Propose reducing to **1–2h idle / 8h absolute**, and (per item 2) gating admin entry on AAL2. `sameSite=lax` is acceptable for the top-level admin nav; consider `strict` if no cross-site entry points rely on it (verify the login POST flow first).
3. **Explicit logout everywhere.** Confirm logout calls `supabase.auth.signOut()` **and** clears `admin_session` (DELETE route already does both for admin). Audit patient/clinician logout for `signOut({ scope: 'global' })` to revoke all sessions/tabs on password change or explicit "sign out all devices."
4. **Password-change session revocation.** On password reset/change, revoke existing refresh tokens (global sign-out) so a compromised credential's live sessions die. Verify current behavior; add if missing.
5. **Mobile secure storage** (already planned separately): move Supabase session off AsyncStorage to Expo SecureStore/Keychain so tokens are OS-encrypted at rest. Session policy depends on this to be meaningful on mobile.
6. **Multi-tab / concurrent sessions.** Document expected behavior; `@supabase/ssr` shares the cookie across tabs (consistent). No change needed unless product wants a concurrent-session cap (not recommended for v1.1 — added complexity).

### Architecture impact
Mostly config/flag tuning + a global-sign-out call on password change. No new subsystem. The admin cookie TTL change is a one-line `maxAge` edit plus (optional) an idle-timeout check.

### Security impact
Reduces stolen-session and shared-device exposure windows; ensures credential rotation actually terminates active sessions (HIPAA/SOC2 session-management controls). Aligns admin session strength with the sensitivity of the admin surface.

### Files affected (when implemented)
- `app/api/admin/login/route.ts` — `admin_session` `maxAge` (and optional idle-timeout metadata).
- Password-reset/change handlers — add global `signOut` / refresh-token revocation.
- Logout handlers (patient/clinician) — confirm/extend scope.
- `supabase/config.toml` — no change recommended to JWT/refresh values (already sound); document the rationale.
- Mobile session storage — tracked in the mobile hardening plan.

### Migration requirements
None (no schema/RLS). All app-config + Auth-API behavior.

### Rollback strategy
Every element is independently revertible: restore `maxAge`, remove the global-sign-out call, revert cookie `sameSite`. No data impact; no migration to unwind.

---

## Consolidated impact summary

| Item | Schema/migration? | App code? | Config only? | Ships in v1.1? |
|---|---|---|---|---|
| 1 · Drift reconciliation | Recovered files (net-zero) | No | `config.toml` version fix | **Yes — prerequisite for PR #76** |
| 2 · MFA | None (unless RLS AAL2 later) | Yes (UI + middleware) | `config.toml` `[auth.mfa]` | Plan only → phased |
| 3 · Leaked-password | No | No | Dashboard / `config.toml` | **Yes — quick win** |
| 4 · Email confirmation | No | Yes (pending-state UI) | `config.toml` + templates + SMTP | Conditional — not a quick flip |
| 5 · Session policy | No | Small (logout/revoke, admin TTL) | Mostly config | Partial (admin TTL + revoke) |

## Recommended execution order (post-approval)
1. **Item 1** (unblocks PR #76) → **Item 3** (leaked-password, zero-code) → **Item 5** admin-TTL + password-change revocation (small, high value) → **Item 2** MFA phased rollout → **Item 4** email confirmation once SMTP/templates/UX are ready.

---

*No production database, RLS, authorization model, or application code was modified in producing this plan. Implementation of any item is gated on explicit approval.*
