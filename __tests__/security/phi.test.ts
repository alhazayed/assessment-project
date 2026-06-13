/**
 * PHI Anonymization Unit Tests
 *
 * Run: npx tsx __tests__/security/phi.test.ts
 * Or: node --test __tests__/security/phi.test.ts  (requires ts-node or tsx)
 */

import assert from 'node:assert/strict'
import { test, describe } from 'node:test'
import { anonymizePHI, scrubPHI } from '../../lib/security/anonymizePHI'

describe('anonymizePHI — email detection', () => {
  test('replaces standard email addresses', () => {
    const { text } = anonymizePHI('Contact me at john.doe@example.com please')
    assert.ok(!text.includes('@'), 'Email not scrubbed')
    assert.ok(text.includes('[EMAIL]'), 'EMAIL placeholder missing')
  })

  test('replaces email with subdomain', () => {
    const { text } = anonymizePHI('Email: user@mail.hospital.org')
    assert.ok(text.includes('[EMAIL]'))
  })
})

describe('anonymizePHI — phone detection', () => {
  test('replaces international phone with +', () => {
    const { text } = anonymizePHI('Call me at +966501234567')
    assert.ok(!text.includes('+966501234567'))
    assert.ok(text.includes('[PHONE]'))
  })

  test('replaces phone with dashes', () => {
    const { text } = anonymizePHI('Phone: 050-123-4567')
    assert.ok(text.includes('[PHONE]') || !text.includes('050-123-4567'))
  })
})

describe('anonymizePHI — Saudi national ID', () => {
  test('replaces 10-digit ID starting with 1', () => {
    const { text } = anonymizePHI('National ID: 1234567890')
    assert.ok(!text.includes('1234567890'))
    assert.ok(text.includes('[ID]'))
  })

  test('replaces 10-digit ID starting with 2 (Iqama)', () => {
    const { text } = anonymizePHI('Iqama: 2987654321')
    assert.ok(text.includes('[ID]'))
  })
})

describe('anonymizePHI — date of birth', () => {
  test('replaces ISO date format YYYY-MM-DD', () => {
    const { text } = anonymizePHI('Patient DOB: 1990-05-15')
    assert.ok(!text.includes('1990-05-15'))
    assert.ok(text.includes('[DOB]'))
  })

  test('replaces born keyword + date', () => {
    const { text } = anonymizePHI('Born 12 Jan 1985')
    assert.ok(text.includes('[DOB]'))
  })
})

describe('anonymizePHI — medical record numbers', () => {
  test('replaces MRN prefix', () => {
    const { text } = anonymizePHI('MRN: 987654')
    assert.ok(text.includes('[MRN]'))
  })

  test('replaces PATIENT ID label', () => {
    const { text } = anonymizePHI('PATIENT ID: 12345678')
    assert.ok(text.includes('[MRN]'))
  })
})

describe('anonymizePHI — address detection', () => {
  test('replaces street address', () => {
    const { text } = anonymizePHI('I live at 123 King Fahd Road')
    assert.ok(text.includes('[ADDRESS]') || !text.includes('King Fahd Road'))
  })

  test('replaces PO Box', () => {
    const { text } = anonymizePHI('P.O. Box 4521 Riyadh')
    assert.ok(text.includes('[ADDRESS]'))
  })
})

describe('anonymizePHI — name detection', () => {
  test('replaces "my name is" pattern', () => {
    const { text } = anonymizePHI('My name is Ahmad Al-Rashidi and I feel anxious')
    assert.ok(text.includes('[PATIENT]'))
  })

  test('replaces "I am" name pattern', () => {
    const { text } = anonymizePHI('I am John Smith, feeling depressed')
    assert.ok(text.includes('[PATIENT]'))
  })
})

describe('anonymizePHI — safe text unchanged', () => {
  test('plain symptom text without PHI is unchanged', () => {
    const input = 'I have been feeling very anxious and having trouble sleeping for about two weeks.'
    const { text, replacements } = anonymizePHI(input)
    assert.equal(replacements, 0)
    assert.equal(text, input)
  })

  test('returns replacement count', () => {
    const { replacements } = anonymizePHI('Email john@test.com or call +971501234567')
    assert.ok(replacements >= 2)
  })
})

describe('scrubPHI convenience wrapper', () => {
  test('returns string directly', () => {
    const result = scrubPHI('test@example.com')
    assert.equal(typeof result, 'string')
    assert.ok(result.includes('[EMAIL]'))
  })
})
