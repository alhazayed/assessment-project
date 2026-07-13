/** Restrict password-reset redirects to the configured site origin. */
export function isAllowedRedirectUrl(url: string): boolean {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl || typeof url !== 'string' || url.length > 2048) return false
  try {
    const target = new URL(url)
    const allowed = new URL(siteUrl)
    return target.origin === allowed.origin && target.protocol === 'https:'
  } catch {
    return false
  }
}
