/**
 * Phase 3 security regression tests (pure units — no deployment needed).
 * Run: npx tsx --test __tests__/security/phase3.test.ts
 *   (or: node --test __tests__/security/phase3.test.ts)
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { isValidPermissionKey } from '../../lib/permissions'
import { ALL_PERMISSION_KEYS } from '../../lib/types'
import { sanitizeResetRedirect } from '../../lib/security/redirect'
import { scrubPHI } from '../../lib/security/anonymizePHI'

describe('P3.4 — canonical permission-key validator', () => {
  test('accepts every canonical key (matches DB CHECK constraint)', () => {
    for (const k of ALL_PERMISSION_KEYS) assert.equal(isValidPermissionKey(k), true, `rejected canonical key ${k}`)
    assert.equal(ALL_PERMISSION_KEYS.length, 10)
  })

  test('rejects the old, non-canonical keys that the DB would refuse', () => {
    for (const bad of ['view_clinical_notes', 'view_crisis_history', 'export_patient_data', 'assign_assessments', 'view_demographics']) {
      assert.equal(isValidPermissionKey(bad), false, `accepted non-canonical key ${bad}`)
    }
  })

  test('rejects non-strings and unknown keys', () => {
    for (const bad of [null, undefined, 42, {}, [], 'nope', '']) {
      assert.equal(isValidPermissionKey(bad as unknown), false)
    }
  })
})

describe('P3.2 — password-reset redirect allow-list', () => {
  const SITE = 'https://app.vwelfare.com'

  test('allows the mobile deep link (exact)', () => {
    assert.equal(sanitizeResetRedirect('vwelfare://reset-password', SITE), 'vwelfare://reset-password')
  })

  test('allows our own https origin /reset-password', () => {
    assert.equal(sanitizeResetRedirect('https://app.vwelfare.com/reset-password', SITE), 'https://app.vwelfare.com/reset-password')
  })

  test('rejects a foreign origin (open-redirect / token theft)', () => {
    assert.equal(sanitizeResetRedirect('https://evil.example.com/reset-password', SITE), undefined)
    assert.equal(sanitizeResetRedirect('https://app.vwelfare.com.evil.com/reset-password', SITE), undefined)
  })

  test('rejects wrong path, non-https, and junk', () => {
    assert.equal(sanitizeResetRedirect('https://app.vwelfare.com/steal', SITE), undefined)
    assert.equal(sanitizeResetRedirect('http://app.vwelfare.com/reset-password', SITE), undefined)
    assert.equal(sanitizeResetRedirect('javascript:alert(1)', SITE), undefined)
    assert.equal(sanitizeResetRedirect('vwelfare://evil', SITE), undefined)
    assert.equal(sanitizeResetRedirect(12345 as unknown, SITE), undefined)
  })
})

describe('P3.1 — PHI scrubbing applied to AI-bound text', () => {
  // The routes (ai-chat, clinical-notes) call scrubPHI() on outbound text; this
  // guards the scrubber contract those routes now depend on.
  test('scrubs email, phone, and national ID before it can reach the AI provider', () => {
    const raw = 'Patient john.doe@example.com, phone +966 50 123 4567, ID 1234567890'
    const out = scrubPHI(raw)
    assert.ok(!out.includes('john.doe@example.com'), 'email leaked')
    assert.ok(!/\+?966\s?50\s?123\s?4567/.test(out), 'phone leaked')
    assert.ok(!out.includes('1234567890'), 'national id leaked')
  })
})
