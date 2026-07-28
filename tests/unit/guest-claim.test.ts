import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createGuestClaimToken, verifyGuestClaimToken } from '../../lib/guest-claim'

describe('guest claim tokens', () => {
  it('round-trips a valid submission id', () => {
    process.env.GUEST_CLAIM_SECRET = 'test-secret-for-unit-tests'
    const id = '550e8400-e29b-41d4-a716-446655440000'
    const token = createGuestClaimToken(id)
    const verified = verifyGuestClaimToken(token)
    assert.deepEqual(verified, { submissionId: id })
  })

  it('rejects tampered tokens', () => {
    process.env.GUEST_CLAIM_SECRET = 'test-secret-for-unit-tests'
    const id = '550e8400-e29b-41d4-a716-446655440000'
    const token = createGuestClaimToken(id)
    const parts = token.split('.')
    parts[0] = '00000000-0000-4000-8000-000000000000'
    assert.equal(verifyGuestClaimToken(parts.join('.')), null)
  })

  it('rejects garbage input', () => {
    process.env.GUEST_CLAIM_SECRET = 'test-secret-for-unit-tests'
    assert.equal(verifyGuestClaimToken(''), null)
    assert.equal(verifyGuestClaimToken('a.b'), null)
    assert.equal(verifyGuestClaimToken('not-a-uuid.123.sig'), null)
  })
})
