# Mobile QA Checklist

Device verification for the native app. Because the app renders the live web
platform in a native WebView, most functional logic is the same code that
already runs on the web — this checklist focuses on the native seams and the
patient/clinician journeys.

Run on: a physical Android device (13+), an Android emulator, and an iOS
device/simulator. Test both **English** and **Arabic (RTL)**.

## Native shell
- [ ] App launches to the splash, then loads the platform (`server.url`).
- [ ] Offline: airplane mode shows the local loading page, not a system error.
- [ ] Android hardware back navigates in-app history; exits app at the root.
- [ ] Status bar is styled (dark content on brand background).
- [ ] External links (privacy/terms/emergency phone) behave correctly.
- [ ] User-Agent carries `VWelfareApp` (verify a request in proxy/devtools).

## Authentication (Supabase, cookie SSR)
- [ ] Register a new patient; email verification flow works.
- [ ] Log in; session persists across app restart (cookie survives).
- [ ] Log out; protected routes redirect to `/login`.
- [ ] Forgot/reset password.
- [ ] Multi-launch: reopening the app keeps you signed in.

## Admin is NOT reachable in the app
- [ ] Signed in as a normal user, no admin nav item appears in the sidebar.
- [ ] Manually navigating to `/x/control` redirects to `/dashboard`.
- [ ] Navigating to `/admin/settings` redirects to `/dashboard`.
- [ ] Even signed in as an admin-role account, admin panel is not shown/reachable.

## Patient workflows
- [ ] Dashboard loads (wellbeing summary, quick actions).
- [ ] Assessments list → open an assessment → answer → auto-save → results.
- [ ] Interrupt mid-assessment (background the app) and resume.
- [ ] Results history + PDF export opens/downloads.
- [ ] Mood tracker logs an entry and renders the trend.
- [ ] Journal create/read.
- [ ] Insights render.
- [ ] Messages: send/receive with a clinician.
- [ ] "My Clinicians" connect flow.
- [ ] Profile edit + data export.

## Clinician workflows
- [ ] Dashboard/patient list loads.
- [ ] Open a patient; view results/notes per consent rules.
- [ ] Messages with a patient.
- [ ] Connect Patients flow.
- [ ] Verification screen.

## Push notifications
- [ ] First protected screen prompts for notification permission (native).
- [ ] Grant → a row appears in `push_tokens` for the user (correct platform).
- [ ] Deny → app continues to work; no crash.
- [ ] With FCM/APNs configured, a test push arrives; tapping it deep-links to
      the `url` in the payload.
- [ ] Sign out removes/rotates the local token (`vw_push_token`).

## RTL / bilingual
- [ ] Toggle to Arabic; layout mirrors (RTL); nav/back gestures still correct.
- [ ] Fonts render (Tajawal for Arabic).

## Responsiveness
- [ ] Phone portrait, tablet, and notch/safe-area insets look correct.
