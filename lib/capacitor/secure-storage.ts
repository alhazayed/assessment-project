'use client'

import { isNativeApp } from './client'

/**
 * Secure, app-managed key/value storage.
 *
 * The primary Supabase session stays in the proven cookie-based SSR flow
 * (@supabase/ssr) — those cookies are already Secure/httpOnly and, inside the
 * native WebView, live in the app's OS-sandboxed, encrypted-at-rest cookie
 * store. This wrapper is for *app-managed* values we want in the hardware-backed
 * keystore rather than cookies/localStorage: the push token and the
 * "this session is the mobile app" marker.
 *
 * On native it uses `capacitor-secure-storage-plugin` (Android Keystore /
 * iOS Keychain). On the web (or SSR) it degrades gracefully to `localStorage`
 * so calling code never has to branch. The dynamic import keeps the native
 * plugin out of the server bundle.
 */

async function nativeStore() {
  const mod = await import('capacitor-secure-storage-plugin')
  return mod.SecureStoragePlugin
}

export async function secureSet(key: string, value: string): Promise<void> {
  if (isNativeApp()) {
    const store = await nativeStore()
    await store.set({ key, value })
    return
  }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      /* storage unavailable (private mode / SSR) — ignore */
    }
  }
}

export async function secureGet(key: string): Promise<string | null> {
  if (isNativeApp()) {
    const store = await nativeStore()
    try {
      const { value } = await store.get({ key })
      return value ?? null
    } catch {
      // plugin throws when the key is absent
      return null
    }
  }
  if (typeof window !== 'undefined') {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  }
  return null
}

export async function secureRemove(key: string): Promise<void> {
  if (isNativeApp()) {
    const store = await nativeStore()
    try {
      await store.remove({ key })
    } catch {
      /* already absent */
    }
    return
  }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  }
}
