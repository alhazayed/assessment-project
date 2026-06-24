'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isNative } from '@/lib/mobile/platform'
import { initDeepLinkHandler } from '@/lib/mobile/deep-link'
import { initBackButtonHandler } from '@/lib/mobile/back-button'

/**
 * CapacitorProvider — bootstraps all native bridge handlers.
 *
 * Mount this once in the root layout (client boundary only).
 * It is a no-op on web.
 */
export default function CapacitorProvider() {
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isNative()) return

    // Deep link handler (magic links, password reset, OAuth callbacks)
    const cleanupDeepLink = initDeepLinkHandler((path: string) => {
      router.push(path)
    })

    // Android hardware back button
    const cleanupBack = initBackButtonHandler(
      () => router.back(),
      () => pathname,
    )

    // Initialise native status bar and splash screen
    Promise.all([
      import('@capacitor/status-bar').then(({ StatusBar, Style }) =>
        StatusBar.setStyle({ style: Style.Default })
      ).catch(() => {}),
      import('@capacitor/splash-screen').then(({ SplashScreen }) =>
        SplashScreen.hide()
      ).catch(() => {}),
    ])

    return () => {
      cleanupDeepLink?.()
      cleanupBack?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
