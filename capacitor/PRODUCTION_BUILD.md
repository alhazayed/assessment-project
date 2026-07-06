# Production Builds — Google Play & App Store

The native apps wrap the deployed web platform (`server.url` in
`capacitor.config.ts`). Building for the stores means producing signed native
binaries; the app content is served remotely, so a store build does not bundle
the web app.

App identifiers (both platforms): **`com.vwelfare.app`** · Display name
**V Welfare** · Version **1.0.0**.

Before any release build, point the shell at production and sync:

```bash
cd capacitor
# CAP_SERVER_URL defaults to https://app.vwelfare.com
npx cap sync
```

---

## Android (Google Play) — `.aab`

**Prerequisites:** Android Studio + JDK 17, a Google Play Console account
($25 one-time), an upload keystore, and (for push) `google-services.json`.

1. **Create an upload keystore** (once):

   ```bash
   keytool -genkey -v -keystore capacitor/android/vwelfare-upload.keystore \
     -alias vwelfare -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure signing:** copy `android/keystore.properties.example` to
   `android/keystore.properties` (git-ignored) and fill in the passwords/alias.
   `build.gradle` reads it automatically and signs `release` builds.

3. **Add push config:** drop `google-services.json` (from the Firebase console)
   into `android/app/`. The Gradle build applies the google-services plugin only
   when this file is present (see `android/app/build.gradle`). See
   [PUSH_SETUP.md](./PUSH_SETUP.md).

4. **Bump versions** in `android/app/build.gradle` (`versionCode` must increase
   for every Play upload; `versionName` is the human-facing string).

5. **Build the bundle:**

   ```bash
   cd capacitor/android
   ./gradlew bundleRelease
   # → app/build/outputs/bundle/release/app-release.aab
   ```

6. Upload the `.aab` in Play Console → *Production* (or an internal testing
   track first). Complete the Data safety form — this app processes sensitive
   health data (see the platform compliance docs).

---

## iOS (App Store) — `.ipa`

**Prerequisites:** macOS + Xcode, CocoaPods (`sudo gem install cocoapods`), an
Apple Developer account ($99/year), and (for push) an APNs key.

1. **Install pods** (first time / after plugin changes):

   ```bash
   cd capacitor/ios/App && pod install
   ```

2. **Open the workspace:**

   ```bash
   cd capacitor && npx cap open ios   # opens App.xcworkspace
   ```

3. In Xcode → *Signing & Capabilities*:
   - Select your Team; confirm bundle id `com.vwelfare.app`.
   - Add the **Push Notifications** capability.
   - Add **Background Modes** → *Remote notifications* (Info.plist already
     declares `remote-notification`).

4. Set **Marketing Version** (1.0.0) and **Build** number.

5. **Archive & upload:** *Product → Archive* → *Distribute App* →
   *App Store Connect*. Configure APNs in the Apple Developer portal (see
   [PUSH_SETUP.md](./PUSH_SETUP.md)).

---

## App icons & splash

Branded assets are already generated for all Android densities and iOS from the
V Welfare logo — app icon is the brain mark (wordmark cropped for legibility),
splash is the full logo centered on white. Source art is committed under
`capacitor/assets/` (`icon.png` 1024², `splash.png`/`splash-dark.png` 2732²).

To regenerate after changing the source art:

```bash
cd capacitor
# Preferred (needs network for the sharp binary):
npx @capacitor/assets generate --iconBackgroundColor '#ffffff' --splashBackgroundColor '#ffffff' --splashBackgroundColorDark '#ffffff'
```
