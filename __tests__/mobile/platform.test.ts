/**
 * Platform detection unit tests.
 * These run in Node / jsdom — they verify the detection logic
 * without requiring a real Capacitor runtime.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

// Minimal mock of the Capacitor global
function mockCapacitor(platform: string | null) {
  const w = global as unknown as Record<string, unknown>
  if (platform === null) {
    delete w.Capacitor
  } else {
    w.Capacitor = {
      isNativePlatform: () => platform !== 'web',
      getPlatform: () => platform,
    }
  }
}

describe('Platform detection', () => {
  test('isNative returns false when Capacitor is absent', async () => {
    mockCapacitor(null)
    const { isNative } = await import('../../lib/mobile/platform')
    assert.equal(isNative(), false)
  })

  test('isNative returns false on web platform', async () => {
    mockCapacitor('web')
    // Re-import with fresh module (Node test runner caches modules per test file)
    const { isNative } = await import('../../lib/mobile/platform')
    assert.equal(isNative(), false)
  })

  test('getPlatform returns web when Capacitor absent', async () => {
    mockCapacitor(null)
    const { getPlatform } = await import('../../lib/mobile/platform')
    assert.equal(getPlatform(), 'web')
  })

  test('getPlatform returns ios when Capacitor reports ios', async () => {
    mockCapacitor('ios')
    const { getPlatform } = await import('../../lib/mobile/platform')
    assert.equal(getPlatform(), 'ios')
  })

  test('getPlatform returns android when Capacitor reports android', async () => {
    mockCapacitor('android')
    const { getPlatform } = await import('../../lib/mobile/platform')
    assert.equal(getPlatform(), 'android')
  })
})
