import type { SupabaseClient } from '@supabase/supabase-js'

// ~100 years: Supabase Auth has no "ban forever", only a duration.
const PERMANENT_BAN = '876000h'

/**
 * Turns an account's ability to sign in on or off in Supabase Auth.
 *
 * profiles.is_active alone is only a flag: the database now ignores the role
 * of an inactive account, but the user could still sign in and keep a live
 * session. Banning blocks new sign-ins and refresh-token use, so existing
 * sessions end when their access token expires. Unbanning restores access.
 *
 * Needs the service-role client.
 */
export async function setAccountSignInAllowed(db: SupabaseClient, userId: string, allowed: boolean) {
  const { error } = await db.auth.admin.updateUserById(userId, {
    ban_duration: allowed ? 'none' : PERMANENT_BAN,
  })
  if (error) throw error
}
