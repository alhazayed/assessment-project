/**
 * PHI-scrubbing contract for AI-bound text (P3.1).
 *
 * app/api/ai-chat and app/api/clinical-notes now pass all user/patient free text
 * through scrubPHI() before calling Gemini. These tests guard that contract:
 * the identifiers those routes could otherwise leak must be removed. They
 * simulate the exact strings each route forwards.
 *
 * Run: npx tsx --test __tests__/security/ai-phi-scrub.test.ts
 */
import assert from 'node:assert/strict'
import { test, describe } from 'node:test'
import { scrubPHI } from '../../lib/security/anonymizePHI'

function assertNoPHI(out: string) {
  assert.ok(!/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(out), `email leaked: ${out}`)
  assert.ok(!/\b[12]\d{9}\b/.test(out), `national id / iqama leaked: ${out}`)
  assert.ok(!/\+?\d[\d\s().-]{7,}\d/.test(out), `phone leaked: ${out}`)
}

describe('ai-chat — outbound user message is scrubbed', () => {
  test('scrubs email, phone, and Saudi national ID', () => {
    const raw = 'Hi, I am really anxious. Reach me at sara.k@gmail.com or +966 50 123 4567, my ID is 1098765432.'
    const out = scrubPHI(raw)
    assertNoPHI(out)
  })

  test('scrubs identifiers embedded in a prior conversation turn', () => {
    const turn = 'Last week Dr. said my MRN 4456789 and DOB 1990-04-12 mattered.'
    const out = scrubPHI(turn)
    assert.ok(!out.includes('4456789'), `MRN leaked: ${out}`)
    assert.ok(!out.includes('1990-04-12'), `DOB leaked: ${out}`)
  })
})

describe('clinical-notes AI draft — patient context is scrubbed', () => {
  test('scrubs PHI carried in a prior clinical note excerpt', () => {
    const context =
      'Recent assessments: PHQ-9 (Moderate). Mood last 7 days: avg 4/10. ' +
      'Prior note excerpt: "Patient John Smith, phone 0501234567, email j.smith@outlook.com, reports insomnia."'
    const out = scrubPHI(context)
    assertNoPHI(out)
    assert.ok(!out.includes('0501234567'), `phone leaked: ${out}`)
    // Non-PHI clinical signal is preserved.
    assert.ok(out.includes('PHQ-9') && out.includes('insomnia'), 'clinical content was destroyed')
  })
})
