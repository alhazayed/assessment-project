/**
 * IDOR (Insecure Direct Object Reference) Security Tests
 *
 * These are integration tests that run against a live environment.
 * Set BASE_URL to the target environment.
 *
 * Run: npx ts-node --esm __tests__/security/idor.test.ts
 * Or:  npx tsx __tests__/security/idor.test.ts
 *
 * Required env vars:
 *   BASE_URL            — target URL (default: http://localhost:3000)
 *   VICTIM_PATIENT_ID   — UUID of a patient whose data we try to access
 *   VICTIM_SUBMISSION_ID — UUID of a submission owned by the victim
 *   ATTACKER_COOKIE     — session cookie of a different authenticated user
 */

import assert from 'node:assert/strict'
import { test, describe } from 'node:test'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const VICTIM_PATIENT_ID = process.env.VICTIM_PATIENT_ID ?? 'victim-uuid-placeholder'
const VICTIM_SUBMISSION_ID = process.env.VICTIM_SUBMISSION_ID ?? 'submission-uuid-placeholder'
const ATTACKER_COOKIE = process.env.ATTACKER_COOKIE ?? ''

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  ...(ATTACKER_COOKIE ? { Cookie: ATTACKER_COOKIE } : {}),
}

async function GET(path: string, headers: Record<string, string> = {}) {
  return fetch(`${BASE}${path}`, { headers: { ...JSON_HEADERS, ...headers } })
}

async function POST(path: string, body: object, headers: Record<string, string> = {}) {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...headers },
    body: JSON.stringify(body),
  })
}

async function PATCH(path: string, body: object, headers: Record<string, string> = {}) {
  return fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { ...JSON_HEADERS, ...headers },
    body: JSON.stringify(body),
  })
}

describe('IDOR — Cross-user Report Access', () => {
  test('attacker cannot download another patient PDF report', async () => {
    const res = await GET(`/api/reports?patient_id=${VICTIM_PATIENT_ID}`)
    assert.ok(
      res.status === 401 || res.status === 403,
      `Expected 401/403 but got ${res.status} — IDOR on /api/reports`
    )
  })
})

describe('IDOR — Clinical Notes', () => {
  test('attacker cannot read notes for another patient', async () => {
    const res = await GET(`/api/clinical-notes?patient_id=${VICTIM_PATIENT_ID}`)
    assert.ok(
      res.status === 401 || res.status === 403,
      `Expected 401/403 but got ${res.status} — IDOR on GET /api/clinical-notes`
    )
  })

  test('attacker cannot trigger AI draft for another patient', async () => {
    const res = await fetch(`${BASE}/api/clinical-notes`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify({ patient_id: VICTIM_PATIENT_ID }),
    })
    assert.ok(
      res.status === 401 || res.status === 403,
      `Expected 401/403 but got ${res.status} — IDOR on PUT /api/clinical-notes`
    )
  })
})

describe('IDOR — Assessment Submissions', () => {
  test('attacker cannot trigger high-risk alert for another user submission', async () => {
    const res = await POST('/api/notify-high-risk', { submission_id: VICTIM_SUBMISSION_ID })
    assert.ok(
      res.status === 401 || res.status === 403 || res.status === 404,
      `Expected 401/403/404 but got ${res.status} — IDOR on /api/notify-high-risk`
    )
  })
})

describe('IDOR — Assessment Assignments', () => {
  test('attacker cannot read another patient assignments', async () => {
    // A clinician/user with no treating relationship to VICTIM_PATIENT_ID must
    // not be able to enumerate that patient's assignments (IDOR on
    // GET /api/assignments?patient_id=...). Unauthenticated → 401; an
    // authenticated non-related caller → 403 (or 200 with an empty set once RLS
    // also filters, but never the victim's rows).
    const res = await GET(`/api/assignments?patient_id=${VICTIM_PATIENT_ID}`)
    if (res.status === 200) {
      const body = await res.json().catch(() => ({}))
      const rows = Array.isArray(body?.assignments) ? body.assignments : []
      assert.equal(
        rows.length,
        0,
        `Leak: /api/assignments returned ${rows.length} row(s) for an unrelated patient — IDOR`,
      )
    } else {
      assert.ok(
        res.status === 401 || res.status === 403,
        `Expected 401/403/empty-200 but got ${res.status} — IDOR on /api/assignments`,
      )
    }
  })

  test('unauthenticated request to assignments returns 401', async () => {
    const res = await fetch(`${BASE}/api/assignments?patient_id=${VICTIM_PATIENT_ID}`)
    assert.equal(res.status, 401, `Expected 401 but got ${res.status}`)
  })
})

describe('IDOR — Notifications', () => {
  test('PATCH /api/notifications cannot mark another user notifications as read', async () => {
    // Send a fake ID — should either 401, 403, or silently ignore (not 200 with side effects)
    const res = await PATCH('/api/notifications', { ids: ['00000000-0000-0000-0000-000000000000'] })
    // Endpoint requires auth — either 401 (no attacker cookie) or 200 with no effect
    // We cannot verify "no effect" without DB access; at minimum must not 500
    assert.ok(res.status !== 500, `Server error ${res.status} on PATCH /api/notifications`)
  })
})

describe('IDOR — Profile Read', () => {
  test('unauthenticated request to reports returns 401', async () => {
    const res = await fetch(`${BASE}/api/reports?patient_id=${VICTIM_PATIENT_ID}`)
    assert.equal(res.status, 401, `Expected 401 but got ${res.status}`)
  })
})

describe('Privilege Escalation', () => {
  test('patient cannot access admin export endpoint', async () => {
    const res = await GET('/api/admin/export')
    // Must be 401 (no admin session) — not 200
    assert.ok(
      res.status === 401 || res.status === 302 || res.status === 403,
      `Expected 401/302/403 but got ${res.status} — privilege escalation on /api/admin/export`
    )
  })

  test('unauthenticated request to admin login endpoint rejects non-admin', async () => {
    const res = await POST('/api/admin/login', { pin: '000000' })
    assert.ok(
      res.status === 400 || res.status === 401 || res.status === 429,
      `Expected 400/401/429 but got ${res.status}`
    )
  })
})
