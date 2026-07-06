import type { CapacitorConfig } from '@capacitor/cli';

// The Vwelfare platform is a server-rendered Next.js app (API routes, middleware,
// SSR auth). Rather than statically exporting it — which would change the platform
// — the native shell loads the live, deployed web platform inside a native WebView.
//
// Point this at your deployment by setting CAP_SERVER_URL, otherwise it defaults
// to the production URL used by the rest of the project.
const serverUrl = process.env.CAP_SERVER_URL || 'https://vwelfare.vercel.app';

const config: CapacitorConfig = {
  appId: 'com.vwelfare.app',
  appName: 'V Welfare',
  // Local fallback assets (splash/offline page). The app actually renders the
  // remote platform via `server.url` below.
  webDir: 'www',
  server: {
    url: serverUrl,
    // Only the platform's own origin is treated as in-app navigation; everything
    // else (external links) opens in the system browser.
    allowNavigation: [
      'vwelfare.vercel.app',
      '*.vwelfare.vercel.app',
      'wyzezyctpvlohuuhzyof.supabase.co',
      '*.supabase.co',
    ],
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#12273C',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
