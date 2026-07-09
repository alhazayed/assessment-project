# Mobile Production Readiness Audit — V Welfare (Capacitor)

**App:** V Welfare · **ID:** `com.vwelfare.app` · **Version:** 1.0.0
**Architecture:** Capacitor server-URL wrapper of the Next.js 16 / React 19 platform (`https://app.vwelfare.com`, `cleartext:false`)
**Date:** 2026-07-06 · **Scope:** `capacitor/` + mobile-specific web integration on branch `claude/capacitor-mobile-setup-xflg5y` (PR #44)

---

## Verdict: ⚠️ CONDITIONAL — NO-GO for public store submission today; GO for internal/closed testing after the two quick fixes below

The integration is architecturally sound and the security/role isolation works (verified at runtime). It is **not yet submittable to the public Google Play / App Store tracks** because of two hard store blockers (Android target API level, app icons) and one material policy risk (Apple thin-wrapper rejection). None of these are deep — Android can reach public-submittable in ~1–2 days of work; iOS needs a product decision on the wrapper-value story. Full patient/clinician journeys and on-device behaviour still require QA on real devices/simulators, which **could not be performed in this Linux CI environment** (see honesty note).

---

## Honesty note — what was and was not testable here

This audit ran in a **Linux container with no macOS, no Android SDK/emulator, and no Supabase test credentials**. Therefore:

| Requested | Status | Why |
|---|---|---|
| iOS simulator run | ❌ Not possible | iOS Simulator needs macOS + Xcode |
| Android emulator run | ❌ Not possible | No Android SDK/emulator/KVM in this image |
| Local signed AAB build | ❌ Not here | No Android SDK — **this is validated by CI** (`.github/workflows/mobile.yml` on GitHub runners) |
| Authenticated patient/clinician workflows | ⚠️ Partial | No test accounts; login-gated screens not exercised end-to-end |
| Admin isolation | ✅ Verified | Real HTTP + headless-Chromium evidence below |
| Mobile-context rendering / a11y of reachable pages | ✅ Verified | Headless Chromium with the app User-Agent |
| Web build (type-check/lint) | ✅ Verified | `next build` green on Next 16 / React 19 |

**No simulator screenshots or "all workflows pass" results were fabricated.** Evidence below is graded: **[V]** verified by execution here, **[C]** code/config-reviewed, **[D]** device/simulator QA still required.

---

## Evidence — admin role isolation (requirement: "no admin functionality in mobile") ✅ [V]

Runtime, against the built app served locally, using the native User-Agent tag `VWelfareApp`:

| Request | User-Agent | Result | Expected |
|---|---|---|---|
| `/x/control` | app | `307 → /mobile/web-only` | ✅ |
| `/x/control` | normal mobile browser | `307 → /x/control/login` | ✅ UA-specific |
| `/admin/settings` | app | `307 → /mobile/web-only` | ✅ |
| `/dashboard` (unauth) | app | `307 → /login?next=/dashboard` | ✅ |
| `/mobile/web-only` | app | `200` | ✅ |

Defense in depth confirmed: (1) middleware UA redirect, (2) `(app)` layout bounces admin-role accounts to the notice, (3) sidebar hides admin nav, (4) admin PIN still required, (5) **Supabase RLS remains the only backend security boundary**. The web-only notice renders correctly (screenshot verified) after fixing two bugs found during this audit (below).

---

## Fixes implemented in this audit

| # | Issue | Severity | Fix | Verified |
|---|---|---|---|---|
| 1 | Web-only `<h1>` invisible (global CSS dark heading colour on dark bg) | High (UX) | Explicit `color:#fff` on heading/body | [V] screenshot |
| 2 | Web-only CTA contrast white-on-orange ≈ 2.6:1 (WCAG AA fail) | Med (a11y) | Dark navy text on orange → **4.83:1** | [V] measured |
| 3 | `android:allowBackup="true"` on a PHI app | High (security) | `allowBackup="false"` + cloud/D2D extraction-exclusion rules | [C] |
| 4 | PHI screenshottable / shown in app switcher | Med (security) | `FLAG_SECURE` in `MainActivity` | [C] |
| 5 | iOS export-compliance prompt every upload | Low | `ITSAppUsesNonExemptEncryption=false` | [C] |
| 6 | Duplicate `color` decl in `www/index.html` | Trivial | Removed | [C] |

---

## Launch blockers (must fix before public submission)

### B1 — Android `targetSdkVersion = 34` < required API 35 · [C] · **Play blocker**
Google Play requires new/updated apps to target **API 35** (Android 15) since Aug 2025. Current `capacitor/android/variables.gradle` targets 34.
**Fix:** bump `compileSdkVersion`/`targetSdkVersion` to 35 — cleanest via **Capacitor 7** (targets 35 and bumps AGP/Gradle), or bump AGP to ≥ 8.6 with Capacitor 6. Must rebuild + re-test (not doable in this env). Est. 0.5–1 day.

### B2 — App icons / splash · ✅ **RESOLVED**
Branded launcher icons (brain mark) and splash (full logo on white) generated from the V Welfare logo into all Android densities + iOS AppIcon/Splash; splash background set to `#FFFFFF`. Source art committed under `capacitor/assets/`.

### B3 — Apple App Store Guideline 4.2 (minimum functionality / "web wrapper") · [C] · **iOS risk, not a hard block**
Server-URL wrappers are frequently rejected under 4.2/4.2.3. Mitigations already present (native push, deep links `vwelfare://`, device info, secure storage, status bar/back-button) strengthen the native-value case but do **not** guarantee approval.
**Action (product decision):** either (a) submit and iterate on review feedback, or (b) add more native surface (offline cache, biometric unlock, native notifications inbox). Google Play is materially more lenient — Android can ship first. 

---

## Store requirements checklist

| Item | Play | App Store | Status |
|---|---|---|---|
| Unique bundle id `com.vwelfare.app` | ✓ | ✓ | [C] Ready |
| Target API 35 | ✗ | n/a | **B1** |
| App icons / splash | ✗ | ✗ | **B2** |
| Signed release (AAB / archive) | keystore | Apple cert | [C] Configured; needs your creds |
| Privacy policy URL | ✓ | ✓ | [C] `/privacy` exists |
| Data safety / privacy nutrition labels (health data) | ⚠ | ⚠ | [D] You complete the console forms |
| Permissions minimal (INTERNET, POST_NOTIFICATIONS) | ✓ | n/a | [V/C] No over-ask |
| Push entitlement (APNs) | n/a | ⚠ | [C] Add in Xcode + APNs key |
| Export compliance | n/a | ✓ | [V/C] Fixed (#5) |
| Content rating / health-app declarations | ⚠ | ⚠ | [D] Console step |
| Min functionality / not a thin wrapper | ✓ | ⚠ | **B3** |

---

## Security assessment

| Area | Finding | Grade |
|---|---|---|
| Transport | HTTPS-only, `cleartext:false`, ATS default | ✅ [C] |
| Auth | Supabase cookie-SSR preserved; cookies sandboxed + encrypted at rest in the WebView | ✅ [C] |
| Secret storage | App-managed values (push token, marker) in Keychain/Keystore | ✅ [C] |
| Backup exfiltration | `allowBackup=false` + extraction rules (fixed #3) | ✅ [C] |
| Screenshot / task-switcher PHI leak | `FLAG_SECURE` (fixed #4). *Note: also blocks users screenshotting their own results — revert if that UX is required.* | ✅ [C] |
| Admin isolation | Multi-layer, RLS-backed | ✅ [V] |
| Secrets in repo | None; CI injects via GitHub secrets | ✅ [V] |
| Deep-link handling | `vwelfare://` mapped to same-origin paths only (external URLs rejected) | ✅ [C] |
| Residual | iOS lacks explicit `NSFileProtectionComplete`; consider certificate pinning for high-assurance | ⚠ [C] recommendation |

No critical security defects. RLS is correctly relied on as the backend boundary.

---

## Accessibility (WCAG 2.2) — reachable pages · [V] where measured

- `lang`/`dir` set on all pages (RTL supported). ✅
- Login inputs programmatically **labelled**. ✅
- No horizontal scroll at 390 px on landing / login / web-only. ✅
- Web-only CTA contrast **4.83:1** (AA) after fix. ✅
- ⚠ **7 touch targets < 40 px** on the login page (below the 44 px platform guideline; WCAG 2.2 SC 2.5.8 minimum is 24 px so likely a guideline miss, not a hard fail). This is in the **shared web UI**, not the wrapper — recommend the web team enlarge tap targets. [V]
- [D] Screen-reader passes (VoiceOver/TalkBack), focus order, and dynamic-type scaling need on-device testing.

---

## Mobile UX

- ✅ Android hardware back button wired to in-app history; splash, status-bar styling, deep links.
- ⚠ **Offline:** server-URL mode shows the local `www/` loading page only on first launch; after load, connectivity loss falls to the WebView error page. Recommend a branded offline screen / retry. [C]
- ⚠ **Safe-area insets (notch/home indicator):** governed by the remote web CSS; verify `env(safe-area-inset-*)` handling on device. [D]
- ⚠ First-load latency = full web app over network inside a fresh WebView; splash is a fixed 1500 ms. Consider a connectivity check before hiding splash. [C]

## Performance

- Native shell is thin; runtime cost = the web platform's own Core Web Vitals over the network. Not meaningfully measurable from localhost — **measure LCP/INP/CLS against `https://app.vwelfare.com` on a mid-tier device**. [D]
- `next build` is green; bundle unchanged by the mobile integration beyond small guarded client components. [V]

---

## Patient / clinician workflow status

Logic is the same code that already runs on the web (verified to build). End-to-end authenticated journeys were **not** run here (no test accounts / device). Use `capacitor/MOBILE_QA_CHECKLIST.md` on device to sign off:

| Workflow | Here | Needs device QA |
|---|---|---|
| Login page render + labelled fields | ✅ [V] | Full auth round-trip [D] |
| Session persistence across relaunch | — | [D] |
| Assessments (load → answer → save → result → PDF) | — | [D] |
| Mood / journal / insights / messages | — | [D] |
| Clinician: patients, notes (consent), verification, connect | — | [D] |
| Push permission + token registration | code-complete [C] | delivery [D] |
| Admin blocked everywhere | ✅ [V] | [D] confirm on device |

---

## Prioritized remediation plan

1. **B1** target API 35 (Capacitor 7 upgrade path) — *blocker, ~1 day*
2. **B2** generate branded icons/splash — *blocker, ~2 hrs*
3. **B3** decide iOS wrapper-value strategy — *iOS gate, product decision*
4. Complete Play Data safety + Apple privacy labels — *console, ~2 hrs*
5. Add signing secrets + `google-services.json` / APNs key; wire push sending — *~half day*
6. Run `MOBILE_QA_CHECKLIST.md` on real Android 13+/iOS devices — *~1 day*
7. Nice-to-have: offline screen, enlarge login tap targets, safe-area review.

**Recommended path:** ship **Android to a closed testing track** after 1+2+6; hold **iOS** for the 4.2 decision. Re-run this audit's runtime checks post-upgrade.
