# Staging Runtime QA Checklist — PR #38 (Next 16 / React 19 + payments)
**Purpose:** the one validation class that cannot be performed in the build/CI environment — authenticated end-to-end flows against **real Supabase + Stripe** — enumerated so it can be executed on staging and signed off before production merge.

**Why this is the remaining gate:** everything else is already green — `npm audit` 0 HIGH, `tsc` 0 errors, `next build` 107/107 pages, 13/13 payment unit tests, ESLint 0 errors, Vercel real-environment build **Ready**, and local runtime smoke of the Next 16 server (public SSR pages 200, protected routes 307, async `createClient()`/`getLanguage()` exercised, no server errors). The items below require credentials and a real user session, which the CI environment does not have.

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
