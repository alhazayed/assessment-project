import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Generate a cryptographic nonce for CSP.
  // NOTE: middleware runs on the Edge Runtime, where Node's `crypto` module
  // (randomBytes) is unavailable and throws MIDDLEWARE_INVOCATION_FAILED at
  // runtime. Use the globally-available Web Crypto API instead.
  const nonceBytes = crypto.getRandomValues(new Uint8Array(16))
  const nonce = btoa(Array.from(nonceBytes, (b) => String.fromCharCode(b)).join(''))

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

  const pathname = request.nextUrl.pathname
  const isAdminLogin = pathname === '/x/control/login'
  const isAdminArea = pathname.startsWith('/x/control') && !isAdminLogin
  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password')

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
    pathname.startsWith('/clinician') ||
    pathname.startsWith('/patient') ||
    pathname.startsWith('/admin')

  const needsAuthCheck = isAdminArea || isPrivateRoute || isAuthPage
  let user: { id: string } | null = null

  if (needsAuthCheck) {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    user = authUser
  }
  // Admin area requires Supabase auth (admin PIN verified per-page via requireAdmin)
  if (isAdminArea && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/x/control/login'
    return NextResponse.redirect(url)
  }

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

  // CSP: scripts are nonce-locked (strict); styles allow inline (see note below)
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://challenges.cloudflare.com`,
    // Inline style attributes (React `style={{}}`, Next.js <Image fill>) cannot
    // carry a nonce — a nonce only authorizes <style> elements, not style="".
    // Keeping a nonce here (with no 'unsafe-inline') blocks every inline style
    // app-wide, collapsing layouts (e.g. logos render at natural size). Scripts
    // remain nonce-protected above; styles allow 'unsafe-inline' (low XSS risk).
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
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
