# PLAY_STORE_READINESS.md — V Welfare (com.vwelfare.app)

**Date:** 2026-07-10 · **Branch:** `claude/capacitor-mobile-setup-xflg5y`
**App model:** Capacitor 7 native shell rendering the live Next.js platform (`server.url = https://app.vwelfare.com`, `cleartext:false`). Health / mental-health category.

Legend: ✅ done in-repo · 🟡 needs a one-time manual action in Play Console · ⛔ blocker.

---

## Build / signing checklist

| Item | Status | Detail |
|---|---|---|
| `applicationId` / package | ✅ | `com.vwelfare.app` (asserted in CI via aapt) |
| `versionCode` / `versionName` | ✅ | `1` / `1.0.0` (asserted in CI) |
| `minSdk` / `targetSdk` / `compileSdk` | ✅ | `23` / `35` / `35` (Android 15 target — meets 2025 Play requirement) |
| Release build (AAB + APK) | ✅ | CI `mobile.yml` builds `bundleRelease` + `assembleRelease` |
| Not debuggable | ✅ | `debuggable false`; CI aapt asserts `application-debuggable` absent |
| Upload signing | ✅ wired / 🟡 keys | Signs from `ANDROID_KEYSTORE_*` CI secrets (now configured) → **signed AAB produced & signature-verified in CI** |
| Play App Signing enrolment | 🟡 | Enrol on first upload; keep the **upload keystore** backed up |
| R8/minify | 🟡 optional | `minifyEnabled false` (fine for internal testing; enable later) |

## Permissions checklist

| Permission | Declared? | Justification |
|---|---|---|
| `INTERNET` | ✅ | Loads the web platform + Supabase over HTTPS |
| `POST_NOTIFICATIONS` | ✅ | FCM push (Android 13+ runtime prompt) |
| Camera / Microphone / Location / Storage / Contacts | ❌ none | Not requested — minimal-permission WebView app |
| Foreground service / background exec | ❌ none | None declared |
| Package visibility (`<queries>`) | ✅ n/a | Only `@capacitor/app-launcher` default; no sensitive queries |

## Data Safety form (health data) — 🟡 complete in Console

Prefill guidance based on the codebase:
- **Data collected:** account (email), health info (assessment responses/results), app activity, push token. **In transit encryption:** yes (HTTPS/`cleartext:false`). **At rest:** Supabase-managed.
- **Data sharing:** none to third parties for advertising; processors = Supabase (DB/auth/storage), Vercel (hosting), Google FCM (push), Gemini API (assessment interpretation).
- **Deletion:** account/data deletion supported (`app/api/user/export-data`, admin `delete-user`); provide the in-app/URL deletion path in the form.
- **Sensitive data (mental health):** declare; ensure the privacy policy URL is set.

## Health apps declaration — 🟡 Console

- Complete the **Health apps** declaration (mental-health self-assessment). Provide organisation/credentials as required; include disclaimers that the tool is not a diagnosis and surface emergency/helpline info (verify present in-app before submission).

## Privacy checklist

| Item | Status |
|---|---|
| Privacy Policy route | ✅ `/privacy` (responsive-certified) |
| Terms route | ✅ `/terms` |
| Privacy Policy URL in Console | 🟡 set to the deployed `/privacy` URL |
| Consent flow / disclaimers | 🟡 verify on device (runtime) |
| Account & data deletion path | ✅ code present · 🟡 declare URL in Console |

## Content rating / target audience — 🟡 Console

- Complete the **content rating** questionnaire and **target audience** (adults; not directed at children).

## Testing checklist

| Track | Status |
|---|---|
| Internal testing | 🟡 upload signed AAB → add testers → roll out |
| Closed / Open testing | 🟡 after internal sign-off |
| Production | ⛔ until runtime QA + Console forms complete |
| On-device smoke test | 🟡 `capacitor/MOBILE_QA_CHECKLIST.md` — install/launch/login/assessment/PDF/RTL/deep-link/**screen-fit** (edge-to-edge fix shipped) |
| Crash/ANR | 🟡 verify on device; server-URL app inherits web error handling |

## Required manual actions (summary)

1. Enrol in **Play App Signing**; back up the upload keystore.
2. Complete **Data safety**, **Health apps**, **content rating**, **target audience** forms; set **Privacy Policy URL**.
3. Add `google-services.json` to `capacitor/android/app/` if enabling push in the tested build.
4. Upload the CI-produced **signed AAB**, run the on-device smoke test, then promote through tracks.

**No code-level Play blockers remain** in the Android project (SDK targets, permissions, signing, no-debug, identifiers all satisfied). Remaining items are Console forms + on-device QA.
