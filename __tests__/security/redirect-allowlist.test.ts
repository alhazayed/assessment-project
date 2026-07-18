/**
 * Redirect allow-list unit tests (P3.2).
 * Run: npx tsx --test __tests__/security/redirect-allowlist.test.ts
 */
import assert from 'node:assert/strict'
import { test, describe } from 'node:test'
import { sanitizeResetRedirect } from '../../lib/security/redirect'

const SITE = 'https://app.vwelfare.com'

describe('sanitizeResetRedirect — allowed targets', () => {
  test('permits the mobile deep link (exact)', () => {
    assert.equal(sanitizeResetRedirect('vwelfare://reset-password', SITE), 'vwelfare://reset-password')
  })
  test('permits our own https origin /reset-password', () => {
    assert.equal(sanitizeResetRedirect('https://app.vwelfare.com/reset-password', SITE), 'https://app.vwelfare.com/reset-password')
  })
})

describe('sanitizeResetRedirect — rejected targets', () => {
  test('rejects a foreign origin (open redirect / token theft)', () => {
    assert.equal(sanitizeResetRedirect('https://evil.example.com/reset-password', SITE), undefined)
  })
  test('rejects look-alike suffix host', () => {
    assert.equal(sanitizeResetRedirect('https://app.vwelfare.com.evil.com/reset-password', SITE), undefined)
  })
  test('rejects wrong path on our origin', () => {
    assert.equal(sanitizeResetRedirect('https://app.vwelfare.com/steal', SITE), undefined)
  })
  test('rejects non-https', () => {
    assert.equal(sanitizeResetRedirect('http://app.vwelfare.com/reset-password', SITE), undefined)
  })
  test('rejects javascript: and non-exact app links', () => {
    assert.equal(sanitizeResetRedirect('javascript:alert(1)', SITE), undefined)
    assert.equal(sanitizeResetRedirect('vwelfare://evil', SITE), undefined)
  })
  test('rejects non-strings, empty, and oversized', () => {
    assert.equal(sanitizeResetRedirect(undefined, SITE), undefined)
    assert.equal(sanitizeResetRedirect(12345 as unknown, SITE), undefined)
    assert.equal(sanitizeResetRedirect('', SITE), undefined)
    assert.equal(sanitizeResetRedirect('https://app.vwelfare.com/reset-password?' + 'a'.repeat(600), SITE), undefined)
  })
})
