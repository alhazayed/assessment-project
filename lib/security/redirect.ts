/**
 * Centralized redirect allow-list for auth flows.
 *
 * Supabase embeds `redirectTo` into password-reset / magic-link emails. If an
 * attacker can influence it, the reset link (which carries a recovery token)
 * could be pointed at a hostile origin. This module is the single place that
 * decides which redirect targets are permitted; every auth entry point that
 * forwards a caller-supplied redirect MUST validate through it.
 *
 * Allowed:
 *   - the mobile deep link `vwelfare://reset-password` (exact match)
 *   - our own https web origin's `/reset-password` page
 * Everything else (foreign origins, non-https, wrong path, junk) is rejected,
 * in which case the caller should fall back to Supabase's configured Site URL.
 */

/** Exact non-http(s) deep links that are always permitted. */
const ALLOWED_APP_LINKS: ReadonlySet<string> = new Set(['vwelfare://reset-password'])

/** Web origins we trust, in addition to NEXT_PUBLIC_SITE_URL. */
function allowedWebOrigins(siteUrl: string): Set<string> {
  const origins = new Set<string>()
  for (const candidate of [siteUrl, process.env.NEXT_PUBLIC_SITE_URL]) {
    if (!candidate) continue
    try { origins.add(new URL(candidate).origin) } catch { /* ignore malformed */ }
  }
  return origins
}

/** Paths a reset redirect may target on an allowed origin. */
const ALLOWED_PATHS: ReadonlySet<string> = new Set(['/reset-password'])

export function sanitizeResetRedirect(
  redirectTo: unknown,
  siteUrl: string = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.vwelfare.com',
): string | undefined {
  if (typeof redirectTo !== 'string' || redirectTo.length === 0 || redirectTo.length > 512) {
    return undefined
  }

  if (ALLOWED_APP_LINKS.has(redirectTo)) return redirectTo

  try {
    const target = new URL(redirectTo)
    if (
      target.protocol === 'https:' &&
      allowedWebOrigins(siteUrl).has(target.origin) &&
      ALLOWED_PATHS.has(target.pathname)
    ) {
      return target.toString()
    }
  } catch {
    // not a valid absolute URL
  }
  return undefined
}
