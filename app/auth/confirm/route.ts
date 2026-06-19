import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vwelfare.vercel.app'

  function makeRedirectUrl(pathname: string, errorMsg?: string) {
    const url = new URL(siteUrl)
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
          setAll(cookiesToSet) {
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
    if (error) return NextResponse.redirect(makeRedirectUrl('/login', 'verification_failed'))
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
  if (error) return NextResponse.redirect(makeRedirectUrl('/login', 'verification_failed'))
  return response   // carries the session cookies
}
