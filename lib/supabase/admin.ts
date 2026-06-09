import { createClient as supabaseCreateClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured — set this in your Vercel/local env vars')
  return supabaseCreateClient(url, key, { auth: { persistSession: false } })
}
