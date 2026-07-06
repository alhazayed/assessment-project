# Capacitor 6 → 7 Upgrade Report — V Welfare

**Date:** 2026-07-06 · **Branch:** `claude/capacitor-mobile-setup-xflg5y` (PR #44)
**Goal:** upgrade to Capacitor 7 + Android build stack (SDK 35) while preserving all functionality. Clears readiness blocker **B1** (Play targetSdk 35).

---

## Packages upgraded

| Package | From | To |
|---|---|---|
| @capacitor/core | ^6.2.0 | **7.6.7** |
| @capacitor/cli | ^6.2.0 | **7.6.7** |
| @capacitor/android | ^6.2.0 | **7.6.7** |
| @capacitor/ios | ^6.2.0 | **7.6.7** |
| @capacitor/app | ^6.0.2 | **7.1.2** |
| @capacitor/app-launcher | ^6.0.2 | **7.0.4** |
| @capacitor/device | ^6.0.2 | **7.0.5** |
| @capacitor/push-notifications | ^6.0.4 | **7.0.7** |
| @capacitor/splash-screen | ^6.0.3 | **7.0.5** |
| @capacitor/status-bar | ^6.0.2 | **7.0.6** |
| capacitor-secure-storage-plugin | ^0.10.0 | **0.11.0** |

Updated in **both** `package.json` (root — web bundle) and `capacitor/package.json` (native).

## Android build stack

| Component | From | To |
|---|---|---|
| compileSdkVersion | 34 | **35** |
| targetSdkVersion | 34 | **35** |
| minSdkVersion | 22 | **23** |
| Android Gradle Plugin | 8.2.1 | **8.7.2** |
| Gradle wrapper | 8.2.1 | **8.11.1** |
| Java (source/target) | 17 | **21** |
| google-services | (n/a) | **4.4.2** |
| AndroidX (activity/appcompat/core/fragment/webkit/junit/espresso) | 6.x set | **Cap 7 set** (1.9.2 / 1.7.0 / 1.15.0 / 1.8.4 / 1.12.1 / 1.2.1 / 3.6.1) |

## iOS build stack

| Component | From | To |
|---|---|---|
| Deployment target | 13.0 | **14.0** (Info.plist project + Podfile) |

---

## Breaking changes (Capacitor 7) and how they were handled

1. **JDK 21 required** for Android builds (was 17). → CI `mobile.yml` bumped `java-version: 17 → 21`; generated `capacitor.build.gradle` now targets `JavaVersion.VERSION_21`.
2. **minSdk 22 → 23** — drops Android 5.1 (Lollipop MR1). Acceptable for a 2026 launch; noted for release notes.
3. **SDK 35 / AGP 8.7.2 / Gradle 8.11.1** — applied via `cap migrate`, except the Gradle wrapper (the auto-bump runs `gradlew wrapper`, which needs the Android SDK unavailable in this container) — **fixed manually** by setting `distributionUrl` to `gradle-8.11.1-all.zip`.
4. **Plugin `package` attribute moved** from `AndroidManifest.xml` to `build.gradle` — handled by `cap migrate`.
5. **Activity `configChanges`** gained `navigation` (Cap 7) — added by `cap migrate`.
6. **iOS deployment target 14.0** — applied by `cap migrate`.
7. **Plugin API review** (`@capacitor/app`, `@capacitor/device`, `@capacitor/splash-screen` flagged by the migrator): our usage — `App.addListener('backButton'|'appUrlOpen')`, `App.exitApp`, `Device.getInfo()`, and the SplashScreen config (`launchShowDuration`, `backgroundColor`, `showSpinner`, `androidScaleType`) — uses **stable APIs only**; **no code changes were required**. `Capacitor.isNativePlatform()` / `getPlatform()`, push, status-bar, app-launcher, and secure-storage APIs are unchanged.

## Fixes implemented

- Manual Gradle wrapper bump to 8.11.1 (see #3).
- CI: JDK 21; added a `pull_request` trigger (scoped to `capacitor/**`, workflow, and lockfiles) so the **Android release AAB is actually built and validated on the PR**, not only post-merge.
- All prior customizations verified intact after migration: release signing (`keystore.properties`), `allowBackup=false` + data-extraction rules, `FLAG_SECURE`, `POST_NOTIFICATIONS`, `vwelfare://` deep-link intent-filter, `appendUserAgent`, splash/icon branding.
- **No deprecated APIs remain** in our native/app code after review.

## Compatibility verification

| Check | Result |
|---|---|
| Next.js 16 / React 19 — `next build` (type-check + lint + all routes) | ✅ **green** (verified here) |
| Capacitor 7 JS in web bundle (`@capacitor/core` 7.6.7) | ✅ compiles, no breaking changes in our code |
| Supabase cookie-SSR auth | ✅ unchanged (no Capacitor-related code touched) |
| `cap sync` on Cap 7 | ✅ **7 plugins** registered on Android + iOS |
| Existing plugins | ✅ all resolve to Cap 7 versions (table above) |

## Build result

- **Web build:** ✅ passes (Next 16 / React 19).
- **`cap sync`:** ✅ passes (7 plugins, both platforms).
- **Android release AAB:** built in **GitHub Actions** (`mobile.yml`) — this container has **no Android SDK**, so the AAB cannot be produced locally; the CI runner (JDK 21 + SDK 35) is the source of truth. _Status: see CI result below._
- **iOS:** archive is opt-in on a mac runner (`ENABLE_IOS_BUILD=true`); not built here (needs macOS/Xcode).

## CI result

`mobile.yml` now runs on this PR (`pull_request`). The Android job installs deps → `next build` → `cap sync` → `./gradlew bundleRelease` (unsigned unless signing secrets are set) → uploads the AAB artifact.

> **Status: run triggered on push; result to be confirmed from the workflow run.** If the Gradle build surfaces any Cap 7 issue, it will be fixed and re-run until green.

---

## Final versions (summary)

Capacitor **7.6.7** · AGP **8.7.2** · Gradle **8.11.1** · JDK **21** · compileSdk/targetSdk **35** · minSdk **23** · iOS **14.0** · Next.js **16.2.10** · React **19**.
