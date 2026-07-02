/**
 * Payment security unit tests.
 *
 * Run: npx tsx --test __tests__/security/payments.test.ts
 *
 * Covers the two security-critical, dependency-free pieces of the payment
 * system that were hardened during the PR #30 audit:
 *   1. Server-authoritative pricing (lib/billing/pricing.ts) — proves the client
 *      cannot influence the charge amount (PAY-1).
 *   2. Stripe webhook signature verification (lib/stripe/webhook.ts) — proves
 *      forged/tampered/replayed events are rejected (PAY-5).
 */

import assert from 'node:assert/strict'
import { test, describe } from 'node:test'
import crypto from 'node:crypto'
import {
  TIER_PRICES_USD,
  applyDiscount,
  isValidTier,
  VALID_TIERS,
} from '../../lib/billing/pricing'
import { constructEvent, StripeWebhookError } from '../../lib/stripe/webhook'

describe('pricing — server-authoritative amounts (PAY-1)', () => {
  test('tier prices are fixed and non-zero', () => {
    assert.equal(TIER_PRICES_USD.basic, 9.99)
    assert.equal(TIER_PRICES_USD.standard, 24.99)
    assert.equal(TIER_PRICES_USD.professional, 49.99)
  })

  test('isValidTier rejects unknown / injected tiers', () => {
    assert.ok(isValidTier('professional'))
    assert.ok(!isValidTier('free_admin'))
    assert.ok(!isValidTier(''))
    assert.ok(!isValidTier(null))
    assert.equal(VALID_TIERS.length, 3)
  })

  test('no discount returns the base price unchanged', () => {
    assert.equal(applyDiscount(49.99, null, null), 49.99)
  })

  test('percentage discount is applied and rounded to cents', () => {
    assert.equal(applyDiscount(24.99, 'percentage', 10), 22.49) // 24.99 * 0.9 = 22.491 -> 22.49
    assert.equal(applyDiscount(49.99, 'percentage', 50), 25) // 24.995 -> 25.00
  })

  test('fixed_amount discount subtracts and clamps at zero', () => {
    assert.equal(applyDiscount(9.99, 'fixed_amount', 5), 4.99)
    assert.equal(applyDiscount(9.99, 'fixed_amount', 999), 0) // never negative
  })

  test('free discount zeroes the price regardless of value', () => {
    assert.equal(applyDiscount(49.99, 'free', null), 0)
    assert.equal(applyDiscount(49.99, 'free', 0), 0)
  })

  test('a malicious 100%+ percentage never yields a negative charge', () => {
    assert.equal(applyDiscount(24.99, 'percentage', 150), 0)
  })
})

// ---- Stripe signature verification --------------------------------------

const SECRET = 'whsec_test_secret_key_1234567890'

function signedHeader(body: string, secret: string, timestamp: number): string {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body}`, 'utf8')
    .digest('hex')
  return `t=${timestamp},v1=${signature}`
}

describe('stripe webhook signature verification (PAY-5)', () => {
  const body = JSON.stringify({ id: 'evt_1', type: 'payment_intent.succeeded', data: { object: {} } })
  const now = () => Math.floor(Date.now() / 1000)

  test('accepts a correctly-signed, fresh event', () => {
    const header = signedHeader(body, SECRET, now())
    const event = constructEvent(body, header, SECRET)
    assert.equal(event.id, 'evt_1')
    assert.equal(event.type, 'payment_intent.succeeded')
  })

  test('rejects a tampered body (signature no longer matches)', () => {
    const header = signedHeader(body, SECRET, now())
    const tampered = body.replace('evt_1', 'evt_ATTACKER')
    assert.throws(() => constructEvent(tampered, header, SECRET), StripeWebhookError)
  })

  test('rejects a valid signature made with the wrong secret', () => {
    const header = signedHeader(body, 'whsec_attacker_secret', now())
    assert.throws(() => constructEvent(body, header, SECRET), StripeWebhookError)
  })

  test('rejects a replayed event outside the tolerance window', () => {
    const stale = now() - 10 * 60 // 10 minutes old, tolerance is 300s
    const header = signedHeader(body, SECRET, stale)
    assert.throws(() => constructEvent(body, header, SECRET), /tolerance/i)
  })

  test('rejects a missing signature header', () => {
    assert.throws(() => constructEvent(body, null, SECRET), /Missing Stripe-Signature/i)
  })

  test('rejects a header with no v1 signature', () => {
    assert.throws(() => constructEvent(body, `t=${now()}`, SECRET), StripeWebhookError)
  })
})
