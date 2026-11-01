/**
 * Profile packages: scale scoring + pattern rules (lib/package-profiles).
 * Run: npm run test:packages
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PROFILE_DEFS, buildProfileReport, toResultColumns, SCALE_INFO } from '../../lib/package-profiles'
import type { ItemResponse, ScaleInput } from '../../lib/package-profiles'

function scale(code: string, total: number, responses: ItemResponse[] = []): ScaleInput {
  return { code, total, submitted_at: '2026-10-30T10:00:00Z', band: null, bandColor: null, responses }
}
/** n items on one subscale, all with the same value. */
function items(subscale: string | null, n: number, value: number, start = 1): ItemResponse[] {
  return Array.from({ length: n }, (_, i) => ({ item_number: start + i, subscale, value }))
}
function phq9(total: number, item9 = 0): ScaleInput {
  return scale('PHQ9', total, [{ item_number: 9, subscale: null, value: item9 }])
}
const ids = (r: ReturnType<typeof buildProfileReport>) => r.patterns.map(p => p.id)

describe('package profile definitions', () => {
  it('defines the six launch packages', () => {
    assert.deepEqual(Object.keys(PROFILE_DEFS).sort(), [
      'athlete_performance', 'mental_health_checkup', 'mood_clarity',
      'personal_growth', 'relationship_readiness', 'stress_burnout_recovery',
    ])
  })
  it('only uses scales the engine knows how to name and score', () => {
    for (const def of Object.values(PROFILE_DEFS)) {
      for (const code of def.codes) assert.ok(SCALE_INFO[code], `${def.key} uses unknown scale ${code}`)
    }
  })
  it('has Arabic text for every rule', () => {
    for (const def of Object.values(PROFILE_DEFS)) {
      for (const r of def.rules) {
        assert.ok(r.title.ar && r.text.ar, `${def.key}.${r.id} missing Arabic`)
        if (r.recommendation) assert.ok(r.recommendation.ar, `${def.key}.${r.id} recommendation missing Arabic`)
      }
    }
  })
})

describe('Mental Health Check-up', () => {
  const def = PROFILE_DEFS.mental_health_checkup

  it('reads anxious depression with PHQ-ADS, the quadrant and insomnia together', () => {
    const r = buildProfileReport(def, [phq9(12), scale('GAD7', 11), scale('PHQ15', 4), scale('WHO5', 10), scale('ISI', 16)])
    assert.equal(r.composite?.score, 23)
    assert.equal(r.composite?.band.en, 'Moderate')
    assert.equal(r.quadrant?.result.en, 'Struggling')
    assert.equal(r.headline.en, 'Depression and anxiety together')
    assert.ok(ids(r).includes('insomnia_with_distress'))
    assert.ok(!ids(r).includes('depression') && !ids(r).includes('anxiety'))
    assert.equal(r.safety, false)
  })

  it('puts a self-harm answer first, whatever the totals', () => {
    const r = buildProfileReport(def, [phq9(6, 1), scale('GAD7', 3), scale('PHQ15', 2), scale('WHO5', 20), scale('ISI', 2)])
    assert.equal(r.safety, true)
    assert.equal(r.patterns[0].id, 'safety_self_harm')
    assert.equal(r.headline.en, r.patterns[0].title.en)
  })

  it('separates languishing (few symptoms, low wellbeing) from flourishing', () => {
    const lang = buildProfileReport(def, [phq9(3), scale('GAD7', 2), scale('PHQ15', 3), scale('WHO5', 9), scale('ISI', 3)])
    assert.equal(lang.quadrant?.result.en, 'Languishing')
    const flour = buildProfileReport(def, [phq9(3), scale('GAD7', 2), scale('PHQ15', 3), scale('WHO5', 20), scale('ISI', 3)])
    assert.equal(flour.quadrant?.result.en, 'Flourishing')
    assert.equal(flour.headline.en, 'No major concerns in this check-up')
  })

  it('flags body-first distress only when mood scores are lower', () => {
    const r = buildProfileReport(def, [phq9(5), scale('GAD7', 4), scale('PHQ15', 12), scale('WHO5', 15), scale('ISI', 5)])
    assert.ok(ids(r).includes('body_first'))
  })

  it('lists missing scales and skips rules that need them', () => {
    const r = buildProfileReport(def, [phq9(12), scale('GAD7', 11)])
    assert.deepEqual(r.missing, ['PHQ15', 'WHO5', 'ISI'])
    assert.equal(r.quadrant, null)
    assert.ok(!ids(r).includes('insomnia_with_distress'))
  })
})

describe('Stress, Burnout & Recovery', () => {
  const def = PROFILE_DEFS.stress_burnout_recovery
  const olbi = (e: number, d: number) => scale('OLBI', 0, [...items('E', 9, e), ...items('D', 7, d, 10)])
  const rest = [scale('PSS10', 20), scale('ISI', 6), scale('BRS', 21), scale('WHO5', 15)]

  it('reads burnout without depression as work-contained', () => {
    const r = buildProfileReport(def, [olbi(3, 3), phq9(4), ...rest])
    assert.equal(r.quadrant?.result.en, 'Burnout')
    assert.equal(r.headline.en, 'Burnout contained to work')
  })

  it('escalates burnout plus PHQ-9 >= 10 to a health issue', () => {
    const r = buildProfileReport(def, [olbi(3, 3), phq9(12), ...rest])
    assert.equal(r.patterns[0].id, 'burnout_with_depression')
    assert.ok(!ids(r).includes('work_burnout'))
  })

  it('names depression that work does not explain', () => {
    const r = buildProfileReport(def, [olbi(1.5, 1.5), phq9(14), ...rest])
    assert.equal(r.patterns[0].id, 'depression_not_work')
  })

  it('uses OLBI subscale means, not the total', () => {
    const r = buildProfileReport(def, [olbi(3, 2), phq9(2), ...rest])
    assert.equal(r.quadrant?.result.en, 'Exhausted but engaged')
  })
})

describe('Relationship & Marriage Readiness', () => {
  const def = PROFILE_DEFS.relationship_readiness
  const ipip = (n: number, other = 3) => scale('IPIP120', 0, [
    ...items('N-Anxiety', 24, n), ...items('E-Friendliness', 24, other, 25), ...items('O-Intellect', 24, other, 49),
    ...items('A-Trust', 24, other, 73), ...items('C-Orderliness', 24, other, 97),
  ])
  const ecrr = (anx: number, avo: number) => scale('ECRR', 0, [...items('Anxiety', 18, anx), ...items('Avoidance', 18, avo, 19)])

  it('classifies attachment from the two ECR-R dimensions', () => {
    const r = buildProfileReport(def, [ipip(3), ecrr(5, 2), scale('DERS', 60), phq9(3), scale('GAD7', 3), scale('SWLS', 26)])
    assert.equal(r.quadrant?.result.en, 'Anxious (preoccupied)')
    assert.equal(r.scales.find(s => s.code === 'IPIP120')?.subscales.length, 5)
  })

  it('flags conflict reactivity from high neuroticism plus high DERS', () => {
    const r = buildProfileReport(def, [ipip(4.2), ecrr(2, 2), scale('DERS', 90), phq9(3), scale('GAD7', 3), scale('SWLS', 20)])
    assert.equal(r.headline.en, 'Strong emotional reactions in conflict')
  })
})

describe('Athlete Mental Performance & Health', () => {
  const def = PROFILE_DEFS.athlete_performance
  const acsi = (worry: number) => scale('ACSI28', 0, [
    ...items('coping_adversity', 4, 2), ...items('peaking_pressure', 4, 2, 5), ...items('goal_setting', 4, 3, 9),
    ...items('concentration', 4, 2, 13), ...items('freedom_worry', 4, worry, 17), ...items('confidence', 4, 2, 21),
    ...items('coachability', 4, 1, 25),
  ])
  const audit = (c: number) => scale('AUDIT', c, [
    { item_number: 1, subscale: null, value: c }, { item_number: 2, subscale: null, value: 0 }, { item_number: 3, subscale: null, value: 0 },
  ])

  it('treats low freedom-from-worry plus GAD-7 >= 10 as wider anxiety', () => {
    const r = buildProfileReport(def, [{ ...acsi(0.75), total: 40 }, scale('GAD7', 12), phq9(4), scale('ISI', 5), audit(1), scale('EAT26', 5), scale('BRS', 20)])
    assert.ok(ids(r).includes('worry_is_anxiety'))
    assert.ok(!ids(r).includes('anxiety'))
  })

  it('names strongest and weakest mental skill', () => {
    const r = buildProfileReport(def, [{ ...acsi(2), total: 50 }, scale('GAD7', 3), phq9(2), scale('ISI', 4), audit(1), scale('EAT26', 5), scale('BRS', 22)])
    const p = r.patterns.find(x => x.id === 'skills_profile')
    assert.ok(p && p.text.en.includes('Goal setting') && p.text.en.includes('Coachability'))
    assert.equal(r.headline.en, 'Ready to train and compete')
  })

  it('flags AUDIT-C >= 4', () => {
    const r = buildProfileReport(def, [{ ...acsi(2), total: 50 }, scale('GAD7', 3), phq9(2), scale('ISI', 4), audit(4), scale('EAT26', 5), scale('BRS', 22)])
    assert.ok(ids(r).includes('alcohol'))
    assert.ok(!ids(r).includes('ready_to_compete'))
  })
})

describe('Mood Clarity', () => {
  const def = PROFILE_DEFS.mood_clarity
  it('puts a positive bipolar screen ahead of depression', () => {
    const r = buildProfileReport(def, [phq9(15), scale('GAD7', 6), scale('MDQ', 8), scale('ASRM', 2), scale('ISI', 5)])
    assert.equal(r.patterns[0].id, 'possible_bipolar')
    assert.ok(!ids(r).includes('unipolar_depression'))
  })
  it('reads depression with negative screens as unipolar', () => {
    const r = buildProfileReport(def, [phq9(15), scale('GAD7', 6), scale('MDQ', 3), scale('ASRM', 2), scale('ISI', 5)])
    assert.equal(r.headline.en, 'Depression without signs of bipolarity')
  })
})

describe('toResultColumns', () => {
  it('splits patterns and de-duplicates recommendations', () => {
    const r = buildProfileReport(PROFILE_DEFS.athlete_performance, [
      scale('GAD7', 12), phq9(12), scale('ISI', 3), scale('EAT26', 3), scale('BRS', 25),
    ])
    const cols = toResultColumns(r)
    assert.equal(cols.recommendations_en.length, new Set(cols.recommendations_en).size)
    assert.equal(cols.risk_indicators_en.length, cols.risk_indicators_ar.length)
    assert.ok(cols.risk_indicators_en.includes('Signs of depression'))
  })
})
