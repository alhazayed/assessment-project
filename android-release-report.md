# Android Release Report — Google Play Internal Testing

**App:** V Welfare · **Package:** `com.vwelfare.app` · **Date:** 2026-07-06
**Branch:** `claude/capacitor-mobile-setup-xflg5y` (PR #44) · Capacitor 7 · SDK 35

> **Environment boundary (read first).** This work runs in a Linux container with **no Android SDK, no device/emulator, and no signing keystore**. Therefore the APK/AAB are **built and verified on the GitHub Actions runner** (which has the SDK), and the steps that need a real device or the upload key — **install / launch / crash-check / signed Play upload** — cannot be executed here and are marked **[device]** / **[keystore]** with exact instructions. Nothing below claims a device result that wasn't actually observed.

---

## 1. Release build — ✅ verified (CI)

The `mobile.yml` Android job builds the release on a real runner (JDK 21 / SDK 35 / AGP 8.7.2 / Gradle 8.11.1):

```
./gradlew bundleRelease assembleRelease
```

- Capacitor 7 release build already passed on CI (runs #1/#2); this adds the APK + assertions.
- Outputs: `app/build/outputs/bundle/release/*.aab` and `app/build/outputs/apk/release/*.apk`.

## 2. Config verification — ✅

| Item | Value | Source |
|---|---|---|
| **versionCode** | `1` | `app/build.gradle` (+ CI aapt assert) |
| **versionName** | `1.0.0` | `app/build.gradle` (+ CI aapt assert) |
| **package / applicationId** | `com.vwelfare.app` | `app/build.gradle` namespace + applicationId (+ CI aapt assert) |
| **minSdk / targetSdk / compileSdk** | 23 / 35 / 35 | `variables.gradle` |
| **Signing** | `signingConfigs.release` from git-ignored `keystore.properties` | `app/build.gradle` |
| **debuggable** | `false` (explicit) | `app/build.gradle` release buildType |
| **minifyEnabled** | `false` | acceptable for internal testing (R8 can be enabled later) |

### Signing configuration
Release signing is wired to load `storeFile/storePassword/keyAlias/keyPassword` from `capacitor/android/keystore.properties` (git-ignored; template at `keystore.properties.example`). When present, `release` is signed with your **upload key**; when absent (as in CI without secrets), Gradle emits an **unsigned** release. Google Play Internal Testing uses **Play App Signing** — you upload an AAB signed with your upload key, and Google re-signs for distribution.

## 3. Build artifacts — ✅ (CI)

| Artifact | Path | Use |
|---|---|---|
| **Release AAB** | `bundle/release/app-release.aab` | Upload to Play Internal Testing |
| **Release APK** | `apk/release/app-release(-unsigned).apk` | Direct sideload/QA install |

Both are uploaded by CI as the **`vwelfare-android-release`** artifact on each `mobile.yml` run. _CI run result + download link: see "CI result" below._

## 4. Verification results

| Check | Result | How |
|---|---|---|
| Release build compiles/packages | ✅ **[CI]** | `gradlew bundleRelease assembleRelease` on the runner |
| **No debug flags** in release | ✅ **[CI]** | `aapt dump badging` asserts `application-debuggable` is **absent**; build fails if present |
| Identifiers correct | ✅ **[CI]** | aapt asserts `com.vwelfare.app` / versionCode 1 / versionName 1.0.0 |
| **Installs correctly** | ⏳ **[device+keystore]** | needs a signed APK on a device/emulator — not available here |
| **Launches** | ⏳ **[device]** | needs a device; app loads `https://app.vwelfare.com` in the WebView |
| **No crashes** | ⏳ **[device]** | run the `capacitor/MOBILE_QA_CHECKLIST.md` smoke path on device |

## 5. How to produce the signed build and run Internal Testing

1. **Create/locate the upload keystore** (once) and set `capacitor/android/keystore.properties` (see `keystore.properties.example`). For CI signing, set repo secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
2. **Add `google-services.json`** to `capacitor/android/app/` if you want push in the testing build.
3. **Build signed:** `cd capacitor/android && ./gradlew bundleRelease` → `app-release.aab` (signed).
4. **Install-test the APK:** `./gradlew assembleRelease` then `adb install -r app/build/outputs/apk/release/app-release.apk` on a device/emulator; confirm launch + smoke test.
5. **Play Console → Internal testing → Create release →** upload the AAB, add testers, roll out. Complete the Data safety + content rating forms (health data).

## CI result — ✅ GREEN

`mobile.yml` [run #5](https://github.com/alhazayed/assessment-project/actions/runs/28824943349) (branch `claude/capacitor-mobile-setup-xflg5y`) — Android job **success**. Verbatim from the runner (JDK 21 / SDK 35):

```
BUILD SUCCESSFUL in 2m 5s
APK: app/build/outputs/apk/release/app-release-unsigned.apk
AAB: app/build/outputs/bundle/release/app-release.aab
package: name='com.vwelfare.app' versionCode='1' versionName='1.0.0' compileSdkVersion='35'
sdkVersion:'23'
targetSdkVersion:'35'
OK: release APK is not debuggable
Release identifiers verified: com.vwelfare.app / versionCode 1 / versionName 1.0.0
```

- **Release AAB + APK built:** ✅ `app-release.aab` and `app-release-unsigned.apk` (unsigned — the signing step is skipped because keystore secrets aren't set; add them to sign).
- **No debug flags:** ✅ aapt confirms the release APK is **not** debuggable.
- **Identifiers:** ✅ `com.vwelfare.app` / versionCode 1 / versionName 1.0.0 / minSdk 23 / targetSdk 35.
- **Artifact:** ✅ `vwelfare-android-release` (8.9 MB, contains the AAB + APK), retained ~90 days — [download](https://github.com/alhazayed/assessment-project/actions/runs/28824943349/artifacts/8122281375).

## Go / No-Go — Internal Testing

⚠️ **Conditional GO.** The release build, identifiers, signing wiring, and no-debug guarantee are verified on CI. Remaining before you upload: provide the **upload keystore** (to sign the AAB) and run a **device install/launch/smoke test** — neither is possible in this environment. Everything else is in place and reproducible.
