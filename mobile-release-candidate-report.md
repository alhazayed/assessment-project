# Mobile Release-Candidate Report — V Welfare (Capacitor)

**App:** V Welfare · `com.vwelfare.app` · v1.0.0 · server-URL wrapper of `https://app.vwelfare.com`
**Campaign:** automated execution of `capacitor/MOBILE_QA_CHECKLIST.md` · **Date:** 2026-07-06
**Branch:** `claude/capacitor-mobile-setup-xflg5y` (PR #44)

## Recommendation

- **Automated validation gate: ✅ GO** — every automatable check passed (26/26), zero regressions, no app-code errors, DB security model verified live.
- **Store-submission RC: ⚠️ CONDITIONAL / NO-GO until** the device-only matrix is signed off **and** the three carry-over blockers are cleared (Android `targetSdk 35`, branded app icons, Apple 4.2 decision — see `mobile-production-readiness.md`).

Nothing automatable is failing. The remaining risk is entirely in **on-device behaviour and authenticated journeys that cannot be executed in this environment** (no macOS/iOS simulator, no Android SDK/emulator, no Supabase test credentials) — enumerated explicitly below.

---

## How this was tested (and its limits)

Executed against a local production build (`next start`) driven by **headless Chromium with the native User-Agent `…VWelfareApp`** at mobile (390×844) and tablet (820×1180) viewports, EN and AR. Captured: screenshots (14), console logs, network failures, navigation timing. Live **read-only** Supabase introspection for DB verification. No writes to any backend; no production side effects.

**Not executable here → routed to manual device QA:** iOS Simulator (needs macOS), Android emulator/local AAB (no SDK), and any **authenticated** patient/clinician flow (no test accounts — not created against the production DB by design).

Evidence grades: **[V]** verified by execution · **[C]** code/config reviewed · **[DB]** live DB · **[M]** manual device/creds required.

---

## Results by checklist section

### Native shell
| Item | Result | Evidence |
|---|---|---|
| Launches to splash → loads platform | ⏭ **[M]** | Config `server.url`, splash 1500 ms [C] |
| Offline shows local loading page (not system error) | ✅ **[V]** | `offline.png` renders "V Welfare" + spinner; airplane-mode behaviour on device [M] |
| Android hardware back navigates history / exits at root | ⏭ **[M]** | `NativeBootstrap` back handler [C] |
| Status bar styled (brand) | ⏭ **[M]** | `StatusBar` init [C] |
| External links open in system browser | ⏭ **[M]** | `allowNavigation` scoping [C] |
| UA carries `VWelfareApp` | ✅ **[V]** | Server-side gating fires only for this UA (below) |

### Authentication (Supabase cookie SSR)
| Item | Result | Evidence |
|---|---|---|
| Register + email verification | ⏭ **[M]** | `/register` renders 200 [V]; flow needs email/creds |
| Login; session persists across restart | ⏭ **[M]** | `/login` renders, inputs labelled [V]; cookie persistence is native |
| Logout → protected routes redirect to `/login` | ✅ **[V]** | 9/9 protected routes redirect unauth → `/login?next=…` |
| Forgot/reset password | ⏭ **[M]** | `/forgot-password` renders 200 [V] |
| Multi-launch stays signed in | ⏭ **[M]** | native WebView cookie store |

### Admin is NOT reachable in the app ✅ (core requirement)
| Item | Result | Evidence |
|---|---|---|
| `/x/control` (app UA) blocked | ✅ **[V]** | `307 → /mobile/web-only` |
| `/admin/settings` (app UA) blocked | ✅ **[V]** | `307 → /mobile/web-only` |
| `/dashboard/admin`, `/settings/admin` (app UA) blocked | ✅ **[V]** | `307 → /mobile/web-only` |
| Same URL from a normal browser reaches admin login | ✅ **[V]** | `/x/control → /x/control/login` (UA-specific — proves it's not blanket) |
| No admin nav for a signed-in normal user | 🟡 **[C]** | `sidebar.tsx` hides admin nav when `isMobileApp`; visual confirm needs auth [M] |
| Admin-role account cannot reach admin panel | 🟡 **[C]** | `(app)` layout redirects admin role → `/mobile/web-only` [M] |

> Note: `MOBILE_QA_CHECKLIST` text says admin "redirects to `/dashboard`"; the shipped behaviour redirects to a dedicated **`/mobile/web-only`** notice (clearer UX). Checklist wording is stale, not the code.

### Patient workflows — ⏭ all **[M]** (authenticated)
Dashboard, assessments (load→answer→save→result→PDF), resume-after-interrupt, results history/PDF, mood, journal, insights, messages, "My Clinicians", profile/export. **Protection verified** (each redirects to `/login` when unauth [V]); the flows themselves need test credentials on a device. Same underlying code already builds green on web.

### Clinician workflows — ⏭ all **[M]** (authenticated)
Patient list, patient view (consent-gated notes), messaging, connect, verification. Protection verified [V]; flows need creds/device.

### Push notifications
| Item | Result | Evidence |
|---|---|---|
| Permission prompt on first protected screen | ⏭ **[M]** | native prompt |
| Grant → row in `push_tokens` (correct platform) | 🟡 **[DB]** | Table **exists, RLS enabled**, schema `(user_id, token, platform, …)` verified live; row insert needs device [M] |
| Deny → no crash | ⏭ **[M]** | registration guarded [C] |
| Test push arrives + deep-links | ⏭ **[M]** | needs FCM/APNs creds |
| Sign out rotates local token | ⏭ **[M]** | `vw_push_token` handling [C] |

### RTL / bilingual ✅
| Item | Result | Evidence |
|---|---|---|
| Toggle to Arabic mirrors layout | ✅ **[V]** | `ar-login.png` — `dir=rtl`, labels right-aligned, controls mirrored, no h-scroll |
| Tajawal font renders | ✅ **[V]** | Arabic glyphs render in brand font (screenshot) |

### Responsiveness
| Item | Result | Evidence |
|---|---|---|
| Phone + tablet, no horizontal scroll | ✅ **[V]** | 390px & 820px: `hScroll=false` on landing/login |
| Notch / safe-area insets | ⏭ **[M]** | device-only |

---

## Evidence appendix

**Gating (14/14 PASS)** — all admin deep-links (app UA) → `/mobile/web-only`; web UA → real admin login; 9 protected routes (unauth) → `/login`.

**Public pages (8/8)** — `/`, `/login`, `/register`, `/forgot-password`, `/privacy`, `/terms`, `/clinicians`, `/mobile/web-only`: all `200`, correct `<h1>`, `lang`/`dir` set, **no horizontal scroll**, **no app-code console errors**.

**Console/network note:** the only console errors observed are **environment artifacts, not app defects** — Vercel `insights`/`speed-insights` scripts 404 under local `next start` (served by Vercel infra in prod), and Cloudflare Turnstile blocked by the sandbox egress proxy. Both resolve in the real deployment.

**Performance (local, indicative only):** `/login` TTFB 16 ms · DCL 99 ms · load 576 ms. *Not representative of production over cellular in a WebView* — measure Core Web Vitals against `https://app.vwelfare.com` on a mid-tier device [M].

**Database (live, read-only) [DB]:**
- `public.push_tokens` present, **RLS enabled**, 0 rows (no device registered yet — expected).
- **All 60 public tables have `rls_enabled=true`** — confirms the mobile security model (RLS is the backend boundary).
- Security advisors (WARN, **pre-existing platform-backend**, not mobile-wrapper issues): 3 `SECURITY DEFINER` RPCs callable by anon/authenticated (`get_my_role`, `check_relationship_permission`, `submit_assessment_atomic` — likely intentional; confirm `EXECUTE` grants), and **Auth "leaked password protection" disabled** (recommend enabling HaveIBeenPwned check). None block the mobile release.

**Screenshots:** `landing, login, register, forgot, privacy, terms, clinicians, web-only, ar-login, ar-register, ar-web-only, tablet-login, tablet-landing, offline` (mobile-UA WebView renders).

---

## Regression results
- Both defects fixed in the prior audit are **confirmed fixed**: web-only `<h1>` now renders white (visible), CTA contrast measured **4.83:1** (WCAG AA). [V]
- No new regressions introduced; all automatable checks green.

## Auto-remediation log
- **0 automatable failures** to remediate this run. The two earlier issues were already fixed and are now regression-verified. No code changes were required by this campaign (report-only).

---

## Unresolved / carry-over blockers (from `mobile-production-readiness.md`)
1. **Android `targetSdkVersion 34 → 35`** (Play requirement) — needs Capacitor 7 / AGP bump + rebuild. **[M build]**
2. **Branded app icons / splash** (default Capacitor icons) — `npx @capacitor/assets generate`. 
3. **Apple Guideline 4.2** thin-wrapper rejection risk — product decision; ship Android first.
4. Optional: enable Supabase leaked-password protection; branded offline screen; enlarge sub-40px login tap targets.

## Mandatory manual device matrix (cannot be done in this environment)
Run `capacitor/MOBILE_QA_CHECKLIST.md` on **physical Android 13+** and **iOS device/simulator**, signed in with a real test patient **and** clinician account:
- All patient + clinician workflows end-to-end (incl. PDF export, resume-after-background).
- Session persistence across cold restart; logout.
- Push: permission prompt, token row appears in `push_tokens`, delivery + deep-link, sign-out token rotation.
- Native shell: splash→load, airplane-mode fallback, Android back button, status bar, external links, safe-area insets, `FLAG_SECURE` (no screenshots / blank in app switcher).
- Core Web Vitals on a mid-tier device over cellular.
