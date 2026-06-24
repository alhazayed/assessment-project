# V Welfare Mobile Architecture

## Overview

V Welfare uses **Capacitor** to wrap the existing Next.js web application into a native Android and iOS shell. This is a single-codebase approach — no logic is duplicated.

```
┌─────────────────────────────────────────────┐
│              V Welfare Codebase             │
│                                             │
│  Next.js 14 (App Router)                   │
│  ├── app/           (pages)                │
│  ├── components/    (UI)                   │
│  └── lib/mobile/    (native bridge)        │
│                                             │
│  Deployed to Vercel (web)                  │
└──────────────────┬──────────────────────────┘
                   │
              Capacitor
                   │
        ┌──────────┴──────────┐
        │                     │
      Android               iOS
    (WebView)           (WKWebView)
```

## How It Works

1. **Web**: Next.js deploys to Vercel as normal. Users access via browser.
2. **Mobile**: Capacitor wraps the deployed web app in a native WebView.
   - The app points at `https://vwelfare.vercel.app` (production server).
   - Native plugins (camera, notifications, storage) are bridged via `@capacitor/` packages.
   - The `lib/mobile/` directory abstracts all native API calls.

## Directory Structure

```
assessment-project/
├── app/                    # Next.js pages (shared web + mobile)
├── components/
│   ├── capacitor-provider.tsx   # Native bridge bootstrap
│   └── offline-banner.tsx       # Offline detection UI
├── lib/mobile/             # Native bridge abstractions
│   ├── platform.ts         # isNative(), getPlatform()
│   ├── secure-storage.ts   # Keychain/Keystore wrapper
│   ├── deep-link.ts        # URL scheme + universal link handler
│   ├── back-button.ts      # Android back button
│   ├── offline.ts          # Connectivity + cache
│   ├── notifications.ts    # Push notification interface
│   ├── file-download.ts    # PDF native share
│   ├── permissions.ts      # Permission request layer
│   └── analytics.ts        # No-op analytics interface
├── android/                # Android native project (Capacitor generated)
├── ios/                    # iOS native project (Capacitor generated)
├── capacitor.config.ts     # Capacitor configuration
└── docs/mobile/            # This documentation
```

## Key Design Decisions

### Why Capacitor (not React Native)?
- Zero code duplication — same Next.js codebase serves web and mobile
- Existing Supabase Auth, RLS, and all business logic unchanged
- Faster time-to-store for an already production-ready web platform
- RTL/Arabic support already in place via TailwindCSS

### Why Live Server Mode?
`capacitor.config.ts` points at `https://vwelfare.vercel.app`. This means:
- Updates deploy instantly (no app store re-release for content changes)
- Requires internet connection (see offline strategy below)
- Performance depends on network

For future offline-first mode, switch to static bundle: set `webDir: 'out'` and enable `output: 'export'` in `next.config.js`.

## Security Architecture

| Layer | Mechanism |
|-------|-----------|
| Transport | HTTPS enforced; HSTS header |
| Token storage | iOS Keychain / Android EncryptedSharedPreferences via `@capacitor/preferences` |
| CSP | Updated to allow `capacitor://localhost` |
| Root/Jailbreak detection | Hooks prepared; implementation in Phase 4 |
| Certificate pinning | Hooks prepared; implementation in Phase 4 |

## Authentication Flow

```
User taps "Login" →
  Supabase signInWithPassword() →
  Session stored in @capacitor/preferences (Keychain/Keystore) →
  Router redirects to /dashboard

Password Reset (mobile) →
  User requests reset →
  Supabase sends email with link → vwelfare://reset-password?token=... →
  Deep link handler intercepts → router.push('/reset-password?token=...') →
  User sets new password
```
