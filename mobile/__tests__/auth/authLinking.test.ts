/**
 * Regression tests for Supabase auth deep-link parsing / session establishment.
 * Run: npm run test:auth   (from mobile/)
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseAuthUrl,
  establishSessionFromUrl,
  type AuthClientLike,
} from '../../lib/authLinking.ts'

describe('parseAuthUrl', () => {
  test('extracts a PKCE code from the query string', () => {
    const p = parseAuthUrl('vwelfare://reset-password?code=abc123')
    assert.equal(p.code, 'abc123')
    assert.equal(p.hasAuth, true)
    assert.equal(p.isRecovery, true)
  })

  test('extracts implicit tokens from the URL fragment', () => {
    const p = parseAuthUrl('vwelfare://reset-password#access_token=AAA&refresh_token=BBB&type=recovery')
    assert.equal(p.access_token, 'AAA')
    assert.equal(p.refresh_token, 'BBB')
    assert.equal(p.type, 'recovery')
    assert.equal(p.hasAuth, true)
    assert.equal(p.isRecovery, true)
  })

  test('detects recovery by type even when the path is generic', () => {
    const p = parseAuthUrl('vwelfare://auth-callback?code=xyz&type=recovery')
    assert.equal(p.isRecovery, true)
  })

  test('non-recovery magic link still yields auth but is not recovery', () => {
    const p = parseAuthUrl('vwelfare://auth-callback?code=xyz')
    assert.equal(p.hasAuth, true)
    assert.equal(p.isRecovery, false)
  })

  test('a plain deep link carries no auth material', () => {
    const p = parseAuthUrl('vwelfare://dashboard')
    assert.equal(p.hasAuth, false)
    assert.equal(p.code, null)
  })

  test('access_token without refresh_token is not usable auth', () => {
    const p = parseAuthUrl('vwelfare://reset-password#access_token=AAA')
    assert.equal(p.hasAuth, false)
  })

  test('URL-encoded values are decoded', () => {
    const p = parseAuthUrl('vwelfare://reset-password?code=a%2Bb%2Fc')
    assert.equal(p.code, 'a+b/c')
  })
})

describe('establishSessionFromUrl', () => {
  function clientSpy(overrides: Partial<{ exchangeError: string; setError: string }> = {}) {
    const calls: string[] = []
    const client: AuthClientLike = {
      auth: {
        async exchangeCodeForSession(code) {
          calls.push(`exchange:${code}`)
          return { error: overrides.exchangeError ? { message: overrides.exchangeError } : null }
        },
        async setSession(tokens) {
          calls.push(`setSession:${tokens.access_token}:${tokens.refresh_token}`)
          return { error: overrides.setError ? { message: overrides.setError } : null }
        },
      },
    }
    return { client, calls }
  }

  test('exchanges a PKCE code and flags recovery', async () => {
    const { client, calls } = clientSpy()
    const res = await establishSessionFromUrl('vwelfare://reset-password?code=CODE1', client)
    assert.deepEqual(calls, ['exchange:CODE1'])
    assert.equal(res.ok, true)
    assert.equal(res.recovery, true)
    assert.equal(res.handled, true)
  })

  test('falls back to setSession for implicit tokens', async () => {
    const { client, calls } = clientSpy()
    const res = await establishSessionFromUrl(
      'vwelfare://reset-password#access_token=AT&refresh_token=RT&type=recovery', client)
    assert.deepEqual(calls, ['setSession:AT:RT'])
    assert.equal(res.ok, true)
    assert.equal(res.recovery, true)
  })

  test('ignores a non-auth URL without calling the client', async () => {
    const { client, calls } = clientSpy()
    const res = await establishSessionFromUrl('vwelfare://dashboard', client)
    assert.equal(res.handled, false)
    assert.equal(res.ok, false)
    assert.deepEqual(calls, [])
  })

  test('surfaces an exchange error (e.g. verifier missing / expired)', async () => {
    const { client } = clientSpy({ exchangeError: 'invalid flow state' })
    const res = await establishSessionFromUrl('vwelfare://reset-password?code=BAD', client)
    assert.equal(res.ok, false)
    assert.equal(res.handled, true)
    assert.equal(res.error, 'invalid flow state')
  })
})
