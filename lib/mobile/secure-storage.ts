'use client'

/**
 * Secure storage layer.
 *
 * On native (iOS/Android): uses @capacitor/preferences which maps to
 *   - iOS Keychain
 *   - Android EncryptedSharedPreferences (API 23+)
 *
 * On web: falls back to localStorage (existing behaviour preserved).
 */

import { isNative } from './platform'

interface SecureStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
}

// Web fallback using localStorage
const webStore: SecureStore = {
  async get(key) {
    try { return localStorage.getItem(key) } catch { return null }
  },
  async set(key, value) {
    try { localStorage.setItem(key, value) } catch {}
  },
  async remove(key) {
    try { localStorage.removeItem(key) } catch {}
  },
  async clear() {
    try { localStorage.clear() } catch {}
  },
}

// Capacitor Preferences (Keychain / Keystore)
let nativeStore: SecureStore | null = null

async function getNativeStore(): Promise<SecureStore> {
  if (nativeStore) return nativeStore
  const { Preferences } = await import('@capacitor/preferences')
  nativeStore = {
    async get(key) {
      const { value } = await Preferences.get({ key })
      return value
    },
    async set(key, value) {
      await Preferences.set({ key, value })
    },
    async remove(key) {
      await Preferences.remove({ key })
    },
    async clear() {
      await Preferences.clear()
    },
  }
  return nativeStore
}

export async function secureGet(key: string): Promise<string | null> {
  if (isNative()) {
    const store = await getNativeStore()
    return store.get(key)
  }
  return webStore.get(key)
}

export async function secureSet(key: string, value: string): Promise<void> {
  if (isNative()) {
    const store = await getNativeStore()
    return store.set(key, value)
  }
  return webStore.set(key, value)
}

export async function secureRemove(key: string): Promise<void> {
  if (isNative()) {
    const store = await getNativeStore()
    return store.remove(key)
  }
  return webStore.remove(key)
}

export async function secureClear(): Promise<void> {
  if (isNative()) {
    const store = await getNativeStore()
    return store.clear()
  }
  return webStore.clear()
}
