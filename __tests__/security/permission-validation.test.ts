/**
 * Permission-key validation tests (Phase 2.2).
 *
 * Exercises the centralized canonical validator that every permission entry
 * point (clinician invite, connect acceptance, access requests, relationship
 * permission updates) now routes through. Proves only approved permission keys
 * may enter the system and that malformed / duplicate / empty / unknown /
 * malicious payloads are rejected.
 *
 * Pure unit tests (no network / DB). Run:
 *   npx tsx --test __tests__/security/permission-validation.test.ts
 */

import assert from 'node:assert/strict'
import { test, describe } from 'node:test'
import { ALL_PERMISSION_KEYS } from '../../lib/types'
import {
  isPermissionKey,
  validatePermissionKeys,
  DEFAULT_REQUESTED_PERMISSIONS,
} from '../../lib/permissions'

describe('isPermissionKey', () => {
  test('accepts every canonical key', () => {
    for (const k of ALL_PERMISSION_KEYS) assert.ok(isPermissionKey(k), `should accept ${k}`)
  })

  test('rejects unknown, legacy-wrong, and non-string values', () => {
    // Keys from the old, incorrect route-local lists that are NOT canonical:
    for (const bad of ['view_clinical_notes', 'view_crisis_history', 'export_patient_data', 'assign_assessments', 'view_demographics']) {
      assert.ok(!isPermissionKey(bad), `should reject non-canonical ${bad}`)
    }
    for (const bad of ['', 'admin', 'superadmin', '__proto__', 'constructor', 'VIEW_PROFILE', 'view_profile ']) {
      assert.ok(!isPermissionKey(bad), `should reject ${JSON.stringify(bad)}`)
    }
    for (const bad of [null, undefined, 0, 1, true, {}, [], () => {}]) {
      assert.ok(!isPermissionKey(bad), `should reject ${String(bad)}`)
    }
  })
})

describe('validatePermissionKeys — valid payloads', () => {
  test('accepts a single canonical key', () => {
    const r = validatePermissionKeys(['view_profile'])
    assert.ok(r.ok)
    assert.deepEqual(r.ok && r.keys, ['view_profile'])
  })

  test('accepts a multi-key canonical set', () => {
    const input = ['view_profile', 'view_assessment_results', 'message_patient']
    const r = validatePermissionKeys(input)
    assert.ok(r.ok)
    assert.deepEqual(r.ok && r.keys, input)
  })

  test('backward compatibility: the default requested set is valid', () => {
    const r = validatePermissionKeys([...DEFAULT_REQUESTED_PERMISSIONS])
    assert.ok(r.ok, 'DEFAULT_REQUESTED_PERMISSIONS must pass validation')
  })

  test('backward compatibility: the full canonical set is valid', () => {
    const r = validatePermissionKeys([...ALL_PERMISSION_KEYS])
    assert.ok(r.ok, 'ALL_PERMISSION_KEYS must pass validation')
  })
})

describe('validatePermissionKeys — rejected payloads', () => {
  test('rejects an unknown permission name', () => {
    const r = validatePermissionKeys(['view_profile', 'delete_everything'])
    assert.ok(!r.ok)
  })

  test('rejects a non-canonical key from the old wrong lists (privilege escalation attempt)', () => {
    for (const esc of ['assign_assessments', 'export_patient_data', 'view_crisis_history']) {
      const r = validatePermissionKeys(['view_profile', esc])
      assert.ok(!r.ok, `escalation via ${esc} must be rejected`)
    }
  })

  test('rejects duplicate permissions', () => {
    const r = validatePermissionKeys(['view_profile', 'view_profile'])
    assert.ok(!r.ok)
    assert.ok(!r.ok && /duplicate/i.test(r.error), 'error should mention duplicate')
  })

  test('rejects an empty array', () => {
    const r = validatePermissionKeys([])
    assert.ok(!r.ok)
  })

  test('rejects null and undefined', () => {
    assert.ok(!validatePermissionKeys(null).ok)
    assert.ok(!validatePermissionKeys(undefined).ok)
  })

  test('rejects non-array payloads', () => {
    for (const bad of ['view_profile', 42, true, { view_profile: true }]) {
      assert.ok(!validatePermissionKeys(bad).ok, `should reject ${JSON.stringify(bad)}`)
    }
  })

  test('rejects a mixed valid/invalid array', () => {
    assert.ok(!validatePermissionKeys(['view_profile', 123]).ok)
    assert.ok(!validatePermissionKeys(['view_profile', null]).ok)
    assert.ok(!validatePermissionKeys([{}, 'message_patient']).ok)
  })

  test('rejects malicious / prototype-pollution style payloads', () => {
    for (const payload of [
      ['__proto__'],
      ['view_profile', 'constructor'],
      ['prototype'],
      ['admin'],
      ['view_profile', '__proto__', 'message_patient'],
    ]) {
      assert.ok(!validatePermissionKeys(payload).ok, `should reject ${JSON.stringify(payload)}`)
    }
  })

  test('returns the { error: string } shape on rejection (no new schema)', () => {
    const r = validatePermissionKeys(['nope'])
    assert.ok(!r.ok)
    assert.equal(typeof (r.ok === false && r.error), 'string')
  })
})

describe('anti-escalation subset semantics (as enforced at connect acceptance)', () => {
  // The connect route grants: validated(granted) ∩ requested. A patient can
  // never grant themselves a permission the clinician did not request, nor a
  // non-canonical one. This mirrors that intersection.
  test('granted is clamped to the requested ∩ canonical subset', () => {
    const requested = ['view_profile', 'view_assessment_results']
    const parsed = validatePermissionKeys(['view_profile', 'message_patient'])
    assert.ok(parsed.ok)
    const granted = (parsed.ok ? parsed.keys : []).filter((p) => requested.includes(p))
    assert.deepEqual(granted, ['view_profile'], 'message_patient was not requested → not granted')
  })
})
