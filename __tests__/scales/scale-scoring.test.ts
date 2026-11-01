/**
 * Subscale scoring for multi-scale and mean-scored assessments.
 *
 * Run: npx tsx --test __tests__/scales/scale-scoring.test.ts
 */

import assert from 'node:assert/strict'
import { test, describe } from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { computeSubscaleScores, displayTotal, formatSubscaleValue, ENGLISH_ONLY_VALIDATED, SCALE_SCORING } from '../../lib/scale-scoring'
import { ASSESSMENT_CONTENT } from '../../lib/assessment-content'
import { ASSESSMENT_CONTENT_AR } from '../../lib/assessment-content-ar'
import { hasExplicitSeverity } from '../../lib/severity'

const items = (subs: string[]) => subs.map((s, i) => ({ id: `i${i + 1}`, subscale: s }))

describe('computeSubscaleScores', () => {
  test('A-DES subscales and DSS subscales are item means', () => {
    const its = items(['amnesia', 'amnesia', 'absorption'])
    const r = computeSubscaleScores('ADES', its, { i1: 3, i2: 4, i3: 10 })!
    assert.equal(r.subscales.find(s => s.key === 'amnesia')!.value, 3.5)
    assert.equal(r.subscales.find(s => s.key === 'absorption')!.value, 10)
    assert.equal(r.subscales.find(s => s.key === 'amnesia')!.max, 10)
  })

  test('BPQ subscales are the percent of items endorsed', () => {
    const its = items(['suicide_self_harm', 'suicide_self_harm', 'suicide_self_harm', 'suicide_self_harm'])
    const r = computeSubscaleScores('BPQ', its, { i1: 1, i2: 0, i3: 1, i4: 0 })!
    assert.equal(r.subscales[0].value, 50)
    assert.equal(formatSubscaleValue('BPQ', 50), '50%')
  })

  test('ACSI-28 subscales are sums of 0-3 items', () => {
    const its = items(['coachability', 'coachability', 'coachability', 'coachability'])
    const r = computeSubscaleScores('ACSI28', its, { i1: 3, i2: 3, i3: 0, i4: 2 })!
    assert.deepEqual([r.subscales[0].value, r.subscales[0].min, r.subscales[0].max], [8, 0, 12])
  })

  test('IPIP-NEO-120 facets roll up into domains by prefix', () => {
    const its = items(['N-Anxiety', 'N-Anxiety', 'N-Anger', 'E-Friendliness'])
    const r = computeSubscaleScores('IPIP120', its, { i1: 5, i2: 4, i3: 1, i4: 2 })!
    assert.equal(r.domains.find(d => d.key === 'N')!.value, 10)
    assert.equal(r.domains.find(d => d.key === 'E')!.value, 2)
    assert.equal(r.subscales.find(s => s.key === 'N-Anxiety')!.value, 9)
  })

  test('unknown codes have no breakdown', () => {
    assert.equal(computeSubscaleScores('PHQ9', [], {}), null)
  })
})

describe('displayTotal', () => {
  test('mean-scored scales show the item mean, others the sum', () => {
    assert.equal(displayTotal('ADES', 75, 30), '2.5')
    assert.equal(displayTotal('DSS', 72, 24), '3.0')
    assert.equal(displayTotal('BPQ', 31, 80), '31')
    assert.equal(displayTotal('PHQ9', 12, 9), '12')
  })
})

describe('seeded assessments', () => {
  const sql = readFileSync(join(__dirname, '../../supabase/migrations/20261101120000_english_validated_assessments.sql'), 'utf8')
  const bandLabels = [...sql.matchAll(/"severity_en": "([^"]+)"/g)].map(m => m[1])

  test('every English-only code has scoring rules and bilingual content', () => {
    for (const code of ENGLISH_ONLY_VALIDATED) {
      assert.ok(SCALE_SCORING[code], `${code} scoring`)
      assert.ok(ASSESSMENT_CONTENT[code], `${code} content`)
      assert.ok(ASSESSMENT_CONTENT_AR[code]?.overview, `${code} Arabic content`)
    }
  })

  test('every band label in the SQL has content, Arabic content and a severity level', () => {
    assert.equal(bandLabels.length, 11)
    for (const label of bandLabels) {
      const owner = Object.entries(ASSESSMENT_CONTENT).filter(([code]) => ENGLISH_ONLY_VALIDATED.has(code))
        .find(([, c]) => label in c.bands)
      assert.ok(owner, `content for "${label}"`)
      assert.ok(ASSESSMENT_CONTENT_AR[owner![0]].bands[label]?.explanation, `Arabic content for "${label}"`)
      assert.ok(hasExplicitSeverity(label), `severity level for "${label}"`)
    }
  })

  test('every subscale key in the SQL is a known subscale', () => {
    for (const code of ENGLISH_ONLY_VALIDATED) {
      const block = sql.split(`where d.code = '${code}';`)[0].split('insert into assessment_items').pop()!
      const keys = new Set([...block.matchAll(/, (?:true|false), '([^']+)'\)/g)].map(m => m[1]))
      const known = new Set(SCALE_SCORING[code].subscales.map(s => s.key))
      assert.ok(keys.size > 0, `${code} has subscale keys`)
      assert.deepEqual([...keys].filter(k => !known.has(k)), [], `${code} unknown keys`)
      assert.equal(keys.size, known.size, `${code} uses every subscale`)
    }
  })
})
