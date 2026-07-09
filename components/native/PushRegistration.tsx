'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isNativeApp, getNativePlatform } from '@/lib/capacitor/client'
import { secureSet } from '@/lib/capacitor/secure-storage'

const PUSH_TOKEN_KEY = 'vw_push_token'

/**
 * Registers the device for push notifications when running in the native app,
 * and forwards the token to the existing backend (`/api/user/push-token`, which
 * upserts into the `push_tokens` table under the authenticated user via cookie
 * auth). No-op in the browser.
 *
 * Mounted inside the authenticated app layout so a Supabase session cookie is
 * already present when we POST the token. Notification taps route the user to
 * the `url` carried in the notification payload.
 */
export default function PushRegistration() {
  const router = useRouter()

  useEffect(() => {
    if (!isNativeApp()) return

    const removers: Array<() => void> = []
    let cancelled = false

    ;(async () => {
      let PushNotifications
      try {
        ;({ PushNotifications } = await import('@capacitor/push-notifications'))
      } catch {
        return
      }

      const platform = getNativePlatform() // 'ios' | 'android'

      try {
        let perm = await PushNotifications.checkPermissions()
        if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
          perm = await PushNotifications.requestPermissions()
        }
        if (perm.receive !== 'granted') return

        const registration = await PushNotifications.addListener(
          'registration',
          async (token) => {
            try {
              await secureSet(PUSH_TOKEN_KEY, token.value)
              await fetch('/api/user/push-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ token: token.value, platform }),
              })
            } catch {
              /* token will be retried on next app launch */
            }
          },
        )
        removers.push(() => registration.remove())

        const regError = await PushNotifications.addListener(
          'registrationError',
          (err) => console.error('push registration error:', err),
        )
        removers.push(() => regError.remove())

        const tapped = await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (action) => {
            const url = action.notification?.data?.url
            if (typeof url === 'string' && url.startsWith('/')) {
              router.push(url)
            }
          },
        )
        removers.push(() => tapped.remove())

        if (!cancelled) await PushNotifications.register()
      } catch (e) {
        console.error('push setup failed:', e)
      }
    })()

    return () => {
      cancelled = true
      removers.forEach((remove) => remove())
    }
  }, [router])

  return null
}
