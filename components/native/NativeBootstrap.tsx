'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isNativeApp, getNativePlatform } from '@/lib/capacitor/client'

/**
 * Runs once on the client inside the native app. No-op in a normal browser.
 *
 * - Styles the native status bar to match the brand.
 * - Wires the Android hardware back button to in-app history (and lets the app
 *   background instead of white-screening at the first page).
 *
 * Mounted globally from the root layout. All work is guarded by
 * `isNativeApp()`, and the plugin modules are dynamically imported so they are
 * never pulled into server rendering.
 */
export default function NativeBootstrap() {
  const router = useRouter()

  useEffect(() => {
    if (!isNativeApp()) return

    let removeBackButton: (() => void) | undefined
    let removeAppUrlOpen: (() => void) | undefined

    // Map a deep link (vwelfare://<path> or an app.vwelfare.com URL) to in-app
    // navigation.
    const toInAppPath = (url: string): string | null => {
      if (url.startsWith('vwelfare://')) {
        return '/' + url.slice('vwelfare://'.length).replace(/^\/+/, '')
      }
      try {
        const u = new URL(url)
        if (u.hostname.endsWith('vwelfare.com')) return u.pathname + u.search
      } catch {
        /* not a parseable URL */
      }
      return null
    }

    ;(async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        await StatusBar.setStyle({ style: Style.Dark })
        if (getNativePlatform() === 'android') {
          await StatusBar.setBackgroundColor({ color: '#12273C' })
        }
      } catch {
        /* status bar plugin unavailable — non-fatal */
      }

      try {
        const { App } = await import('@capacitor/app')
        const backHandle = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack && window.history.length > 1) {
            window.history.back()
          } else {
            App.exitApp()
          }
        })
        removeBackButton = () => backHandle.remove()

        const urlHandle = await App.addListener('appUrlOpen', ({ url }) => {
          const path = toInAppPath(url)
          if (path && path.startsWith('/')) router.push(path)
        })
        removeAppUrlOpen = () => urlHandle.remove()
      } catch {
        /* app plugin unavailable — non-fatal */
      }
    })()

    return () => {
      removeBackButton?.()
      removeAppUrlOpen?.()
    }
  }, [router])

  return null
}
