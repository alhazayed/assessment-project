import type { CapacitorConfig } from '@capacitor/cli';

// The Vwelfare platform is a server-rendered Next.js app (API routes, middleware,
// SSR auth). Rather than statically exporting it — which would change the platform
// — the native shell loads the live, deployed web platform inside a native WebView.
//
// Point this at your deployment by setting CAP_SERVER_URL, otherwise it defaults
// to the production custom domain.
const serverUrl = process.env.CAP_SERVER_URL || 'https://app.vwelfare.com';

const config: CapacitorConfig = {
  appId: 'com.vwelfare.app',
  appName: 'V Welfare',
  // Local fallback assets (splash/offline page). The app actually renders the
  // remote platform via `server.url` below.
  webDir: 'www',
  // Tag the WebView User-Agent so the platform can recognise its own native app
  // server-side (used to keep admin surfaces out of the mobile app — see
  // lib/capacitor/server.ts and middleware.ts).
  appendUserAgent: 'VWelfareApp',
  server: {
    url: serverUrl,
    // Only the platform's own origin is treated as in-app navigation; everything
    // else (external links) opens in the system browser.
    allowNavigation: [
      'app.vwelfare.com',
      '*.vwelfare.com',
      'wyzezyctpvlohuuhzyof.supabase.co',
      '*.supabase.co',
    ],
    // HTTPS only — never fall back to plaintext HTTP in the WebView.
    cleartext: false,
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      // White to match the logo splash art (assets/splash.png).
      backgroundColor: '#FFFFFF',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    PushNotifications: {
      // Show alert/badge/sound while the app is in the foreground (iOS).
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
