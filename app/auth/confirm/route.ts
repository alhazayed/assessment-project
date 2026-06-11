import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vwelfare.vercel.app'
  const redirectBase = new URL(siteUrl)

  function redirectTo(pathname: string, errorMsg?: string) {
    redirectBase.pathname = pathname
    redirectBase.searchParams.delete('token_hash')
    redirectBase.searchParams.delete('type')
    redirectBase.searchParams.delete('code')
    redirectBase.searchParams.delete('next')
    if (errorMsg) redirectBase.searchParams.set('error', errorMsg)
    return NextResponse.redirect(redirectBase)
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  // PKCE flow: Supabase redirects here with ?code=... after server-side verification
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return redirectTo('/login', 'verification_failed')
    // New signups → onboarding; recovery → reset-password
    if (next === '/onboarding') return redirectTo('/onboarding')
    if (type === 'recovery') return redirectTo('/reset-password')
    return redirectTo(next !== '/dashboard' ? next : '/onboarding')
  }

  // OTP / token_hash flow (email link goes directly to app)
  if (!token_hash || !type) return redirectTo('/login')

  const { error } = await supabase.auth.verifyOtp({ type, token_hash })
  if (error) return redirectTo('/login', 'verification_failed')

  if (type === 'recovery') return redirectTo('/reset-password')
  return redirectTo(next !== '/dashboard' && next !== '/' ? next : '/onboarding')
}
