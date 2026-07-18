import { useEffect } from 'react'
import { Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from './supabase'
import { establishSessionFromUrl, parseAuthUrl } from './authLinking'

/**
 * Consumes Supabase auth deep links (password recovery / magic links).
 *
 * On both cold start (getInitialURL) and while running (url events), if the
 * incoming URL carries auth material we exchange it for a session. For recovery
 * links we then route to the reset-password screen. UI is unchanged — this is
 * navigation/session glue only.
 */
export function useDeepLinkAuth() {
  const router = useRouter()

  useEffect(() => {
    let active = true

    async function handle(url: string | null) {
      if (!url || !parseAuthUrl(url).hasAuth) return
      const res = await establishSessionFromUrl(url, supabase)
      if (!active) return
      if (res.ok && res.recovery) router.replace('/reset-password')
    }

    Linking.getInitialURL().then(handle).catch(() => {})
    const sub = Linking.addEventListener('url', ({ url }) => { handle(url) })

    return () => { active = false; sub.remove() }
  }, [])
}
