const IP_RE = /^[\d.:a-fA-F]{2,45}$/

/**
 * The caller's IP address, for rate-limit keys and audit entries.
 *
 * On Vercel, `x-real-ip` and `x-forwarded-for` are written by the platform
 * edge and any client-sent value is overwritten, so they can be trusted.
 * `cf-connecting-ip` is NOT read: there is no Cloudflare proxy in front of the
 * app, so that header is whatever the client chose to send, and keying a rate
 * limit on it let an attacker reset the limit on every request.
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp && IP_RE.test(realIp)) return realIp

  const first = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (first && IP_RE.test(first)) return first

  return 'unknown'
}
