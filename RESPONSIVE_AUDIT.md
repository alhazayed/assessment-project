# RESPONSIVE_AUDIT.md — V Welfare

**Date:** 2026-07-10 · **Branch:** `claude/capacitor-mobile-setup-xflg5y`
**Scope:** Responsive / layout / mobile-UX audit and fixes across the platform, driven by automated evidence.
**Stack:** Next.js 16 · React 19 · TypeScript · TailwindCSS 3.4 · Capacitor 7 (Android) · Supabase

---

## Summary

The platform is fundamentally responsive (Tailwind, fluid containers, no fixed-width page bodies). The real defects were concentrated in **shared header/nav rows** and a couple of **flexbox / CSS-grid shrink bugs** that produced horizontal overflow at specific widths. All were fixed at the source (no `overflow:hidden` band-aids) and re-verified.

**Method (evidence-based).** A headless Chromium harness (Playwright, native `VWelfareApp` UA) loaded every reachable route and measured `document.documentElement.scrollWidth − innerWidth` at **18 breakpoints** (320→1920) plus a **landscape** pass and an **Arabic / RTL** pass. A route "passes" only at **0 px** horizontal overflow at every width.

**Result on the public/unauthenticated surface:**

| Metric | Before | After |
|---|---|---|
| Routes with horizontal overflow | 8 of 17 | **0 of 17** |
| Viewport checks failing | 20+ | **0 / 323** |
| RTL (Arabic) overflow | — | **0** |
| Worst single overflow | 145 px (`/` @768) | **0** |

> **Coverage boundary (honest):** the **17 public routes** were certified at runtime. The **~36 authenticated routes** (dashboard, assessments, messages, profile, clinician, patient, `/x/control` admin) require a live Supabase session and could not be rendered in this environment; they were audited at the **code level** via their shared shell (`app/(app)/layout.tsx` + `components/sidebar.tsx`), which was hardened. Runtime certification of those pages needs a seeded session or on-device QA (see Remaining Risks).

---

## Pages audited (runtime, 0 overflow after fixes)

`/` · `/login` · `/register` · `/forgot-password` · `/reset-password` · `/packages` · `/clinicians` · `/contact` · `/privacy` · `/terms` · `/onboarding` · `/sample-result` · `/mobile/web-only` · `/checkout` · `/checkout/success` · `/checkout/error` · `/adhd-check-in`

Breakpoints per route: 320, 360, 375, 390, 412, 414, 430, 480, 540, 600, 768, 820, 912, 1024, 1280, 1366, 1440, 1920 + landscape (844×390). RTL re-checked on 8 representative routes.

---

## Issues discovered, root cause, and fixes

| # | Severity | Where | Symptom | Root cause | Fix |
|---|---|---|---|---|---|
| 1 | **High** | `/clinicians`, `/sample-result` headers | Header action row overflowed **every phone** (up to **100 px @320**) | Brand wordmark + 2 toggles + "Sign in" + "Create account" in one non-wrapping `justify-between` row | `px-4 sm:px-6`; wordmark `hidden sm:inline` + `truncate`; "Sign in" `hidden sm:inline-flex`; `min-w-0` on brand, `flex-shrink-0` on actions |
| 2 | **High** | `app/(auth)/layout.tsx` (login, register, onboarding→login, packages→login) | 27 px overflow **@320** | `flex-1` form column had default `min-width:auto` → couldn't shrink below content; `px-8` topbar too wide at 320 | `min-w-0` on the form column + form card; `px-4 sm:px-8` topbar/footer; `px-4 sm:px-6` form content |
| 3 | **Medium** | `/` landing header | 145 px overflow **@768** (iPad mini portrait) | Desktop nav appeared at `md` (768) before there was room alongside the auth buttons | Nav `hidden md:flex` → `hidden lg:flex` (nav shows only ≥1024, where it fits) |
| 4 | **Medium** | `/checkout` | Up to 92 px overflow on phones | (a) `grid md:grid-cols-2` with **no base `grid-cols-1`** → implicit `auto` column sized to max-content; (b) promo `flex-1` input with `min-width:auto` wouldn't shrink | `grid grid-cols-1 md:grid-cols-2`; `min-w-0` on the promo input |
| 5 | **Low** | `/contact`, `/privacy`, `/terms` headers | 3 px overflow @320 | Same header pattern as #1 (fewer actions) | `px-4 sm:px-6`; wordmark `hidden sm:inline` |
| 6 | **Enhancement** | Global | No safe-area handling for notch / Dynamic Island / system bars | `viewport-fit` unset; no `env(safe-area-inset-*)` usage | Added `viewport: { viewportFit:'cover', … }` in `app/layout.tsx`; added `.safe-top/.safe-bottom/.safe-x/.min-h-dvh` utilities; applied to the app-shell mobile top bar and all public sticky headers |

### Files modified

- `app/layout.tsx` — explicit `viewport` export (`width=device-width, initial-scale=1, viewport-fit=cover`, themeColor).
- `app/globals.css` — safe-area (`env(safe-area-inset-*)`) + `min-h-dvh` utilities.
- `app/(auth)/layout.tsx` — `min-w-0` flex fix; responsive topbar/footer/content padding; safe-area on topbar.
- `app/page.tsx` — nav `md`→`lg`; safe-area on header.
- `app/clinicians/page.tsx`, `app/sample-result/page.tsx` — responsive header (wordmark/sign-in collapse, padding, `min-w-0`, safe-area).
- `app/contact/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx` — responsive header padding + wordmark + safe-area.
- `app/checkout/page.tsx` — `grid-cols-1` base + promo input `min-w-0`.
- `components/sidebar.tsx` — safe-area insets on the mobile app-shell top bar.

### Verification

- **323 viewport checks across 17 routes → 0 overflow failures** (portrait + landscape).
- **RTL/Arabic:** 8 representative routes, `dir="rtl"` confirmed, **0 overflow**.
- **Type-check:** `tsc --noEmit` → **0 errors**.

---

## Remaining risks

1. **Authenticated routes not runtime-certified** (dashboard, assessments/[id], messages, journal, mood, insights, profile, billing, patient/clinician, `/x/control/*`). They share the audited/hardened shell, but data-dense views (tables, charts, calendars) need a seeded session or on-device QA to certify. Tables already use the `overflow-x-auto` + `min-w` wrapper pattern (17 instances), which is the correct responsive-table approach.
2. **Latent grid pattern.** 7 other `grid <bp>:grid-cols-N` usages lack a base `grid-cols-1`. They passed the sweep (their content wraps), but are the same shrink-risk class as the checkout bug — normalizing them to `grid-cols-1 <bp>:grid-cols-N` is recommended (defensive; not an observed defect).
3. **Capacitor Keyboard plugin not installed.** Keyboard open/close viewport resize relies on WebView defaults. Recommend adding `@capacitor/keyboard` with `resize: 'native'` and testing focused-input scroll on device.
4. **Safe-area is wired but currently a no-op on Android** (the app opts out of Android 15 edge-to-edge, so insets are 0). It becomes active on iOS (notch/Dynamic Island) once the iOS target is built.

## Recommendations (next iterations)

- Extract a single `<PublicPageHeader>` component to replace the 5 duplicated public headers (spec's "no duplicate components"); the fixes here are consistent enough to lift verbatim.
- Seed a QA session (test patient + clinician + admin) so the authenticated surface can be run through the same 18-breakpoint harness.
- Add `@capacitor/keyboard`; normalize the 7 remaining grids; add `min-h-dvh` to full-screen auth/marketing shells for better mobile-toolbar behavior.
