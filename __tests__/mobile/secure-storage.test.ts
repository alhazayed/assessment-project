/**
 * Secure storage unit tests (web fallback path).
 *
 * Tests the localStorage fallback that runs on web.
 * The native Keychain/Keystore path is tested via device integration tests.
 */

import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

// Minimal localStorage mock for Node test environment
const store: Record<string, string> = {}
const localStorageMock = {
  getItem:    (k: string) => store[k] ?? null,
  setItem:    (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
  clear:      () => { for (const k in store) delete store[k] },
}

;(global as unknown as Record<string, unknown>).localStorage = localStorageMock
;(global as unknown as Record<string, unknown>).window = global

// Ensure Capacitor is absent (web path)
delete (global as unknown as Record<string, unknown>).Capacitor

describe('Secure storage web fallback', () => {
  beforeEach(() => localStorageMock.clear())
  afterEach(() => localStorageMock.clear())

  test('set and get a value', async () => {
    const { secureSet, secureGet } = await import('../../lib/mobile/secure-storage')
    await secureSet('test_key', 'hello')
    const value = await secureGet('test_key')
    assert.equal(value, 'hello')
  })

  test('returns null for missing key', async () => {
    const { secureGet } = await import('../../lib/mobile/secure-storage')
    const value = await secureGet('missing_key')
    assert.equal(value, null)
  })

  test('removes a key', async () => {
    const { secureSet, secureGet, secureRemove } = await import('../../lib/mobile/secure-storage')
    await secureSet('del_key', 'to_delete')
    await secureRemove('del_key')
    const value = await secureGet('del_key')
    assert.equal(value, null)
  })
})
