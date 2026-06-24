/**
 * Deep link handler unit tests.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

// We test the URL parsing logic directly
function handleDeepLink(url: string): string | null {
  try {
    const parsed = new URL(url)

    if (parsed.protocol === 'vwelfare:') {
      const path = parsed.pathname || parsed.hostname
      const search = parsed.search
      return `/${path.replace(/^\//, '')}${search}`
    }

    if (parsed.hostname === 'vwelfare.vercel.app') {
      return `${parsed.pathname}${parsed.search}`
    }
  } catch {
    // Ignore malformed URLs
  }
  return null
}

describe('Deep link URL parsing', () => {
  test('parses custom scheme password reset link', () => {
    const result = handleDeepLink('vwelfare://reset-password?token=abc123')
    assert.equal(result, '/reset-password?token=abc123')
  })

  test('parses custom scheme login link', () => {
    const result = handleDeepLink('vwelfare://login')
    assert.equal(result, '/login')
  })

  test('parses universal link from production domain', () => {
    const result = handleDeepLink('https://vwelfare.vercel.app/dashboard')
    assert.equal(result, '/dashboard')
  })

  test('parses universal link with query params', () => {
    const result = handleDeepLink('https://vwelfare.vercel.app/reset-password?token=xyz')
    assert.equal(result, '/reset-password?token=xyz')
  })

  test('ignores links from unknown domains', () => {
    const result = handleDeepLink('https://evil.example.com/dashboard')
    assert.equal(result, null)
  })

  test('handles malformed URL gracefully', () => {
    const result = handleDeepLink('not-a-url')
    assert.equal(result, null)
  })
})
