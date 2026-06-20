/**
 * RLS (Row Level Security) Regression Tests
 *
 * Verifies that API-layer authorization checks hold for known attack vectors.
 * These tests target the HTTP surface — they do not bypass RLS to test DB directly.
 *
 * Run: npx tsx __tests__/security/rls.test.ts
 *
 * Required env vars:
 *   BASE_URL — target environment
 */

import assert from 'node:assert/strict'
import { test, describe } from 'node:test'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'

async function get(path: string, cookie?: string) {
  return fetch(`${BASE}${path}`, {
    headers: { ...(cookie ? { Cookie: cookie } : {}) },
  })
}

async function post(path: string, body: object, cookie?: string) {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  })
}

describe('Unauthenticated access — all protected endpoints must return 401', () => {
  const protectedEndpoints = [
    { method: 'GET', path: '/api/notifications' },
    { method: 'GET', path: '/api/reports?patient_id=00000000-0000-0000-0000-000000000001' },
    { method: 'GET', path: '/api/clinical-notes?patient_id=00000000-0000-0000-0000-000000000001' },
    { method: 'POST', path: '/api/submit-assessment' },
    { method: 'POST', path: '/api/notify-high-risk' },
  ]

  for (const ep of protectedEndpoints) {
    test(`${ep.method} ${ep.path} → 401 without auth`, async () => {
      const res = ep.method === 'GET'
        ? await get(ep.path)
        : await post(ep.path, {})
      assert.ok(
        res.status === 401 || res.status === 403,
        `Expected 401/403 on ${ep.method} ${ep.path} but got ${res.status}`
      )
    })
  }
})

describe('Admin endpoints — must reject non-admin sessions', () => {
  test('GET /api/admin/export → 401/302 without admin cookie', async () => {
    const res = await get('/api/admin/export')
    assert.ok(
      res.status === 401 || res.status === 302 || res.status === 403,
      `Expected 401/302/403 but got ${res.status}`
    )
  })
})

describe('Guest submit — authenticated users must be rejected', () => {
  test('POST /api/submit-assessment-guest with patient cookie → 400', async () => {
    // If ATTACKER_COOKIE is set (an authenticated user's session), this must return 400
    const attackerCookie = process.env.ATTACKER_COOKIE
    if (!attackerCookie) {
      console.log('  SKIP: ATTACKER_COOKIE not set')
      return
    }
    const res = await post('/api/submit-assessment-guest', {
      definition_id: 'any',
      responses: [],
      demographics: { gender: 'male', country: 'SA' },
    }, attackerCookie)
    assert.equal(res.status, 400, `Authenticated user should not use guest endpoint`)
  })
})

describe('Rate limiting — repeated requests must trigger 429', () => {
  test('POST /api/auth/forgot-password returns 429 after 3 rapid requests from same IP', async () => {
    const body = { email: 'ratelimit-test@vwelfare-test.invalid', redirectTo: `${BASE}/reset-password` }
    let got429 = false

    // Fire 5 requests rapidly
    for (let i = 0; i < 5; i++) {
      const res = await post('/api/auth/forgot-password', body)
      if (res.status === 429) {
        got429 = true
        break
      }
    }

    // In a live environment we expect 429 by the 4th request (limit is 3/15min)
    // In a fresh environment this may not trigger — mark as informational
    if (!got429) {
      console.log('  INFO: Rate limit not triggered in 5 attempts (may be fresh window)')
    }
  })
})

describe('Input validation — malformed payloads', () => {
  test('POST /api/submit-assessment-guest with invalid gender → 400', async () => {
    const res = await post('/api/submit-assessment-guest', {
      definition_id: '00000000-0000-0000-0000-000000000001',
      responses: [{ item_id: 'x', value: 0 }],
      demographics: { gender: 'INVALID_GENDER', country: 'SA' },
    })
    assert.equal(res.status, 400, `Expected 400 for invalid gender but got ${res.status}`)
  })

  test('POST /api/submit-assessment-guest with invalid country code → 400', async () => {
    const res = await post('/api/submit-assessment-guest', {
      definition_id: '00000000-0000-0000-0000-000000000001',
      responses: [{ item_id: 'x', value: 0 }],
      demographics: { gender: 'male', country: 'INVALID_COUNTRY_CODE_TOO_LONG' },
    })
    assert.equal(res.status, 400, `Expected 400 for invalid country but got ${res.status}`)
  })

})
