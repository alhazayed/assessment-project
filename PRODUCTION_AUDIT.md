# PRODUCTION_AUDIT.md — V Welfare

**Date:** 2026-07-10 · **Branch:** `claude/capacitor-mobile-setup-xflg5y`
**Auditor scope:** architecture, security, performance, privacy, accessibility, Google Play, Capacitor, Supabase.

## Executive summary

V Welfare is a mature, audit-hardened Next.js 16 / React 19 platform wrapped as a Capacitor 7 Android app (server-URL model). This pass **verified** the security-critical controls statically, certified the **public web surface responsive** (0 overflow / 323 checks — see `RESPONSIVE_CERTIFICATION.md`), and confirmed the **Android release configuration** is Play-ready at the code level. **No new Critical/High defects were found.** A *full* production certification is gated on runtime checks that **cannot run in this environment** (no network egress; Supabase MCP unauthenticated): live RLS/authz probing, DAST header inspection, authenticated E2E, load tests, on-device QA, Core Web Vitals. These are enumerated with exact commands so they can be closed on staging.

**Verdict:** 🟡 **Certified with minor conditions** (static). See `FINAL_CERTIFICATION.md`.

---

## Phase-by-phase

### 1 · Project structure — PASS (static)
Next App Router; clear `app/ · components/ · lib/ · supabase/migrations/ · capacitor/`. `capacitor/` and legacy `mobile/` (Expo) excluded from the web `tsconfig`. `tsc --noEmit` **clean**. Duplicated public page headers noted (5 near-identical) — fixed responsively; consolidation into a shared component recommended (`RESPONSIVE_AUDIT.md`). Doc sprawl: ~15 historical audit/cert markdowns (several stale — see `repository-mobile-readiness-audit.md`); recommend archiving.

### 2 · Functional validation — PARTIAL (runtime-blocked)
Public routes exercised at runtime (render + responsive). Authenticated flows (auth, registration, appointments, messaging, payments, clinician verification, admin approval, uploads, session/token refresh) **not runtime-testable here** (no session/egress). Code paths + shared shell audited. `scripts/responsive-audit.mjs` added to drive authed routes once a session is available.

### 3 · Error handling — PASS (static)
`app/not-found.tsx` present; `AlertCircle`/error and loading/empty states throughout (checkout, admin). Offline/slow-network + retry behaviour need on-device confirmation.

### 4 · Supabase — PASS (static) / runtime-blocked
20+ migrations with explicit RLS hardening; RLS isolation test suite (`__tests__/rls/*.test.sql`); RPCs pin `search_path` and scope `EXECUTE` to `service_role`/`authenticated`. Live advisors, index/query profiling, storage-policy checks require authenticated MCP / DB access.

### 5 · Security — PASS (static), 2 Low findings
See `SECURITY_AUDIT.md`. Headers (nonce-CSP/HSTS/X-Frame), server-only service role, `requireAdmin()`-gated admin APIs, safe XSS sinks, no committed secrets (except legacy anon/publishable key — Low). Runtime authz/RLS/DAST pending.

### 6 · Privacy — PASS (static) / runtime-blocked
`/privacy`, `/terms` present & responsive; data export + account deletion endpoints exist. Consent/disclaimer/emergency-info visibility to be confirmed on device; Data-Safety mapping in `PLAY_STORE_READINESS.md`.

### 7 · Google Play compliance — PASS (code) / Console pending
targetSdk 35, minSdk 23, minimal permissions (INTERNET + POST_NOTIFICATIONS), signed non-debug AAB, correct identifiers, deep links, admin surfaces gated web-only in-app. Console forms + on-device QA remain (`PLAY_STORE_READINESS.md`).

### 8 · Capacitor — PASS
Cap 7; AGP 8.7.2/Gradle 8.11.1/JDK 21; plugins app/app-launcher/device/push/splash/status-bar/secure-storage; FLAG_SECURE; `allowBackup=false`; **Android 15 edge-to-edge opt-out** (screen-fit fix, PR #48); **safe-area insets** wired (`viewport-fit=cover` + `.safe-*`). Keyboard plugin not yet added (recommended). `cap sync` green in CI.

### 9 · Performance — PARTIAL (static)
No fixed-width layout bodies; tables use `overflow-x-auto`; `next/image` used; SpeedInsights + Analytics wired. Bundle analysis / CWV / hydration / memory profiling require a running build + field data (Vercel Speed Insights already integrated).

### 10 · Accessibility — PARTIAL (static)
Skip-link, `focus-visible`, ARIA on toggles, semantic headings; browser zoom to 200% supported (no `user-scalable=no`); RTL clean. Full SR/keyboard traversal of authed flows pending (runtime).

### 11 · Logging — PASS (static)
Sentry (`@sentry/nextjs`) wired; health endpoint; no secret logging observed. Confirm no PHI in client `console` on device.

### 12 · Release pipeline — PASS
`mobile.yml`: `next build` → `cap sync` → signed AAB+APK → **signature + no-debug + identifier assertions** → artifact. Web deploys via Vercel (green on this branch).

---

## Known risks
1. Authenticated surface not runtime-certified (functional/a11y/RLS) — needs session + egress.
2. Play Console forms (Data Safety, Health, rating) — manual, pre-submission.
3. Keyboard plugin + shared-header refactor + doc archiving — non-blocking tech-debt.
4. Legacy `mobile/` Expo app carries a hardcoded anon (publishable) key — Low (`SECURITY_AUDIT.md` SEC-1).

## Files modified this pass
`.gitignore` (env breadth). New: `SECURITY_AUDIT.md`, `PLAY_STORE_READINESS.md`, `PRODUCTION_AUDIT.md`, `FINAL_CERTIFICATION.md`, `scripts/responsive-audit.mjs`. (Responsive source fixes: prior commits on this branch.)

## Recommendations
Run the runtime gate (staging deploy + authenticated harness + Supabase advisors + `curl -I` header check + on-device smoke) → then promote from 🟡 to 🟢.
