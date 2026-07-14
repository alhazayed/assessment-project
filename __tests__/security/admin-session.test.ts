/**
 * Admin-session (HMAC) enforcement — integration tests for /api/assignments.
 *
 * Regression coverage for the Phase 1 finding: admin/superadmin assignment
 * operations must require BOTH an authenticated admin Supabase session AND a
 * valid HMAC `admin_session` cookie (verifyAdminSession). An admin role on the
 * Supabase session alone must NOT be sufficient.
 *
 * These are live integration tests (same style as idor.test.ts). They self-skip
 * when the required cookies aren't provided, so the suite stays green in
 * credential-less CI; set the env vars against a running target to actually
 * exercise the endpoint.
 *
 * Run: npx tsx --test __tests__/security/admin-session.test.ts
 *
 * Env vars:
 *   BASE_URL              — target URL (default http://localhost:3000)
 *   ADMIN_NO_HMAC_COOKIE  — Cookie header for an admin-role user WITHOUT a valid
 *                           admin_session HMAC (Supabase auth cookies only)
 *   ADMIN_FULL_COOKIE     — Cookie header for an admin-role user WITH a valid
 *                           admin_session HMAC
 *   TARGET_PATIENT_ID     — a patient UUID to query / assign to
 *   TEST_DEFINITION_ID    — an assessment_definitions UUID (POST body)
 */

import assert from 'node:assert/strict'
import { test, describe } from 'node:test'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const ADMIN_NO_HMAC_COOKIE = process.env.ADMIN_NO_HMAC_COOKIE ?? ''
const ADMIN_FULL_COOKIE = process.env.ADMIN_FULL_COOKIE ?? ''
const TARGET_PATIENT_ID = process.env.TARGET_PATIENT_ID ?? ''
const TEST_DEFINITION_ID = process.env.TEST_DEFINITION_ID ?? ''

function reason(...vars: Array<[string, string]>): string | false {
  const missing = vars.filter(([, v]) => !v).map(([k]) => k)
  return missing.length ? `set ${missing.join(', ')} to run this test` : false
}

async function getAssignments(cookie: string, patientId: string) {
  return fetch(`${BASE}/api/assignments?patient_id=${patientId}`, {
    headers: { Cookie: cookie },
  })
}

async function postAssignment(cookie: string, patientId: string, definitionId: string) {
  return fetch(`${BASE}/api/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ patient_id: patientId, definition_id: definitionId }),
  })
}

describe('admin_session enforcement — GET /api/assignments', () => {
  test(
    'admin role WITHOUT admin_session → Unauthorized',
    { skip: reason(['ADMIN_NO_HMAC_COOKIE', ADMIN_NO_HMAC_COOKIE], ['TARGET_PATIENT_ID', TARGET_PATIENT_ID]) },
    async () => {
      const res = await getAssignments(ADMIN_NO_HMAC_COOKIE, TARGET_PATIENT_ID)
      assert.equal(
        res.status,
        401,
        `Admin role without a valid admin_session must be 401 on GET, got ${res.status}`,
      )
    },
  )

  test(
    'admin WITH valid admin_session → works normally',
    { skip: reason(['ADMIN_FULL_COOKIE', ADMIN_FULL_COOKIE], ['TARGET_PATIENT_ID', TARGET_PATIENT_ID]) },
    async () => {
      const res = await getAssignments(ADMIN_FULL_COOKIE, TARGET_PATIENT_ID)
      assert.ok(
        res.status !== 401 && res.status !== 403,
        `Admin with a valid admin_session must not be denied on GET, got ${res.status}`,
      )
      assert.equal(res.status, 200, `Expected 200 for a valid admin GET, got ${res.status}`)
    },
  )
})

describe('admin_session enforcement — POST /api/assignments', () => {
  test(
    'admin role WITHOUT admin_session → Unauthorized',
    { skip: reason(['ADMIN_NO_HMAC_COOKIE', ADMIN_NO_HMAC_COOKIE], ['TARGET_PATIENT_ID', TARGET_PATIENT_ID], ['TEST_DEFINITION_ID', TEST_DEFINITION_ID]) },
    async () => {
      const res = await postAssignment(ADMIN_NO_HMAC_COOKIE, TARGET_PATIENT_ID, TEST_DEFINITION_ID)
      assert.equal(
        res.status,
        401,
        `Admin role without a valid admin_session must be 401 on POST, got ${res.status}`,
      )
    },
  )

  test(
    'admin WITH valid admin_session → authorization passes',
    { skip: reason(['ADMIN_FULL_COOKIE', ADMIN_FULL_COOKIE], ['TARGET_PATIENT_ID', TARGET_PATIENT_ID], ['TEST_DEFINITION_ID', TEST_DEFINITION_ID]) },
    async () => {
      const res = await postAssignment(ADMIN_FULL_COOKIE, TARGET_PATIENT_ID, TEST_DEFINITION_ID)
      // A valid admin session must clear the auth gate. The request may then
      // succeed (200), hit the hourly rate limit (429), or fail validation
      // (400) — but it must never be rejected as Unauthorized/Forbidden.
      assert.ok(
        res.status !== 401 && res.status !== 403,
        `Admin with a valid admin_session must clear the auth gate on POST, got ${res.status}`,
      )
    },
  )
})
