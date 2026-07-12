/**
 * Unit tests for the assessment attempt-comparison helper.
 *
 * Run: npx tsx --test __tests__/assessment-compare.test.ts
 *
 * Covers the progress-comparison logic used by both the result-page auto-compare
 * and the history/compare view: score delta direction, severity-band change,
 * per-item changed/unchanged detection, and missing-answer handling.
 */

import assert from 'node:assert/strict'
import { test, describe } from 'node:test'
import { compareAttempts, type Attempt, type CompareItem } from '../lib/assessment-compare'

const items: CompareItem[] = [
  { id: 'i1', item_number: 1, question_en: 'Q1', question_ar: 'س1' },
  { id: 'i2', item_number: 2, question_en: 'Q2', question_ar: 'س2' },
  { id: 'i3', item_number: 3, question_en: 'Q3', question_ar: 'س3' },
]

function attempt(id: string, score: number, band: string, answers: Record<string, number>): Attempt {
  return {
    id,
    submitted_at: '2026-01-01T00:00:00Z',
    total_score: score,
    severity_band: band,
    high_risk_flag: false,
    answers: Object.fromEntries(
      Object.entries(answers).map(([k, v]) => [k, { value: v, label_en: `L${v}`, label_ar: `ل${v}` }]),
    ),
  }
}

describe('compareAttempts', () => {
  test('score delta is to − from', () => {
    const from = attempt('a', 39, 'Moderate', { i1: 3, i2: 3, i3: 3 })
    const to = attempt('b', 31, 'Mild', { i1: 3, i2: 3, i3: 3 })
    assert.equal(compareAttempts(from, to, items).scoreDelta, -8)
  })

  test('detects changed vs unchanged answers with per-item delta', () => {
    const from = attempt('a', 9, 'x', { i1: 1, i2: 2, i3: 3 })
    const to = attempt('b', 11, 'x', { i1: 3, i2: 2, i3: 1 })
    const c = compareAttempts(from, to, items)
    assert.equal(c.changed.length, 2)
    assert.equal(c.unchangedCount, 1)
    const byItem = Object.fromEntries(c.changed.map(ch => [ch.item.id, ch.delta]))
    assert.equal(byItem['i1'], 2)   // 1 -> 3
    assert.equal(byItem['i3'], -2)  // 3 -> 1
    assert.equal(byItem['i2'], undefined) // unchanged, not reported
  })

  test('flags severity-band change', () => {
    assert.equal(compareAttempts(attempt('a', 5, 'Low', {}), attempt('b', 5, 'Low', {}), items).bandChanged, false)
    assert.equal(compareAttempts(attempt('a', 5, 'Low', {}), attempt('b', 9, 'High', {}), items).bandChanged, true)
  })

  test('treats a newly-answered item (missing before) as a change with null delta', () => {
    const from = attempt('a', 0, 'x', { i1: 2 })
    const to = attempt('b', 5, 'x', { i1: 2, i2: 3 })
    const c = compareAttempts(from, to, items)
    const i2 = c.changed.find(ch => ch.item.id === 'i2')
    assert.ok(i2, 'i2 should be reported as changed')
    assert.equal(i2!.from, null)
    assert.equal(i2!.delta, null)
    assert.equal(i2!.to?.value, 3)
  })
})
