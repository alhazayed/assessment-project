/**
 * Severity band → display level unit tests.
 *
 * Run: npx tsx --test __tests__/severity/severity.test.ts
 */

import assert from 'node:assert/strict'
import { test, describe } from 'node:test'
import { bandToSeverity, severityBadgeClass, isConcerningBand, hasExplicitSeverity } from '../../lib/severity'
import severityAr from '../../lib/severity-labels.ar.json'

describe('bandToSeverity', () => {
  test('severe wording is never downgraded by a "moderate" substring', () => {
    assert.equal(bandToSeverity('Moderately severe'), 'severe')
    assert.equal(bandToSeverity('Moderate to severe depression'), 'severe')
    assert.equal(bandToSeverity('Moderate–severe distress'), 'severe')
  })

  test('direction-aware labels map correctly', () => {
    assert.equal(bandToSeverity('High resilience'), 'minimal')
    assert.equal(bandToSeverity('Low resilience'), 'moderate')
    assert.equal(bandToSeverity('Low burnout'), 'minimal')
    assert.equal(bandToSeverity('High burnout'), 'severe')
    assert.equal(bandToSeverity('Highly satisfied'), 'minimal')
  })

  test('personality profiles are neutral', () => {
    assert.equal(bandToSeverity('Balanced Personality Profile'), 'neutral')
    assert.equal(severityBadgeClass('Reserved & Structured Profile'), 'badge-neutral')
  })

  test('every stored label has an explicit mapping', () => {
    // Labels come from assessment_definitions.scoring_logic (see severity-labels.ts).
    // A label missing here would fall back to keyword matching; add it to the table.
    const missing = Object.keys(severityAr).filter(label => !hasExplicitSeverity(label))
    assert.deepEqual(missing, [])
  })

  test('unknown labels fall back conservatively', () => {
    assert.equal(bandToSeverity('Extremely severe symptoms'), 'severe')
    assert.equal(bandToSeverity('Mild symptoms'), 'mild')
    assert.equal(bandToSeverity(null), 'neutral')
  })

  test('isConcerningBand flags moderate and above', () => {
    assert.equal(isConcerningBand('Moderate depression'), true)
    assert.equal(isConcerningBand('Severe'), true)
    assert.equal(isConcerningBand('Mild'), false)
    assert.equal(isConcerningBand('Minimal'), false)
  })
})
