/**
 * Allow-list validation for password-reset redirect targets.
 *
 * Supabase's resetPasswordForEmail embeds `redirectTo` in the reset email. If an
 * attacker can influence it, the reset link (which carries a recovery token)
 * could be pointed at a hostile origin. Only permit our own web origin's
 * /reset-password page or the mobile deep link; otherwise return undefined so
 * Supabase falls back to its configured Site URL.
 */
export function sanitizeResetRedirect(
  redirectTo: unknown,
  siteUrl: string = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.vwelfare.com',
): string | undefined {
  if (typeof redirectTo !== 'string' || redirectTo.length === 0 || redirectTo.length > 512) {
    return undefined
  }

  // Mobile deep link — exact match only.
  if (redirectTo === 'vwelfare://reset-password') return redirectTo

  try {
    const target = new URL(redirectTo)
    const site = new URL(siteUrl)
    if (
      target.protocol === 'https:' &&
      target.host === site.host &&
      target.pathname === '/reset-password'
    ) {
      return target.toString()
    }
  } catch {
    // not a valid absolute URL
  }
  return undefined
}
