import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')

  // Allowlist-based open redirect prevention
  function safeNext(raw: string | null): string {
    if (!raw) return '/dashboard'
    if (/^https?:\/\//i.test(raw) || raw.startsWith('//') || !raw.startsWith('/')) return '/dashboard'
    if (raw.startsWith('/x/control') || raw.startsWith('/api/')) return '/dashboard'
    return raw
  }
  const next = safeNext(searchParams.get('next'))

  // Redirect on the SAME origin that served this request. Session cookies are
  // written for this origin — redirecting to a different host (e.g. a hardcoded
  // production URL while the user verified on a preview/custom domain) drops
  // the session and bounces the user to /login instead of their destination.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https'
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin

  function makeRedirectUrl(pathname: string, errorMsg?: string) {
    const url = new URL(origin)
    url.pathname = pathname
    if (errorMsg) url.searchParams.set('error', errorMsg)
    return url.toString()
  }

  // Helper: create a Supabase client that writes session cookies onto `response`
  function makeSupabase(response: NextResponse) {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options as any)
            })
          },
        },
      }
    )
  }

  // ── PKCE flow: Supabase redirects here with ?code= ──────────────────────
  if (code) {
    const dest = type === 'recovery'
      ? '/reset-password'
      : next !== '/dashboard' ? next : '/onboarding'
    const response = NextResponse.redirect(makeRedirectUrl(dest))
    const supabase = makeSupabase(response)

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      // Token already consumed (email-scanner prefetch, double click, second tab).
      // If the browser already carries a valid session the user IS verified —
      // send them to their destination instead of a false failure screen.
      const { data: { user } } = await supabase.auth.getUser()
      if (user) return NextResponse.redirect(makeRedirectUrl(dest))
      return NextResponse.redirect(makeRedirectUrl('/login', 'verification_failed'))
    }
    return response   // carries the session cookies
  }

  // ── OTP / token_hash flow (email link goes directly here) ────────────────
  if (!token_hash || !type) {
    return NextResponse.redirect(makeRedirectUrl('/login'))
  }

  const dest = type === 'recovery'
    ? '/reset-password'
    : next !== '/dashboard' && next !== '/' ? next : '/onboarding'
  const response = NextResponse.redirect(makeRedirectUrl(dest))
  const supabase = makeSupabase(response)

  const { error } = await supabase.auth.verifyOtp({ type, token_hash })
  if (error) {
    // Same already-consumed-token fallback as the PKCE branch above.
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return NextResponse.redirect(makeRedirectUrl(dest))
    return NextResponse.redirect(makeRedirectUrl('/login', 'verification_failed'))
  }
  return response   // carries the session cookies
}
