# Vwelfare — Capacitor Native Shell

Native **iOS** and **Android** app for the Vwelfare mental health platform, built
with [Capacitor](https://capacitorjs.com/).

The Vwelfare platform is a server-rendered Next.js app (API routes, middleware,
SSR auth). Instead of statically exporting it — which would change the platform —
this shell loads the **live, deployed web platform** inside a native WebView. The
web app itself is untouched; nothing in the parent project was modified to add
this.

> There is also a separate React Native / Expo app under `../mobile`. This
> Capacitor project is an independent, web-wrapper alternative and does not
> depend on it.

---

## Prerequisites

| Platform | Requires |
|---|---|
| Android | [Android Studio](https://developer.android.com/studio) + JDK 17 |
| iOS | macOS + Xcode + [CocoaPods](https://cocoapods.org/) (`sudo gem install cocoapods`) |

## Setup

```bash
cd capacitor
npm install
```

The generated `android/` and `ios/` native projects are already checked in. If
they are ever missing, recreate them with:

```bash
npx cap add android
npx cap add ios
```

## Configuration

The wrapped platform URL is read from `CAP_SERVER_URL` (see `capacitor.config.ts`),
defaulting to `https://vwelfare.vercel.app`.

```bash
cp .env.example .env         # optional — only to override the default URL
# edit CAP_SERVER_URL, then re-sync so native projects pick it up:
npx cap sync
```

## Develop

```bash
npm run open:android    # opens Android Studio
npm run open:ios        # opens Xcode (macOS only)

npm run run:android     # build + run on a connected device/emulator
npm run run:ios         # build + run on a simulator/device (macOS only)
```

After changing `capacitor.config.ts` or the `www/` fallback assets, run
`npx cap sync` to copy them into the native projects.

## Build for stores

- **Android:** open in Android Studio → *Build > Generate Signed Bundle / APK*
  (produces an `.aab` for Google Play). App ID: `com.vwelfare.app`.
- **iOS:** open in Xcode → set your signing team → *Product > Archive* → upload
  to App Store Connect. Bundle ID: `com.vwelfare.app`.

## Native integration

The web platform is Capacitor-aware. When it loads inside the native WebView it
lights up native features; in a normal browser everything below is inert.

- **Detection** — `lib/capacitor/client.ts` (`isNativeApp()`, platform) and
  `lib/capacitor/server.ts` (server-side, via the `VWelfareApp` User-Agent tag
  set by `appendUserAgent`).
- **Auth** — unchanged Supabase cookie-based SSR; cookies persist in the app's
  sandboxed, encrypted WebView store. App-managed values (push token, marker)
  use the hardware keystore via `lib/capacitor/secure-storage.ts`.
- **No admin in the app** — `middleware.ts` redirects `/x/control` and `/admin*`
  to `/dashboard` for the native User-Agent, and the sidebar hides admin nav
  (`components/sidebar.tsx`). Admin also still requires an admin PIN.
- **Push** — `components/native/PushRegistration.tsx` registers and posts the
  token to the existing `/api/user/push-token`. See [PUSH_SETUP.md](./PUSH_SETUP.md).
- **Shell** — `components/native/NativeBootstrap.tsx` handles status bar and the
  Android back button.

## Docs

- [PRODUCTION_BUILD.md](./PRODUCTION_BUILD.md) — signed Play/App Store builds.
- [PUSH_SETUP.md](./PUSH_SETUP.md) — FCM/APNs wiring.
- [MOBILE_QA_CHECKLIST.md](./MOBILE_QA_CHECKLIST.md) — device verification for
  patient & clinician workflows.

## What's in `www/`

A minimal local loading/offline page shown only while the remote platform loads,
or when the device is offline. The real UI is served remotely via `server.url`.

## Healthcare notice

This app surfaces sensitive mental health data. Before shipping to stores, review
data handling, privacy policy, emergency numbers, and disclaimers with a qualified
legal/compliance professional (see the platform's own compliance docs).
