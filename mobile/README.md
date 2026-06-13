# V Welfare Mobile

React Native (Expo) companion app for the V Welfare mental health platform.
Shares the same Supabase database as the web app.

## Quick start

```bash
cd mobile
npm install
npx expo start
```

Press `a` to open on an Android emulator, or scan the QR code with Expo Go.

## Build APK (Android)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

## Environment

All config is in `app.json` under `expo.extra`. No `.env` file needed — credentials are already set.

## Screens

| Screen | Route |
|--------|-------|
| Login | `/(auth)/login` |
| Register | `/(auth)/register` |
| Forgot Password | `/(auth)/forgot-password` |
| Dashboard | `/(app)/dashboard` |
| Assessments list | `/(app)/assessments/index` |
| Take assessment | `/(app)/assessments/[id]` |
| Mood tracker | `/(app)/mood` |
| Journal | `/(app)/journal` |
| Messages | `/(app)/messages` |
| Profile | `/(app)/profile` |
