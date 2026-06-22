# Vwelfare Mobile

React Native / Expo companion app for the Vwelfare Mental Health Platform. Shares the same Supabase database and backend as the web application.

**Brand:** Primary `#1D6296` | Accent `#F3650A` | Dark `#12273C`

---

## Quick Start

```bash
cd mobile
cp .env.example .env          # then fill in your values
npm install
npx expo start
```

Press `a` for Android emulator, `i` for iOS simulator, or scan the QR code with **Expo Go** on your device.

---

## Environment Variables

Copy `.env.example` to `.env` and set:

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key |
| `EXPO_PUBLIC_WEB_URL` | The deployed web platform URL (e.g. `https://vwelfare.vercel.app`) |

---

## Architecture

| Layer | Technology |
|---|---|
| Framework | Expo SDK 53 + Expo Router 4 |
| Styling | NativeWind (Tailwind for RN) + StyleSheet |
| Backend | Supabase (same project as web) |
| Auth | Supabase Auth with AsyncStorage session persistence |
| State | React hooks (no external state library) |
| i18n | Custom `t()` function in `lib/i18n.ts` |
| Charts | `react-native-svg` (no chart library dependency) |

### Directory Structure

```
app/
  _layout.tsx              Root layout — auth redirect + onboarding check
  index.tsx                Redirect entry point
  onboarding.tsx           3-slide onboarding carousel
  emergency.tsx            Emergency resources (accessible without auth)
  (auth)/
    login.tsx              Sign in with language toggle + RTL support
    register.tsx           Sign up with optional gender/DOB fields
    forgot-password.tsx    Password reset
    _layout.tsx            Auth stack layout
  (app)/
    _layout.tsx            Tab navigator (5 tabs)
    dashboard.tsx          Home — wellbeing summary, quick actions, AI tip
    results.tsx            Assessment results history + PDF download
    mood.tsx               Mood tracker + 7-day SVG trend chart
    ai.tsx                 Wafi AI chat screen
    settings.tsx           Language, theme, notifications, account
    profile.tsx            Profile editor + data export
    assessments/
      index.tsx            Assessment list with search + category filter
      [id].tsx             Full assessment flow (intro → questions → result)
    resources/
      index.tsx            Resource center with category tabs (12 articles)
      [slug].tsx           Article detail view
lib/
  supabase.ts              Supabase client
  useAuth.ts               Auth hook — session + profile
  i18n.ts                  Bilingual translation dictionary (EN/AR)
  theme.ts                 Color system, spacing, theme objects, helpers
  hooks.ts                 useLocale, useThemeMode, useIsRTL
  types.ts                 TypeScript interfaces
```

---

## Features

- **Bilingual** — full English and Arabic (MSA) support with RTL layout
- **Onboarding** — 3-slide carousel stored in AsyncStorage
- **Authentication** — email/password with generic error messages (no user enumeration)
- **Assessments** — complete flow: intro → one question per screen → auto-save → results with PDF download
- **Mood Tracker** — mood + anxiety + energy levels, 7-day SVG bar chart
- **Results History** — all submissions with severity color bands and PDF export
- **Resources** — 12 static mental health articles across 6 categories, with full bilingual content
- **Wafi AI** — chat interface connecting to web API, static fallback if offline
- **Emergency Screen** — 911 and 988 quick-dial, accessible without auth
- **Settings** — language toggle, theme selector (light/dark/system), notification permissions
- **RTL** — `writingDirection: 'rtl'` and `flexDirection: 'row-reverse'` applied throughout

---

## Store Deployment

### Android (Google Play)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile production
eas submit --platform android
```

### iOS (App Store)

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

Configure `eas.json` with your bundle identifier (`com.vwelfare.mobile`) and Apple/Google credentials before running these commands. Ensure you have an active Apple Developer account ($99/year) and a Google Play Console account ($25 one-time).

---

## Healthcare Notice

This application handles sensitive mental health data. Before production deployment:

1. Review all data handling with a qualified legal/compliance professional
2. Ensure your Supabase RLS policies are correctly configured
3. Add a proper Privacy Policy and Terms of Service accessible from the app
4. Verify emergency resource phone numbers are correct for your target region
5. Add appropriate mental health disclaimers per your jurisdiction's requirements
