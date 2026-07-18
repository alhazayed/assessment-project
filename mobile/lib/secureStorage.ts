/**
 * Chunked SecureStore adapter for Supabase auth persistence.
 *
 * Why: expo-secure-store rejects values larger than 2048 bytes, and a Supabase
 * session (access JWT + refresh token + user) routinely exceeds that. This
 * adapter transparently splits values into sub-limit chunks stored under
 * derived keys, and transparently MIGRATES any session previously persisted in
 * AsyncStorage (the old, insecure backend) on first read — so existing users
 * are NOT logged out by the upgrade.
 *
 * This module is intentionally dependency-free (the real SecureStore /
 * AsyncStorage backends are injected by lib/supabase.ts) so its logic can be
 * unit-tested without a React Native runtime.
 */

export interface SecureBackend {
  getItemAsync(key: string): Promise<string | null>
  setItemAsync(key: string, value: string): Promise<void>
  deleteItemAsync(key: string): Promise<void>
}

/** Legacy AsyncStorage-shaped backend, used only for one-time migration. */
export interface LegacyBackend {
  getItem(key: string): Promise<string | null>
  removeItem(key: string): Promise<void>
}

/** The storage contract Supabase's auth client expects. */
export interface SupabaseStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

// Stay comfortably under the 2048-byte SecureStore limit (UTF-8 headroom).
const DEFAULT_CHUNK_SIZE = 1800

const metaKey = (key: string) => `${key}.__chunks__`
const chunkKey = (key: string, i: number) => `${key}.__c${i}__`

export function createChunkedSecureStore(opts: {
  secure: SecureBackend
  legacy?: LegacyBackend
  chunkSize?: number
}): SupabaseStorage {
  const { secure, legacy } = opts
  const chunkSize = opts.chunkSize && opts.chunkSize > 0 ? opts.chunkSize : DEFAULT_CHUNK_SIZE

  async function readCount(key: string): Promise<number> {
    const raw = await secure.getItemAsync(metaKey(key))
    const n = raw ? parseInt(raw, 10) : 0
    return Number.isFinite(n) && n > 0 ? n : 0
  }

  async function setItem(key: string, value: string): Promise<void> {
    const prevCount = await readCount(key)
    const count = Math.max(1, Math.ceil(value.length / chunkSize))

    for (let i = 0; i < count; i++) {
      await secure.setItemAsync(chunkKey(key, i), value.slice(i * chunkSize, (i + 1) * chunkSize))
    }
    // Drop any now-stale chunks left over from a previously larger value.
    for (let i = count; i < prevCount; i++) {
      await secure.deleteItemAsync(chunkKey(key, i))
    }
    await secure.setItemAsync(metaKey(key), String(count))

    // If a legacy (AsyncStorage) copy still exists, retire it.
    if (legacy) { try { await legacy.removeItem(key) } catch { /* best-effort */ } }
  }

  async function getItem(key: string): Promise<string | null> {
    const count = await readCount(key)
    if (count > 0) {
      let out = ''
      for (let i = 0; i < count; i++) {
        const part = await secure.getItemAsync(chunkKey(key, i))
        if (part === null) return null // partial/corrupt write — treat as absent
        out += part
      }
      return out
    }

    // One-time migration from the old AsyncStorage persistence.
    if (legacy) {
      const legacyVal = await legacy.getItem(key)
      if (legacyVal !== null) {
        await setItem(key, legacyVal)
        try { await legacy.removeItem(key) } catch { /* best-effort */ }
        return legacyVal
      }
    }
    return null
  }

  async function removeItem(key: string): Promise<void> {
    const count = await readCount(key)
    for (let i = 0; i < count; i++) await secure.deleteItemAsync(chunkKey(key, i))
    await secure.deleteItemAsync(metaKey(key))
    if (legacy) { try { await legacy.removeItem(key) } catch { /* best-effort */ } }
  }

  return { getItem, setItem, removeItem }
}
