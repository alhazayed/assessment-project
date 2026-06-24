# Build Android

## Prerequisites

- Android Studio (latest stable)
- JDK 17+
- Android SDK API 34+
- Node.js 18+

## Setup

```bash
# 1. Clone and install
git clone https://github.com/alhazayed/assessment-project.git
cd assessment-project
npm install

# 2. Sync Capacitor (copies web assets + plugins to android/)
npx cap sync android

# 3. Open in Android Studio
npx cap open android
```

## Build APK (Debug)

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

Or from terminal:
```bash
cd android
./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

## Build AAB (Production — Google Play)

```bash
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

**Signing required** — configure in `android/app/build.gradle`:
```groovy
signingConfigs {
    release {
        storeFile file(KEYSTORE_PATH)
        storePassword KEYSTORE_PASSWORD
        keyAlias KEY_ALIAS
        keyPassword KEY_PASSWORD
    }
}
```

Store credentials in `~/.gradle/gradle.properties` (never commit):
```
KEYSTORE_PATH=/path/to/vwelfare.keystore
KEYSTORE_PASSWORD=your_password
KEY_ALIAS=vwelfare
KEY_PASSWORD=your_key_password
```

## App ID

`com.vwelfare.app` (set in `capacitor.config.ts`)

## Minimum SDK

- `minSdkVersion`: 23 (Android 6.0) — required by @capacitor/preferences EncryptedSharedPreferences
- `targetSdkVersion`: 34 (Android 14)

## Deep Link Verification

For App Links (https:// scheme) to work, host the following at:  
`https://vwelfare.vercel.app/.well-known/assetlinks.json`

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.vwelfare.app",
    "sha256_cert_fingerprints": ["YOUR_SIGNING_CERT_SHA256"]
  }
}]
```

## Environment Variables

The app points at the production Vercel URL — no additional environment configuration needed on Android.

For staging builds, change `server.url` in `capacitor.config.ts` before building.
