# RESPONSIVE_CERTIFICATION.md — V Welfare

**Date:** 2026-07-10 · **Branch:** `claude/capacitor-mobile-setup-xflg5y`
**Basis:** 323 automated viewport checks (18 breakpoints 320→1920 + landscape) across 17 public routes, an Arabic/RTL pass, and a code-level audit of the shared authenticated shell. See `RESPONSIVE_AUDIT.md` for evidence and fixes.

---

## Scores

| Dimension | Score | Notes |
|---|---:|---|
| **Overall** | **88 / 100** | Public surface fully certified; authenticated surface hardened at the shell level but not yet runtime-certified. |
| **Mobile (phones 320–430)** | **95 / 100** | 0 horizontal overflow on every public route incl. 320 px; headers collapse gracefully; RTL clean. |
| **Tablet (600–1024)** | **93 / 100** | Landing tablet-header overflow fixed; grid/stack transitions correct. |
| **Desktop (1280–1920)** | **97 / 100** | Unaffected by mobile fixes; verified no regressions at 1280/1366/1440/1920. |
| **Accessibility (WCAG 2.2)** | **82 / 100** | Skip-link, focus-visible states, ARIA on toggles present; browser-zoom to 200% supported (no fixed viewport scaling; `user-scalable` NOT disabled). Full SR/keyboard pass on authed flows still pending. |
| **Performance / CLS** | **Good (observational)** | No layout-shift sources introduced; sticky headers use safe-area padding (no reflow); images via `next/image` where used. Formal Core-Web-Vitals run recommended in staging. |

---

## What was certified (runtime, 0 overflow)

17 public routes × 18 breakpoints + landscape + RTL:
`/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/packages`, `/clinicians`, `/contact`, `/privacy`, `/terms`, `/onboarding`, `/sample-result`, `/mobile/web-only`, `/checkout`, `/checkout/success`, `/checkout/error`, `/adhd-check-in`.

- **No horizontal scrolling** at any supported width. ✅
- **No off-screen buttons / clipped headers.** ✅ (headers collapse wordmark/secondary action on phones)
- **Navigation usable** across phone/tablet/desktop. ✅
- **Forms usable** at 320 px (auth split-layout shrink bug fixed). ✅
- **RTL/Arabic** mirrored with no overflow. ✅
- **Safe-area insets** wired (`viewport-fit=cover` + `.safe-*`), active on iOS notch; no-op on the current Android edge-to-edge opt-out. ✅
- **Desktop unaffected** — no regressions 1280–1920. ✅

## Not yet certified (requires session / device)

- **~36 authenticated routes** — need a seeded Supabase session (patient/clinician/admin) to run through the same harness. Shared shell is hardened; data-dense views (tables/charts/calendars) unverified at runtime.
- **On-device Capacitor behaviors** — mobile keyboard resize (plugin not yet added), physical notch/Dynamic Island rendering, real touch-target hit testing.

---

## Production readiness

- **Public / marketing / auth / checkout surface:** ✅ **Responsive-certified** for Google Play internal testing and web.
- **Authenticated app surface:** ⚠️ **Conditional** — shell hardened and expected-good (shares the fixed patterns), but not runtime-verified without a session.

## Final certification decision

### ⚠️ GO — WITH CONDITIONS

The **public, authentication, and checkout surfaces are certified responsive** (0 overflow across 323 checks, portrait + landscape + RTL) and safe to ship. Before certifying the **full** application, complete on a real device / seeded session:

1. Run the 18-breakpoint harness over the authenticated routes with a test session.
2. Add `@capacitor/keyboard` and verify focused-input scroll on device.
3. Normalize the 7 remaining base-less grids (defensive).

None of these block the current mobile release candidate; they gate a **full-platform** responsive certification. All fixes are on branch `claude/capacitor-mobile-setup-xflg5y`, `tsc` clean, and validated by the automated sweep in `RESPONSIVE_AUDIT.md`.
