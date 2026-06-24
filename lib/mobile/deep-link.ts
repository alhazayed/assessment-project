'use client'

/**
 * Deep link handler for Capacitor.
 *
 * Handles incoming URLs on native platforms:
 *  - vwelfare://reset-password?token=...  → /reset-password?token=...
 *  - vwelfare://login                     → /login
 *  - https://vwelfare.vercel.app/...      → same path on native
 *
 * Call initDeepLinkHandler() once at app startup (in a 'use client' component).
 */

import { isNative } from './platform'

type RouterPush = (path: string) => void

export function initDeepLinkHandler(push: RouterPush): (() => void) | undefined {
  if (!isNative()) return undefined

  let cleanup: (() => void) | undefined

  import('@capacitor/app').then(({ App }) => {
    const listener = App.addListener('appUrlOpen', (event: { url: string }) => {
      handleDeepLink(event.url, push)
    })

    // Resolve the promise and store cleanup
    listener.then(handle => {
      cleanup = () => handle.remove()
    })
  })

  return () => cleanup?.()
}

function handleDeepLink(url: string, push: RouterPush) {
  try {
    // Support both custom scheme and universal links
    const parsed = new URL(url)

    // Custom scheme: vwelfare://path?query
    if (parsed.protocol === 'vwelfare:') {
      const path = parsed.pathname || parsed.hostname // hostname catches vwelfare://reset-password
      const search = parsed.search
      push(`/${path.replace(/^\//, '')}${search}`)
      return
    }

    // Universal link: https://vwelfare.vercel.app/path?query
    if (parsed.hostname === 'vwelfare.vercel.app') {
      push(`${parsed.pathname}${parsed.search}`)
      return
    }
  } catch {
    // Ignore malformed URLs
  }
}

/**
 * Generates a Supabase-compatible redirect URL for the current platform.
 * On native: returns vwelfare://reset-password (handled by deep link handler)
 * On web: returns the standard HTTPS URL
 */
export function getAuthRedirectUrl(path: string): string {
  if (isNative()) {
    return `vwelfare://${path.replace(/^\//, '')}`
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vwelfare.vercel.app'
  return `${base}${path.startsWith('/') ? path : '/' + path}`
}
