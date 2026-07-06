# Android Branding Report — V Welfare

**Date:** 2026-07-06 · **Branch:** `claude/capacitor-mobile-setup-xflg5y` (PR #44)
**Source logo:** `mobile/assets/logo.png` (identical to `public/logo.png`; 1080² PNG, transparent background)
**Brand palette:** `#12273C` (dark navy) · `#1D6296` (primary blue) · `#F3650A` (accent orange)

---

## Assets generated

| Asset | Output | Densities | Notes |
|---|---|---|---|
| **Legacy icon** | `mipmap-*/ic_launcher.png` | mdpi→xxxhdpi (48–192) | Brain mark on white |
| **Round icon** | `mipmap-*/ic_launcher_round.png` | mdpi→xxxhdpi | Brain on white (launcher-masked) |
| **Adaptive icon** | `mipmap-*/ic_launcher_foreground.png` + `mipmap-anydpi-v26/ic_launcher*.xml` | mdpi→xxxhdpi (108–432) | Foreground brain @ 62% safe zone; background `@color/ic_launcher_background` (#FFFFFF) |
| **Monochrome icon** | `mipmap-*/ic_launcher_monochrome.png` + `<monochrome>` in adaptive XML | mdpi→xxxhdpi | Themed-icon layer (Android 13+); black silhouette from logo alpha, system-tinted |
| **Splash screen** | `drawable/splash.png` + `drawable-port/land-*/splash.png` | all | Full logo centered on white (2732²) |
| **Android 12 splash** | `values/styles.xml` → `windowSplashScreenAnimatedIcon`/`windowSplashScreenBackground`/`postSplashScreenTheme` | — | Cold-start shows the branded adaptive icon on white |
| **Notification icon** | `drawable-*/ic_stat_notify.png` + FCM manifest meta-data | mdpi→xxxhdpi (24–96) | White silhouette on transparent; tinted `#1D6296` via `default_notification_color` |
| **Play Store icon** | `capacitor/assets/playstore-icon.png` | 512×512 | Opaque (no alpha) — Play Console hi-res upload |

Source art (`icon.png`, `splash.png`, `playstore-icon.png`) is committed under `capacitor/assets/`.

## Brand wiring (also a build fix)

`styles.xml` referenced `@color/colorPrimary` / `colorPrimaryDark` / `colorAccent` but **no `colors.xml` defined them** — a latent resource-link failure for the Android build. Added `values/colors.xml` with the official palette, which both fixes the build and applies brand theming:

```xml
<color name="colorPrimary">#1D6296</color>
<color name="colorPrimaryDark">#12273C</color>
<color name="colorAccent">#F3650A</color>
<color name="vw_notification">#1D6296</color>
```

## Verification

- ✅ **All required densities exist** — `ic_launcher`, `ic_launcher_round`, `ic_launcher_foreground`, `ic_launcher_monochrome` at mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi (20 mipmaps); `ic_stat_notify` at all 5 densities; splash at `drawable` + 10 port/land density variants.
- ✅ **Play Store icon is 512×512** (opaque PNG).
- ✅ **No default Capacitor branding remains** — every `ic_launcher*` and `splash` was overwritten with the V Welfare brain mark; verified visually (launcher icon, adaptive foreground, splash, notification silhouette).
- ✅ Adaptive `<monochrome>`, Android-12 splash theme, and FCM notification meta-data wired.
- ✅ `npx cap sync android` — 7 plugins, clean.

## `npx @capacitor/assets generate`

Attempted as requested. **It cannot run in this environment:** the tool bundles its own `sharp`, whose native binary download is blocked by the sandbox egress proxy (HTTP 403), so the CLI exits without generating. All assets were instead produced with the project's already-working `sharp` — which additionally covers the **monochrome** and **notification** icons that `@capacitor/assets` does not generate. In a normal environment the same source (`capacitor/assets/`) regenerates the base icon/splash set with:

```bash
cd capacitor && npx @capacitor/assets generate --iconBackgroundColor '#ffffff' --splashBackgroundColor '#ffffff'
```

(monochrome + notification icons remain custom-generated regardless of tool).

## Build / CI

- **Android release build:** validated by GitHub Actions (`mobile.yml`) on the PR — no Android SDK in this container. This commit also clears the missing-`colorPrimary` resource error, so it should unblock the Android resource compile.
- Web build + `cap sync`: green.
