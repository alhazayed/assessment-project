/**
 * Server-side detection of requests coming from the Capacitor native app.
 *
 * The native shell appends a stable token to its WebView User-Agent
 * (`appendUserAgent` in capacitor/capacitor.config.ts). Because we control that
 * string, checking for it on the server is a reliable way to identify our own
 * app on every request — used by middleware and server components to keep admin
 * surfaces out of the mobile app (defense in depth; admin also requires an
 * admin PIN that mobile users never have).
 *
 * This is intentionally not a security boundary on its own — a determined user
 * controls their own device and UA. It hardens the app UX and, combined with
 * the existing Supabase-auth + admin-PIN checks, ensures admin features are not
 * surfaced or reachable through the shipped mobile app.
 */

export const MOBILE_APP_UA_TOKEN = 'VWelfareApp'

export function isMobileAppUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false
  return userAgent.includes(MOBILE_APP_UA_TOKEN)
}
