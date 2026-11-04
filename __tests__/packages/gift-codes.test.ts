/**
 * Gift codes for packages bought for someone else, and their emails.
 *
 * Run: npx tsx --test __tests__/packages/gift-codes.test.ts
 */

import assert from 'node:assert/strict'
import { test, describe } from 'node:test'
import { generateGiftCode, normalizeGiftCode, hashGiftCode, normalizeGiftEmail } from '../../lib/billing/gift-codes'
import { giftCodeEmail, receiptEmail } from '../../lib/email/templates'

describe('gift codes', () => {
  test('codes look like XXXX-XXXX-XXXX with no look-alike characters', () => {
    for (let i = 0; i < 500; i++) {
      const c = generateGiftCode()
      assert.match(c, /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/)
      assert.ok(!/[01OIL]/.test(c))
    }
  })

  test('codes are unique in practice', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 5000; i++) seen.add(generateGiftCode())
    assert.equal(seen.size, 5000)
  })

  test('normalising accepts spaces, dashes and lower case, and rejects junk', () => {
    const c = generateGiftCode()
    const n = normalizeGiftCode(c)!
    assert.equal(n.length, 12)
    assert.equal(normalizeGiftCode(c.toLowerCase().replace(/-/g, ' ')), n)
    assert.equal(normalizeGiftCode('ABCD-EFGH-IJK0'), null) // I and 0 are not in the alphabet
    assert.equal(normalizeGiftCode('ABCD'), null)
    assert.equal(normalizeGiftCode("x' or 1=1 --"), null)
    assert.equal(normalizeGiftCode(42), null)
  })

  test('hash is stable, hex, and differs per code', () => {
    const a = normalizeGiftCode(generateGiftCode())!
    const b = normalizeGiftCode(generateGiftCode())!
    assert.equal(hashGiftCode(a), hashGiftCode(a))
    assert.match(hashGiftCode(a), /^[0-9a-f]{64}$/)
    assert.notEqual(hashGiftCode(a), hashGiftCode(b))
  })

  test('recipient email is trimmed, lower-cased and validated', () => {
    assert.equal(normalizeGiftEmail('  Friend@Example.COM '), 'friend@example.com')
    assert.equal(normalizeGiftEmail('not-an-email'), null)
    assert.equal(normalizeGiftEmail('a@b'), null)
    assert.equal(normalizeGiftEmail('<script>@x.com'), null)
    assert.equal(normalizeGiftEmail(null), null)
  })
})

describe('package emails', () => {
  test('the gift email carries the code and a redeem link, in both languages', () => {
    const m = giftCodeEmail({ to: 'f@example.com', pkg: { en: 'Check-up', ar: 'الفحص' }, code: 'ABCD-EFGH-JKMN', redeemUrl: 'https://app.vwelfare.com/redeem?code=ABCD-EFGH-JKMN' })
    assert.equal(m.to, 'f@example.com')
    assert.match(m.html, /ABCD-EFGH-JKMN/)
    assert.match(m.html, /\/redeem\?code=ABCD-EFGH-JKMN/)
    assert.match(m.html, /dir="rtl"/)
    assert.match(m.text, /ABCD-EFGH-JKMN/)
  })

  test('package names are HTML-escaped', () => {
    const m = receiptEmail({ to: 'b@example.com', pkg: { en: '<img src=x onerror=alert(1)>', ar: '"x"' }, amount: '$19.00', packageUrl: 'https://app.vwelfare.com/packages/1' })
    assert.ok(!m.html.includes('<img src=x'))
    assert.match(m.html, /&lt;img src=x/)
    assert.match(m.html, /&quot;x&quot;/)
  })
})
