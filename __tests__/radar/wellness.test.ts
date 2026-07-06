/**
 * Mental-health radar normalization unit tests.
 *
 * Run: npx tsx --test __tests__/radar/wellness.test.ts
 * Or:  node --test __tests__/radar/wellness.test.ts  (requires tsx)
 *
 * Covers the raw-score -> 0..100 wellness mapping and the score-history ->
 * radar-series aggregation that drives the Mental Health Radar chart.
 */

import assert from 'node:assert/strict'
import { test, describe } from 'node:test'
import {
  toWellness,
  buildRadarData,
  SCALE_CONFIG,
  DOMAINS,
  type ScoreEntry,
  type ScaleRadarConfig,
} from '../../lib/radar/wellness'

const def = (code: string) => ({ name_en: code, name_ar: code, code })
const entry = (code: string, total_score: number, submitted_at = '2026-01-01T00:00:00Z'): ScoreEntry => ({
  submitted_at,
  total_score,
  assessment_definitions: def(code),
})

describe('toWellness — symptom scales (higher score = worse)', () => {
  const phq9 = SCALE_CONFIG.PHQ9 // 0..27, higherIsBetter: false

  test('minimum symptom score maps to 100% wellness', () => {
    assert.equal(toWellness(0, phq9), 100)
  })

  test('maximum symptom score maps to 0% wellness', () => {
    assert.equal(toWellness(27, phq9), 0)
  })

  test('midpoint symptom score maps to ~50% wellness', () => {
    // (27 - 13.5) / 27 = 0.5 -> 50
    assert.equal(toWellness(13.5, phq9), 50)
  })
})

describe('toWellness — strength scales (higher score = better)', () => {
  const brs = SCALE_CONFIG.BRS // 6..30, higherIsBetter: true

  test('minimum raw score maps to 0% wellness', () => {
    assert.equal(toWellness(6, brs), 0)
  })

  test('maximum raw score maps to 100% wellness', () => {
    assert.equal(toWellness(30, brs), 100)
  })

  test('midpoint raw score maps to ~50% wellness', () => {
    // (18 - 6) / (30 - 6) = 0.5 -> 50
    assert.equal(toWellness(18, brs), 50)
  })
})

describe('toWellness — non-zero minScore is respected', () => {
  const k10 = SCALE_CONFIG.K10 // 10..50, higherIsBetter: false

  test('score at minScore maps to 100% wellness (best)', () => {
    assert.equal(toWellness(10, k10), 100)
  })

  test('score at maxScore maps to 0% wellness (worst)', () => {
    assert.equal(toWellness(50, k10), 0)
  })
})

describe('toWellness — clamping and edge cases', () => {
  const phq9 = SCALE_CONFIG.PHQ9

  test('score below minScore clamps to 100% (never > 100)', () => {
    assert.equal(toWellness(-5, phq9), 100)
  })

  test('score above maxScore clamps to 0% (never < 0)', () => {
    assert.equal(toWellness(999, phq9), 0)
  })

  test('degenerate zero-range config returns neutral 50%', () => {
    const zero: ScaleRadarConfig = { domain: 'Test', minScore: 10, maxScore: 10, higherIsBetter: false }
    assert.equal(toWellness(10, zero), 50)
  })

  test('always returns an integer in [0, 100]', () => {
    for (const cfg of Object.values(SCALE_CONFIG)) {
      for (const s of [cfg.minScore, cfg.maxScore, (cfg.minScore + cfg.maxScore) / 2]) {
        const w = toWellness(s, cfg)
        assert.ok(Number.isInteger(w), `non-integer wellness ${w}`)
        assert.ok(w >= 0 && w <= 100, `out-of-range wellness ${w}`)
      }
    }
  })
})

describe('SCALE_CONFIG integrity', () => {
  test('every scale maps to a known domain label', () => {
    for (const [code, cfg] of Object.entries(SCALE_CONFIG)) {
      assert.ok(DOMAINS[cfg.domain], `scale ${code} points at unknown domain "${cfg.domain}"`)
    }
  })

  test('every scale has maxScore > minScore', () => {
    for (const [code, cfg] of Object.entries(SCALE_CONFIG)) {
      assert.ok(cfg.maxScore > cfg.minScore, `scale ${code} has non-positive range`)
    }
  })
})

describe('buildRadarData — aggregation', () => {
  test('empty history yields no points', () => {
    assert.deepEqual(buildRadarData([], false), [])
  })

  test('unknown assessment codes are ignored', () => {
    const data = buildRadarData([entry('NOT_A_REAL_CODE', 10)], false)
    assert.deepEqual(data, [])
  })

  test('a single known score produces one domain point', () => {
    const data = buildRadarData([entry('PHQ9', 0)], false)
    assert.equal(data.length, 1)
    assert.equal(data[0].domain, 'Depression')
    assert.equal(data[0].wellness, 100)
    assert.equal(data[0].fullMark, 100)
  })

  test('scores sharing a domain are averaged', () => {
    // PHQ9=0 -> 100 wellness, CESD=60 -> 0 wellness; both Depression -> avg 50
    const data = buildRadarData([entry('PHQ9', 0), entry('CESD', 60)], false)
    assert.equal(data.length, 1)
    assert.equal(data[0].domain, 'Depression')
    assert.equal(data[0].wellness, 50)
  })

  test('only the most recent score per code is used', () => {
    // Oldest-first history: the later PHQ9=27 (0 wellness) must win over the earlier PHQ9=0.
    const data = buildRadarData([
      entry('PHQ9', 0, '2026-01-01T00:00:00Z'),
      entry('PHQ9', 27, '2026-02-01T00:00:00Z'),
    ], false)
    assert.equal(data.length, 1)
    assert.equal(data[0].wellness, 0)
  })

  test('distinct domains are returned sorted by localized label', () => {
    const data = buildRadarData([entry('GAD7', 0), entry('PHQ9', 0), entry('ISI', 0)], false)
    const domains = data.map(d => d.domain)
    assert.deepEqual(domains, [...domains].sort((a, b) => a.localeCompare(b)))
    assert.deepEqual(new Set(domains), new Set(['Anxiety', 'Depression', 'Sleep']))
  })

  test('entries with a null assessment definition are skipped', () => {
    const data = buildRadarData([
      { submitted_at: '2026-01-01T00:00:00Z', total_score: 5, assessment_definitions: null },
      entry('PHQ9', 0),
    ], false)
    assert.equal(data.length, 1)
    assert.equal(data[0].domain, 'Depression')
  })

  test('Arabic labels are used when isAr is true', () => {
    const data = buildRadarData([entry('PHQ9', 0)], true)
    assert.equal(data[0].domain, DOMAINS.Depression.ar)
  })
})
