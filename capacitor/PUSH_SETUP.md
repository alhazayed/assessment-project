# Push Notifications Setup

Push is integrated end to end **on the client** and reuses the platform's
existing token backend. What remains is dropping in your FCM/APNs credentials
and (optionally) wiring a server-side sender.

## How it works

1. `components/native/PushRegistration.tsx` (mounted in the authenticated app
   layout) runs only inside the native app. It requests notification
   permission, calls `PushNotifications.register()`, and on the `registration`
   event receives the native device token (FCM on Android, APNs on iOS).
2. It POSTs `{ token, platform }` to **`/api/user/push-token`** (existing
   route), which upserts into the **`push_tokens`** table under the
   authenticated user (RLS: users own their tokens; admins may read for
   broadcast). The token is also cached in the device keystore via
   `lib/capacitor/secure-storage.ts`.
3. Tapping a notification whose data payload has a `url` (e.g. `/messages`)
   deep-links there via the router.

No web-platform schema changes were needed — the `push_tokens` table and route
already existed.

## Android (FCM)

1. Create/opens a Firebase project; add an Android app with package
   `com.vwelfare.app`.
2. Download **`google-services.json`** → place in `capacitor/android/app/`.
   Gradle auto-applies the google-services plugin when the file is present.
3. For server sends, use **FCM HTTP v1** with a Firebase service-account JSON.

## iOS (APNs)

1. In the Apple Developer portal, create an **APNs Auth Key** (`.p8`) — note the
   Key ID and Team ID.
2. In Xcode, add the **Push Notifications** capability (and Background Modes →
   Remote notifications, already declared in Info.plist).
3. If you route iOS through Firebase too, upload the APNs key to the Firebase
   project so FCM can deliver to iOS.

## Sending (server-side, follow-up)

Delivery to native tokens is not the same channel as the previous Expo app; it
goes through **FCM/APNs**. To send, read tokens from `push_tokens` and call
FCM HTTP v1 (Android + optionally iOS via Firebase) or APNs directly (iOS).
This requires the credentials above and is intentionally left unconfigured here
(no secrets committed). Suggested env for a sender:

```
FCM_SERVICE_ACCOUNT_JSON=   # base64 of the Firebase service-account key
APNS_KEY_ID=
APNS_TEAM_ID=
APNS_AUTH_KEY_P8=           # contents of the .p8
```
