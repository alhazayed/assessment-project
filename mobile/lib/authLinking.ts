/**
 * Supabase auth deep-link handling (pure, RN-free so it is unit-testable).
 *
 * Supports both auth link shapes:
 *   • PKCE:     vwelfare://reset-password?code=<auth_code>
 *   • Implicit: vwelfare://reset-password#access_token=...&refresh_token=...&type=recovery
 *
 * The React Native wiring (Linking listener + router navigation) lives in
 * lib/useDeepLinkAuth.ts, which delegates to these functions.
 */

export interface ParsedAuthUrl {
  code: string | null
  access_token: string | null
  refresh_token: string | null
  type: string | null
  /** True when this link is a password-recovery link. */
  isRecovery: boolean
  /** True when the link actually carries auth material we can consume. */
  hasAuth: boolean
}

function parseParams(segment: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!segment) return out
  for (const pair of segment.split('&')) {
    if (!pair) continue
    const idx = pair.indexOf('=')
    const k = idx === -1 ? pair : pair.slice(0, idx)
    const v = idx === -1 ? '' : pair.slice(idx + 1)
    if (!k) continue
    try { out[decodeURIComponent(k)] = decodeURIComponent(v) }
    catch { out[k] = v }
  }
  return out
}

export function parseAuthUrl(url: string): ParsedAuthUrl {
  const hashIdx = url.indexOf('#')
  const fragment = hashIdx !== -1 ? url.slice(hashIdx + 1) : undefined
  const base = hashIdx !== -1 ? url.slice(0, hashIdx) : url
  const qIdx = base.indexOf('?')
  const query = qIdx !== -1 ? base.slice(qIdx + 1) : undefined

  const q = parseParams(query)
  const f = parseParams(fragment)
  const pick = (k: string): string | null => q[k] ?? f[k] ?? null

  const code = pick('code')
  const access_token = pick('access_token')
  const refresh_token = pick('refresh_token')
  const type = pick('type')

  const isRecovery = type === 'recovery' || base.toLowerCase().includes('reset-password')
  const hasAuth = !!code || (!!access_token && !!refresh_token)

  return { code, access_token, refresh_token, type, isRecovery, hasAuth }
}

/** Minimal slice of the Supabase client this module needs (keeps it testable). */
export interface AuthClientLike {
  auth: {
    exchangeCodeForSession(code: string): Promise<{ error: { message: string } | null }>
    setSession(tokens: { access_token: string; refresh_token: string }): Promise<{ error: { message: string } | null }>
  }
}

export interface EstablishResult {
  /** Session established successfully. */
  ok: boolean
  /** Link was a password-recovery link (caller should route to reset screen). */
  recovery: boolean
  /** We attempted to consume auth material (vs. a non-auth URL we ignored). */
  handled: boolean
  error?: string
}

export async function establishSessionFromUrl(
  url: string,
  client: AuthClientLike,
): Promise<EstablishResult> {
  const parsed = parseAuthUrl(url)
  if (!parsed.hasAuth) {
    return { ok: false, recovery: parsed.isRecovery, handled: false }
  }

  if (parsed.code) {
    const { error } = await client.auth.exchangeCodeForSession(parsed.code)
    return { ok: !error, recovery: parsed.isRecovery, handled: true, error: error?.message }
  }

  const { error } = await client.auth.setSession({
    access_token: parsed.access_token as string,
    refresh_token: parsed.refresh_token as string,
  })
  return { ok: !error, recovery: parsed.isRecovery, handled: true, error: error?.message }
}
