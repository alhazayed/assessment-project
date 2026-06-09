import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password')

  // Admin area: must be authenticated (cookie-based admin session is verified in each page/route)
  if (isAdminArea && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/x/control/login'
    return NextResponse.redirect(url)
  }

  // Private routes require Supabase authentication
  const isPrivateRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/journal') ||
    pathname.startsWith('/insights') ||
    pathname.startsWith('/messages') ||
    pathname.startsWith('/onboarding')

  if (!user && isPrivateRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Auth pages redirect logged-in users away
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
