/**
 * Handles vwelfare:// auth deep links (password recovery / email confirm).
 * Supports both PKCE (?code=) and implicit (#access_token=) Supabase redirect formats.
 */
import * as Linking from 'expo-linking'
import { supabase } from './supabase'

function parseHashParams(url: string): Record<string, string> {
  const hashIndex = url.indexOf('#')
  if (hashIndex === -1) return {}
  const hash = url.slice(hashIndex + 1)
  const params: Record<string, string> = {}
  for (const part of hash.split('&')) {
    const [k, v] = part.split('=')
    if (k && v) params[decodeURIComponent(k)] = decodeURIComponent(v)
  }
  return params
}

export async function handleAuthDeepLink(url: string | null): Promise<'recovery' | 'session' | null> {
  if (!url) return null

  try {
    const parsed = Linking.parse(url)
    const query = (parsed.queryParams ?? {}) as Record<string, string | undefined>

    // PKCE flow
    if (query.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(query.code)
      if (error) {
        console.error('[auth-deep-link] exchangeCodeForSession failed:', error.message)
        return null
      }
      return query.type === 'recovery' ? 'recovery' : 'session'
    }

    // Implicit / fragment tokens
    const hash = parseHashParams(url)
    const accessToken = hash.access_token
    const refreshToken = hash.refresh_token
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (error) {
        console.error('[auth-deep-link] setSession failed:', error.message)
        return null
      }
      return hash.type === 'recovery' || query.type === 'recovery' ? 'recovery' : 'session'
    }

    return null
  } catch (err) {
    console.error('[auth-deep-link] unexpected error:', err)
    return null
  }
}
