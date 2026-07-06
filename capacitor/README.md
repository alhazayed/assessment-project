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
defaulting to `https://app.vwelfare.com`.

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
- **Admin is web-only in the app** — `middleware.ts` redirects any admin deep
  link (`/x/control`, `/admin*`, `/dashboard/admin*`, `/settings/admin*`) to the
  `/mobile/web-only` notice for the native User-Agent; the app layout bounces
  admin-role accounts to that notice; and the sidebar hides admin nav
  (`components/sidebar.tsx`). Admin also still requires an admin PIN → defense in
  depth. Supabase RLS remains the only backend security layer.
- **Push** — `components/native/PushRegistration.tsx` registers and posts the
  token to the existing `/api/user/push-token`. See [PUSH_SETUP.md](./PUSH_SETUP.md).
- **Deep linking** — `vwelfare://<path>` (and `app.vwelfare.com` links) route to
  in-app navigation via an `appUrlOpen` handler in `NativeBootstrap.tsx`
  (scheme registered in the iOS Info.plist and Android manifest).
- **Device / App Launcher** — `lib/capacitor/device.ts` wraps `@capacitor/device`
  and `@capacitor/app-launcher` (SSR-safe, no-ops on web).
- **Shell** — `NativeBootstrap.tsx` handles status bar and the Android back button.

## CI/CD

`.github/workflows/mobile.yml` runs on push to `main` (and `workflow_dispatch`):
installs deps → `next build` → `cap sync` → builds a **release AAB** (signed when
the `ANDROID_KEYSTORE_*` secrets are set, otherwise unsigned) → uploads the AAB
artifact. The iOS archive job is opt-in via the `ENABLE_IOS_BUILD=true` repo
variable and runs on a mac runner. No credentials are hardcoded — all come from
repo **secrets** (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`).

## Docs

- [PRODUCTION_BUILD.md](./PRODUCTION_BUILD.md) — signed Play/App Store builds.
- [PUSH_SETUP.md](./PUSH_SETUP.md) — FCM/APNs wiring.
- [MOBILE_QA_CHECKLIST.md](./MOBILE_QA_CHECKLIST.md) — device verification for
  patient & clinician workflows.

## Known limitations

- **Server-URL mode**: the app renders the live site, so it needs connectivity;
  offline shows the local `www/` loading page, not cached content.
- **Push sending** is scaffolded (client registration + token storage only);
  delivery needs FCM/APNs credentials (see PUSH_SETUP.md).
- **iOS builds** require macOS + Xcode + CocoaPods; not runnable on Linux CI.
- **Admin gating** relies on the app's own User-Agent tag for UX; the real
  backend security boundary is Supabase RLS + the admin PIN.
- **Signed store binaries** are produced by you (keystore / Apple & Google
  accounts) — the pipeline builds unsigned without the secrets.

## Production readiness checklist

- [x] Server-URL wrapper (`https://app.vwelfare.com`, `cleartext:false`, HTTPS).
- [x] No frontend duplication; no breaking changes to the Next.js app.
- [x] Supabase auth preserved (cookie SSR); secure keystore for app-managed values.
- [x] Admin web-only (middleware + layout + hidden nav + PIN + RLS).
- [x] Deep linking (`vwelfare://`), status bar, splash, back button.
- [x] Push registration wired to existing backend (send credentials pending).
- [x] CI pipeline builds AAB + uploads artifact; secrets injected, none hardcoded.
- [x] `next build` green on Next 16 / React 19; `cap sync` registers all plugins.
- [ ] **You:** add signing secrets, `google-services.json`/APNs key, run device QA
      ([MOBILE_QA_CHECKLIST.md](./MOBILE_QA_CHECKLIST.md)), submit to stores.

## What's in `www/`

A minimal local loading/offline page shown only while the remote platform loads,
or when the device is offline. The real UI is served remotely via `server.url`.

## Healthcare notice

This app surfaces sensitive mental health data. Before shipping to stores, review
data handling, privacy policy, emergency numbers, and disclaimers with a qualified
legal/compliance professional (see the platform's own compliance docs).
