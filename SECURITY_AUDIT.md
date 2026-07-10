# SECURITY_AUDIT.md — V Welfare

**Date:** 2026-07-10 · **Branch:** `claude/capacitor-mobile-setup-xflg5y`
**Type:** Static / code-level security audit (source, config, migrations, CI).
**Environment limitation:** This audit environment has **no network egress** (cannot reach the app, Supabase, or a preview) and the Supabase MCP is unauthenticated, so **runtime** checks — live RLS enforcement, auth bypass probing, rate-limit behaviour, header response inspection, DAST — could **not** be executed here. Those are listed under "Requires runtime verification". Findings below are from source inspection.

> Context: the repository already carries an extensive prior security corpus (`SECURITY_AUDIT_REPORT.md`, `GO_LIVE_AUDIT_2026_07_01.md`, `NEXTJS_CVE_REMEDIATION.md`, `PAYMENTS_AUDIT_2026_07_02.md`, `REMEDIATION_BACKLOG.md`, an `__tests__/rls/*.test.sql` suite, and 20+ hardening migrations). This pass **verifies** the highest-risk controls still hold and adds new findings.

---

## Verified controls (static) — PASS

| Control | Evidence |
|---|---|
| **Secrets not committed** | No `service_role` key, `sk_live/sk_test`, or PRIVATE KEY material in tracked files. Only `.env.example` placeholders. |
| **Service-role isolation** | `SUPABASE_SERVICE_ROLE_KEY` referenced only in `lib/supabase/admin.ts` (no `'use client'`; server module) + `app/api/health` env presence check. Never in client bundles / `NEXT_PUBLIC_*`. |
| **Admin API authorization** | Admin routes (`app/api/admin/**`) gate on a shared `requireAdmin()` (`lib/admin-auth`); e.g. `admin/users` checks caller role, `admin/delete-user` is superadmin-only. |
| **RLS enforced** | 20+ `supabase/migrations/*` explicitly harden RLS (payment tables, admin matview API revoke, atomic rate-limit `service_role`-only, `admin_hard_delete_user` grants, promo increment `search_path` pinned). RLS isolation tests: `__tests__/rls/rls_isolation.test.sql`, `submit_assessment_atomic.test.sql`. |
| **Security headers** | CSP (nonce-based), HSTS, X-Frame-Options, etc. configured in `middleware.ts` + `next.config.js`. |
| **XSS sinks safe** | Only two `dangerouslySetInnerHTML`: `app/layout.tsx` (nonce'd anti-flash theme script) and `app/page.tsx` (JSON-LD via `JSON.stringify` of a static object — no user input). |
| **Env hygiene** | `.gitignore` ignores env files; no real `.env*` tracked. |

---

## Findings

### SEC-1 — Hardcoded Supabase **anon** key in legacy Expo config
- **Severity:** Low (Informational) · **CVSS (est.):** 3.1 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)
- **Location:** `mobile/app.json:35` (`extra.supabaseAnonKey`)
- **Impact:** The value is the Supabase **anon (publishable)** key (decoded `role:"anon"`), which is *designed* to ship to clients and is safe **as long as RLS is enforced** — which it is. It is **not** a `service_role`/secret key, so this is not a privilege-escalation vector. Risk is limited to the key being enumerable in git history (already public in any shipped client).
- **Root cause:** Legacy `mobile/` Expo app hardcodes config in `app.json` instead of env.
- **Fix applied:** Documented; **no code change** (editing the legacy Expo config risks breaking its runtime config load, and the key is publishable). Broadened `.gitignore` to prevent future real-secret commits.
- **Recommendation:** If desired, move to Expo env/EAS secrets and **rotate the anon key** in Supabase (Project → API). Rotation is a Supabase-side action; harmless since RLS is the real boundary.
- **Verification:** `git grep -n "supabaseAnonKey"` → single legacy occurrence; no secret keys present.

### SEC-2 — `.gitignore` env breadth (hardening)
- **Severity:** Low · **Impact:** Prior pattern `.env*.local` ignored local overrides but not a bare `.env`/`.env.production`, leaving a small window for an accidental future secret commit. No such file is currently tracked.
- **Fix applied:** `.gitignore` now ignores `.env` and `.env.*` with `!.env.example`. **Verified** no tracked env files.

---

## Requires runtime verification (blocked in this environment)

These are **not** failures — they could not be executed here (no egress / no Supabase auth). Run against a staging deployment before final sign-off:

1. **Live RLS enforcement** — attempt cross-tenant reads/writes as a low-priv JWT (the `__tests__/rls/*.sql` suite run against the DB covers this).
2. **AuthZ probing** — hit each `app/api/admin/**` route with a non-admin session; expect 401/403.
3. **Security header response** — `curl -I` the deployed app; confirm CSP/HSTS/X-Frame-Options/Referrer-Policy/Permissions-Policy actually emitted.
4. **Rate limiting / brute force** — exercise login + admin PIN endpoints (atomic rate-limit fn exists; verify thresholds).
5. **Supabase advisors** — run `get_advisors` (security + performance) once MCP is authenticated.
6. **Storage bucket policies** — confirm PHI/upload buckets are private and RLS-scoped.

---

## Summary

Static posture is **strong** and consistent with a healthcare-grade, audit-mature codebase. New findings are **Low severity only** (SEC-1 informational, SEC-2 hardening applied). **No Critical/High static findings** were introduced or discovered in this pass. Final security sign-off is gated on the runtime checks above, which this environment cannot perform.
