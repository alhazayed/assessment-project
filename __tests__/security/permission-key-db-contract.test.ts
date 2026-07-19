/**
 * Permission-key ↔ database contract lock.
 *
 * The authorization model depends on three things agreeing exactly:
 *   1. The app's canonical `ALL_PERMISSION_KEYS` (lib/types.ts).
 *   2. The Postgres CHECK constraint on `relationship_permissions.permission_key`.
 *   3. The permission keys that RLS policies pass to `has_clinician_access(...)`.
 *
 * If (1) drifts from (2), a grant the app accepts can be rejected by the DB
 * (broken consent) or vice-versa. If an RLS policy requires a key that is not
 * grantable via (1)/(2), that access can never be enabled (dead policy). If a
 * grantable key is silently removed, previously-granted access can break.
 *
 * These sets were verified equal against the LIVE production database
 * (project wyzezyctpvlohuuhzyof) on 2026-07-19:
 *   - CHECK constraint `relationship_permissions_permission_key_check`
 *   - RLS `has_clinician_access(..., '<key>')` call sites
 * This test freezes that contract so a future change to the app list cannot
 * silently diverge from the deployed constraint without a failing test forcing
 * a matching migration.
 *
 * Pure unit test (no network / DB). Run:
 *   npx tsx --test __tests__/security/permission-key-db-contract.test.ts
 */

import assert from 'node:assert/strict'
import { test, describe } from 'node:test'
import { ALL_PERMISSION_KEYS } from '../../lib/types'

// Frozen snapshot of the production DB CHECK constraint
// `relationship_permissions_permission_key_check` (verified 2026-07-19).
const DB_CHECK_CONSTRAINT_KEYS = [
  'view_profile',
  'view_assessment_results',
  'view_assessment_history',
  'view_reports',
  'view_progress_tracking',
  'view_mood_tracking',
  'export_reports',
  'message_patient',
  'upload_documents',
  'generate_clinical_notes',
] as const

// Permission keys required by RLS policies via has_clinician_access(...),
// verified from pg_policy on the live database (2026-07-19). Every one of
// these MUST be grantable, or the RLS-enforced access can never be enabled.
const RLS_REQUIRED_KEYS = [
  'generate_clinical_notes',
  'view_assessment_history',
  'view_assessment_results',
  'view_mood_tracking',
  'view_profile',
  'view_progress_tracking',
  'view_reports',
] as const

describe('permission-key ↔ DB contract', () => {
  test('app ALL_PERMISSION_KEYS exactly equals the DB CHECK constraint set', () => {
    const app = [...ALL_PERMISSION_KEYS].sort()
    const db = [...DB_CHECK_CONSTRAINT_KEYS].sort()
    assert.deepEqual(
      app,
      db,
      `App permission keys diverged from the production DB CHECK constraint.\n` +
        `If this change is intentional, ship a migration that updates ` +
        `relationship_permissions_permission_key_check to match, then update ` +
        `DB_CHECK_CONSTRAINT_KEYS here.\n` +
        `app-only: ${app.filter((k) => !db.includes(k as never))}\n` +
        `db-only:  ${db.filter((k) => !app.includes(k as never))}`,
    )
  })

  test('no duplicate keys in the app list', () => {
    assert.equal(
      new Set(ALL_PERMISSION_KEYS).size,
      ALL_PERMISSION_KEYS.length,
      'ALL_PERMISSION_KEYS contains duplicates',
    )
  })

  test('every RLS-required permission key is grantable (present in the app list)', () => {
    for (const key of RLS_REQUIRED_KEYS) {
      assert.ok(
        (ALL_PERMISSION_KEYS as readonly string[]).includes(key),
        `RLS policies require '${key}' but it is not in ALL_PERMISSION_KEYS — ` +
          `that access can never be granted (dead policy).`,
      )
    }
  })
})
