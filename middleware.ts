import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { randomBytes } from 'crypto'

export async function middleware(request: NextRequest) {
  // Generate a cryptographic nonce for CSP
  const nonce = randomBytes(16).toString('base64')

  let supabaseResponse = NextResponse.next({ request })

  // Pass nonce to layout via request headers for CSP
  supabaseResponse.headers.set('x-nonce', nonce)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAdminLogin = pathname === '/x/control/login'
  const isAdminArea = pathname.startsWith('/x/control') && !isAdminLogin
  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password')

  // Admin area requires Supabase auth (admin PIN verified per-page via requireAdmin)
  if (isAdminArea && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/x/control/login'
    return NextResponse.redirect(url)
  }

  // Private app routes require Supabase auth
  const isPrivateRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/journal') ||
    pathname.startsWith('/insights') ||
    pathname.startsWith('/messages') ||
    pathname.startsWith('/mood') ||
    pathname.startsWith('/patients') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/assessments') ||
    pathname.startsWith('/packages') ||
    pathname.startsWith('/adhd-zones') ||
    pathname.startsWith('/admin')

  if (!user && isPrivateRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from auth pages
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Security headers on all API responses
  if (pathname.startsWith('/api/')) {
    supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
    supabaseResponse.headers.set('Cache-Control', 'no-store')
    // Prevent API responses from being embedded by other origins
    supabaseResponse.headers.set('X-Frame-Options', 'DENY')
  }

  // Add nonce-based CSP header (replaces unsafe-inline)
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://challenges.cloudflare.com`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://challenges.cloudflare.com",
    "frame-src 'self' https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  supabaseResponse.headers.set('Content-Security-Policy', cspHeader)

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
