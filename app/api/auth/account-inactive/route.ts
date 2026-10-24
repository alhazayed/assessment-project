import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Ends the session of a deactivated account and sends it to the login page
// with an explanation. Only signs out when the account really is inactive, so
// a link to this URL can't be used to log other people out.
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const origin = new URL(request.url).origin

  if (!user) return NextResponse.redirect(new URL('/login', origin))

  const { data: profile } = await supabase.from('profiles').select('is_active').eq('id', user.id).single()
  if (profile?.is_active !== false) return NextResponse.redirect(new URL('/dashboard', origin))

  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login?error=account_inactive', origin))
}
