/**
 * Regression tests for the SecureStore auth persistence adapter.
 * Run: npm run test:auth   (from mobile/)  — uses Node's built-in test runner.
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { createChunkedSecureStore, type SecureBackend, type LegacyBackend } from '../../lib/secureStorage.ts'

function memSecure(): SecureBackend & { store: Map<string, string> } {
  const store = new Map<string, string>()
  return {
    store,
    async getItemAsync(k) { return store.has(k) ? store.get(k)! : null },
    async setItemAsync(k, v) {
      if (v.length > 2048) throw new Error(`SecureStore value too large: ${v.length}`) // mirror the real limit
      store.set(k, v)
    },
    async deleteItemAsync(k) { store.delete(k) },
  }
}

function memLegacy(seed: Record<string, string> = {}): LegacyBackend & { store: Map<string, string> } {
  const store = new Map<string, string>(Object.entries(seed))
  return {
    store,
    async getItem(k) { return store.has(k) ? store.get(k)! : null },
    async removeItem(k) { store.delete(k) },
  }
}

const KEY = 'sb-wyzezyctpvlohuuhzyof-auth-token'

describe('createChunkedSecureStore', () => {
  test('round-trips a small value', async () => {
    const secure = memSecure()
    const s = createChunkedSecureStore({ secure })
    await s.setItem(KEY, 'hello')
    assert.equal(await s.getItem(KEY), 'hello')
  })

  test('chunks values larger than the SecureStore 2048-byte limit', async () => {
    const secure = memSecure()
    const s = createChunkedSecureStore({ secure })
    const big = 'x'.repeat(5000) // would throw if written unchunked
    await s.setItem(KEY, big)
    // No single stored chunk exceeds the limit.
    for (const v of secure.store.values()) assert.ok(v.length <= 2048)
    // More than one chunk was written.
    const chunkKeys = [...secure.store.keys()].filter((k) => /\.__c\d/.test(k))
    assert.ok(chunkKeys.length >= 3, `expected multiple chunks, got ${chunkKeys.length}`)
    assert.equal(await s.getItem(KEY), big)
  })

  test('returns null for a key that was never set', async () => {
    const s = createChunkedSecureStore({ secure: memSecure() })
    assert.equal(await s.getItem('missing'), null)
  })

  test('removeItem clears all chunks and metadata', async () => {
    const secure = memSecure()
    const s = createChunkedSecureStore({ secure })
    await s.setItem(KEY, 'y'.repeat(4000))
    await s.removeItem(KEY)
    assert.equal(secure.store.size, 0)
    assert.equal(await s.getItem(KEY), null)
  })

  test('shrinking a value deletes now-stale trailing chunks', async () => {
    const secure = memSecure()
    const s = createChunkedSecureStore({ secure, chunkSize: 10 })
    await s.setItem(KEY, 'a'.repeat(45)) // 5 chunks
    await s.setItem(KEY, 'b'.repeat(12)) // 2 chunks
    const chunkKeys = [...secure.store.keys()].filter((k) => /\.__c\d/.test(k))
    assert.equal(chunkKeys.length, 2, 'stale chunks were not cleaned up')
    assert.equal(await s.getItem(KEY), 'b'.repeat(12))
  })

  test('a partial/corrupt chunk read yields null (not a truncated session)', async () => {
    const secure = memSecure()
    const s = createChunkedSecureStore({ secure, chunkSize: 10 })
    await s.setItem(KEY, 'z'.repeat(30)) // 3 chunks
    secure.store.delete(`${KEY}.__c1__`) // simulate corruption
    assert.equal(await s.getItem(KEY), null)
  })

  describe('AsyncStorage → SecureStore migration (preserves existing sessions)', () => {
    test('migrates a legacy session on first read and retires the legacy copy', async () => {
      const secure = memSecure()
      const legacy = memLegacy({ [KEY]: 'legacy-session-token' })
      const s = createChunkedSecureStore({ secure, legacy })

      const migrated = await s.getItem(KEY)
      assert.equal(migrated, 'legacy-session-token', 'value not returned during migration')
      assert.equal(legacy.store.has(KEY), false, 'legacy copy was not removed')
      // Subsequent reads come from SecureStore even if legacy is now empty.
      assert.equal(await s.getItem(KEY), 'legacy-session-token')
    })

    test('setItem removes any lingering legacy copy', async () => {
      const secure = memSecure()
      const legacy = memLegacy({ [KEY]: 'old' })
      const s = createChunkedSecureStore({ secure, legacy })
      await s.setItem(KEY, 'new')
      assert.equal(legacy.store.has(KEY), false)
      assert.equal(await s.getItem(KEY), 'new')
    })

    test('no legacy value → getItem returns null', async () => {
      const s = createChunkedSecureStore({ secure: memSecure(), legacy: memLegacy() })
      assert.equal(await s.getItem(KEY), null)
    })
  })
})
