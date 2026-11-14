/**
 * Multi-code orders, the anonymised group report, the free per-scale summary
 * and the package suggestion it links to.
 *
 * Run: npm run test:packages
 */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  parseBulkQuantity,
  bulkQuantityOf,
  bulkCodeStatus,
  buildGroupReport,
  GROUP_MIN,
  CELL_MIN,
} from '../../lib/billing/bulk'
import { pickPackage } from '../../lib/billing/suggest-package'
import { parseScaleSummary } from '../../lib/synthesis'
import { bulkCodesEmail } from '../../lib/email/templates'
import type { ProfileReport, FiredPattern } from '../../lib/package-profiles'

const bi = (en: string) => ({ en, ar: `${en}-ar` })

function report(opts: { band?: string; patterns?: FiredPattern[]; quadrant?: string }): ProfileReport {
  return {
    kind: 'profile',
    version: 1,
    key: 'stress_burnout_recovery',
    headline: bi('h'),
    safety: false,
    composite: null,
    quadrant: opts.quadrant
      ? { label: bi('Q'), result: bi(opts.quadrant), text: bi('t'), color: '#000', evidence: 'e' }
      : null,
    scales: [
      { code: 'PHQ9', name: bi('PHQ-9'), total: 5, max: 27, submitted_at: null, band: opts.band ? bi(opts.band) : null, bandColor: null, subscales: [] },
    ],
    patterns: opts.patterns ?? [],
    missing: [],
    notes: [],
  }
}
const pattern = (id: string, kind: FiredPattern['kind'] = 'attention'): FiredPattern => ({ id, kind, priority: 1, title: bi(id), text: bi('x') })

describe('bulk quantity', () => {
  test('absent or 1 means a normal purchase', () => {
    for (const v of [undefined, null, '', 1, '1']) assert.equal(parseBulkQuantity(v), null)
  })
  test('accepts whole numbers 2–50, as number or digit string', () => {
    assert.equal(parseBulkQuantity(2), 2)
    assert.equal(parseBulkQuantity('50'), 50)
    assert.equal(parseBulkQuantity(' 10 '), 10)
  })
  test('rejects out of range, fractions and junk', () => {
    for (const v of [0, -3, 51, 2.5, '2.5', 'ten', '1e1', {}, [], true]) assert.equal(parseBulkQuantity(v), 'invalid', String(v))
  })
  test('reads the stored quantity from payment metadata only when valid', () => {
    assert.equal(bulkQuantityOf({ bulkQuantity: 10 }), 10)
    assert.equal(bulkQuantityOf({ bulkQuantity: null }), null)
    assert.equal(bulkQuantityOf({ bulkQuantity: 999 }), null)
    assert.equal(bulkQuantityOf(null), null)
  })
  test('code status', () => {
    assert.equal(bulkCodeStatus(null, false), 'unused')
    assert.equal(bulkCodeStatus('2026-11-14', false), 'redeemed')
    assert.equal(bulkCodeStatus('2026-11-14', true), 'report_ready')
  })
})

describe('anonymised group report', () => {
  test(`nothing below ${GROUP_MIN} finished reports`, () => {
    assert.equal(buildGroupReport(Array.from({ length: GROUP_MIN - 1 }, () => report({ band: 'Mild' }))), null)
  })
  test('ignores rows that are not profile reports when counting', () => {
    const rows: unknown[] = [...Array.from({ length: GROUP_MIN - 1 }, () => report({ band: 'Mild' })), { foo: 1 }, null]
    assert.equal(buildGroupReport(rows), null)
  })
  test('counts bands and patterns, hides small counts, never shows safety', () => {
    const rows = [
      ...Array.from({ length: 8 }, () => report({ band: 'Mild', patterns: [pattern('burnout_with_depression')], quadrant: 'Coping' })),
      ...Array.from({ length: 2 }, () => report({ band: 'Severe', patterns: [pattern('suicide_item', 'safety')], quadrant: 'Struggling' })),
    ]
    const g = buildGroupReport(rows)!
    assert.equal(g.completed, 10)
    const bands = g.scales.find(s => s.code === 'PHQ9')!.bands
    assert.deepEqual(bands.map(b => [b.label.en, b.count]), [['Mild', 8], ['Severe', null]])
    assert.deepEqual(g.patterns.map(p => [p.label.en, p.count]), [['burnout_with_depression', 8]])
    assert.ok(!JSON.stringify(g).includes('suicide_item'))
    assert.deepEqual(g.quadrant.map(q => [q.label.en, q.count]), [['Coping', 8], ['Struggling', null]])
    assert.ok(CELL_MIN > 2)
  })
  test('a pattern firing twice in one report counts once', () => {
    const rows = Array.from({ length: 10 }, () => report({ patterns: [pattern('p'), pattern('p')] }))
    assert.equal(buildGroupReport(rows)!.patterns[0].count, 10)
  })
})

describe('package suggestion', () => {
  const c = (id: string, codes: string[], priceCents = 2900) => ({ id, nameEn: id, nameAr: id, priceCents, codes })
  test('picks the package sharing the most scales', () => {
    const s = pickPackage([c('a', ['PHQ9', 'GAD7', 'ISI']), c('b', ['PHQ9', 'OLBI'])], ['PHQ9', 'GAD7'])!
    assert.equal(s.id, 'a')
    assert.equal(s.matched, 2)
    assert.equal(s.total, 3)
    assert.equal(s.priceUSD, 29)
  })
  test('on a tie prefers the bigger share done, then the lower price', () => {
    assert.equal(pickPackage([c('big', ['PHQ9', 'A', 'B', 'C']), c('small', ['PHQ9', 'D'])], ['PHQ9'])!.id, 'small')
    assert.equal(pickPackage([c('dear', ['PHQ9', 'A'], 3900), c('cheap', ['PHQ9', 'B'], 1900)], ['PHQ9'])!.id, 'cheap')
  })
  test('none when nothing overlaps', () => {
    assert.equal(pickPackage([c('a', ['X'])], ['PHQ9']), null)
    assert.equal(pickPackage([], ['PHQ9']), null)
  })
})

describe('free per-scale summary', () => {
  const results = [
    { code: 'PHQ9', name: 'PHQ-9', highRisk: false },
    { code: 'GAD7', name: 'GAD-7', highRisk: false },
  ]
  const good = JSON.stringify({
    summary: 'PHQ-9 is mild. GAD-7 is minimal.',
    scales: [
      { code: 'GAD7', meaning: 'minimal anxiety', next_step: 'keep going' },
      { code: 'PHQ9', meaning: 'mild low mood', next_step: 'routine' },
      { code: 'XXX', meaning: 'not taken', next_step: 'n/a' },
    ],
    overall_tone: 'positive',
    high_priority_scale: 'PHQ9',
    patterns: ['sleep is affecting mood'],
  })
  test('keeps only the user’s scales, in their order, and drops any cross-scale field', () => {
    const s = parseScaleSummary(`noise ${good} noise`, results)!
    assert.deepEqual(s.scales.map(x => x.code), ['PHQ9', 'GAD7'])
    assert.equal(s.scales[0].name, 'PHQ-9')
    assert.equal(s.high_priority_scale, 'PHQ9')
    assert.ok(!('patterns' in s))
  })
  test('a high-risk result forces an urgent tone', () => {
    const s = parseScaleSummary(good, [{ ...results[0], highRisk: true }, results[1]])!
    assert.equal(s.overall_tone, 'urgent')
  })
  test('unknown tone falls back to cautionary; bad high-priority code is dropped', () => {
    const s = parseScaleSummary(JSON.stringify({ summary: 'x', scales: [{ code: 'PHQ9', meaning: 'm', next_step: 'n' }], overall_tone: 'great', high_priority_scale: 'NOPE' }), results)!
    assert.equal(s.overall_tone, 'cautionary')
    assert.equal(s.high_priority_scale, null)
  })
  test('unusable output is rejected', () => {
    for (const raw of ['', 'not json', '{"summary":"x"}', '{"summary":"x","scales":[]}', '{"summary":"","scales":[{"code":"PHQ9","meaning":"m","next_step":"n"}]}']) {
      assert.equal(parseScaleSummary(raw, results), null, raw)
    }
  })
})

describe('bulk codes email', () => {
  test('lists every code, escapes names, links the order page', () => {
    const m = bulkCodesEmail({
      to: 'buyer@example.com',
      pkg: { en: 'Stress <b>', ar: 'ضغط' },
      amount: '$290.00',
      codes: ['AAAA-BBBB-CCCC', 'DDDD-EEEE-FFFF'],
      redeemUrl: 'https://app.example.com/redeem',
      orderUrl: 'https://app.example.com/billing/codes/p1',
    })
    assert.equal(m.to, 'buyer@example.com')
    assert.ok(m.html.includes('AAAA-BBBB-CCCC') && m.html.includes('DDDD-EEEE-FFFF'))
    assert.ok(m.text.includes('DDDD-EEEE-FFFF'))
    assert.ok(m.html.includes('/billing/codes/p1'))
    assert.ok(!m.html.includes('<b>') && m.html.includes('&lt;b&gt;'))
    assert.match(m.subject, /2/)
  })
})
