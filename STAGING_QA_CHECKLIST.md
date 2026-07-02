# Staging Runtime QA Checklist — PR #38 (Next 16 / React 19 + payments)
**Purpose:** the one validation class that cannot be performed in the build/CI environment — authenticated end-to-end flows against **real Supabase + Stripe** — enumerated so it can be executed on staging and signed off before production merge.

**Why this is the remaining gate:** everything else is already green — `npm audit` 0 HIGH, `tsc` 0 errors, `next build` 107/107 pages, 13/13 payment unit tests, ESLint 0 errors, Vercel real-environment build **Ready**. The items in sections A–E below require credentials and a real user session, which the CI environment does not have.

## ✅ Runtime-validated locally on the Next 16 / React 19 stack (2026-07-02)
The upgraded production server was booted (`next start`, Next.js 16.2.10) and exercised over HTTP on localhost. This proves the server-side runtime of the upgrade — the riskiest part, the async `cookies()`/`headers()` refactor across ~58 call sites — actually works, independent of credentials:
- **Server boots** on the Next 16 / React 19 build (`✓ Ready`); homepage **200** with real SSR content (`<title>V Welfare…</title>`), not an error page.
- **async `cookies()` middleware works:** `/dashboard` → **307** `→ /login?next=%2Fdashboard`; `/x/control` → **307** `→ /x/control/login`. Auth gating intact at runtime (a broken async refactor would 500 or fail to redirect).
- **Security headers injected by middleware:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS `max-age=63072000; preload`, full CSP.
- **Per-request CSP nonce works** (distinct nonce each request) — the nonce mechanism relevant to GHSA-ffhc functions correctly under React 19.
- **Routing/SSR:** `/login` 200, public `/clinicians` 200 (redirect fix holds), unknown route **404**.
- **API routes run under Next 16:** `/api/health` returns clean JSON + `Cache-Control: no-store` (503 only because a placeholder service-role key was used locally — the route itself executes correctly).
- **Fixed `/auth/confirm` handler runs:** no params → **307** `→ /login`.

## ✅ Authenticated E2E validated against PRODUCTION with a real user — zero residue (2026-07-02)
With explicit approval, an ephemeral real user was created inside a self-rolling-back transaction against the production database (`RAISE`-aborted so nothing persists; verified afterward: 0 test users, 0 orphan profiles/patient_profiles/submissions). This validated the authenticated **data paths** end-to-end with a genuine `auth.users` row:
- **Registration automation:** inserting `auth.users` fired `handle_new_user()` → `profiles` + `patient_profiles` auto-provisioned (`profile_autocreated=t`, `patient_profile_autocreated=t`).
- **Assessment submission for a real user:** the fixed `submit_assessment_atomic` succeeded (`submission_created=t`).
- **RLS self-isolation as the authenticated role** carrying the real user's JWT: reads own submission (`rls_reads_own=t`) and **cannot** see other patients' submissions (`rls_hides_others=t`).

**What still requires staging + credentials (sections A–E):** the browser-**UI** journeys that need a running server with real secrets I don't have — in-browser login form, Stripe test-mode checkout, PDF download as a logged-in user, and admin/clinician UI. The underlying authenticated data paths are now validated above; these items confirm the UI wiring on top of them.

## Preconditions
- Staging deploy of branch `claude/new-session-2t01at` with real `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SESSION_SECRET`, `ADMIN_PIN`, `GEMINI_API_KEY`, `STRIPE_WEBHOOK_SECRET`, Turnstile keys.
- All migrations applied (incl. payment tables + RLS hardening).

## A. Authentication (validates the async cookies() refactor under real sessions)
- [ ] Register → receive verification email → click link → lands on `/onboarding` (not `/login?error=`).
- [ ] Email-scanner double-hit of the verify link still lands the user in-app (no false "verification failed").
- [ ] Login, logout, password reset round-trip.
- [ ] Session persists across refresh and multiple tabs; `/dashboard` reachable, `/login` redirects away when authed.
- [ ] Admin login at `/x/control/login` (email+password+PIN); 8-hour cookie expiry.

## B. Assessment + PDF (cannot be exercised without a real session)
- [ ] Complete an assessment end-to-end; score + interpretation render.
- [ ] **PDF export downloads and renders correctly** (@react-pdf under React 19 — verify no runtime regression).
- [ ] Resume an interrupted assessment; profile-completion gate behaves (no "complete your profile" loop).

## C. Payments (real Stripe test mode)
- [ ] Checkout each tier → amount charged equals the **server** price (attempt a tampered client `amount`; confirm it is ignored — PAY-1).
- [ ] Apply percentage / fixed / free promo → discount correct; expired/maxed promo rejected.
- [ ] Stripe test webhook `payment_intent.succeeded` → payment `succeeded`, `package_purchase` granted, promo usage incremented once.
- [ ] Re-deliver the same event (Stripe CLI `--resend`) → acknowledged as duplicate, **no** double purchase / double promo increment (PAY-3).
- [ ] `charge.refunded` → access revoked.

## D. Clinician + Admin
- [ ] Clinician submits verification → **all admins receive a notification**; appears in `/x/control/verifications` pending tab.
- [ ] Approve / reject / suspend → clinician receives the outcome notification; status updates.
- [ ] Admin dashboards + charts render (recharts under React 19); revenue/payment analytics load.
- [ ] Public `/clinicians` marketing page loads without redirect (fixed this PR); private `/clinician/*` still requires auth.

## E. Cross-cutting
- [ ] AR/RTL and EN/LTR render on key authed pages.
- [ ] CSP nonce, Turnstile, and Supabase realtime function on the deployed preview (no console CSP violations).
- [ ] `npm audit` on the deployed lockfile = 0 HIGH.

## Sign-off
- [ ] All above pass on staging → update `NEXTJS_CVE_REMEDIATION.md` (remove the staging gate), then merge PR #38 to production.
