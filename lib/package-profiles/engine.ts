import { scoreScale } from './scales'
import type { Bi, FiredPattern, Metrics, ProfileDef, ProfileReport, ScaleInput, ScaleResult } from './types'

const KIND_ORDER = { safety: 0, clinical: 1, attention: 2, info: 3, strength: 4 } as const

/**
 * Build a profile report from the latest submission of each scale.
 * Pure function: no database access, so it is unit-testable.
 */
export function buildProfileReport(def: ProfileDef, inputs: ScaleInput[]): ProfileReport {
  const byCode = new Map(inputs.map(i => [i.code, i]))
  const metrics: Metrics = {}
  const results: Record<string, ScaleResult> = {}
  const scales: ScaleResult[] = []
  const missing: string[] = []

  for (const code of def.codes) {
    const input = byCode.get(code)
    if (!input) { missing.push(code); continue }
    const { result, metrics: m } = scoreScale(input)
    Object.assign(metrics, m)
    results[code] = result
    scales.push(result)
  }

  const has = (keys: string[]) => keys.every(k => Number.isFinite(metrics[k]))

  const patterns: FiredPattern[] = []
  for (const rule of def.rules) {
    if (!has(rule.needs)) continue
    if (!rule.when(metrics)) continue
    patterns.push({
      id: rule.id, kind: rule.kind, priority: rule.priority,
      title: rule.title, text: rule.text, recommendation: rule.recommendation, evidence: rule.evidence,
    })
  }
  if (def.extras) patterns.push(...def.extras(results, metrics))
  patterns.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.priority - b.priority)

  let composite: ProfileReport['composite'] = null
  if (def.composite && has(def.composite.needs)) {
    const score = def.composite.compute(metrics)
    const band = def.composite.bands.find(b => score >= b.min && score <= b.max) ?? def.composite.bands[def.composite.bands.length - 1]
    composite = { label: def.composite.label, score, max: def.composite.max, band: band.label, color: band.color, evidence: def.composite.evidence }
  }

  let quadrant: ProfileReport['quadrant'] = null
  if (def.quadrant && has(def.quadrant.needs)) {
    const q = def.quadrant.classify(metrics)
    quadrant = { label: def.quadrant.label, result: q.label, text: q.text, color: q.color, evidence: def.quadrant.evidence }
  }

  const concern = patterns.find(p => p.kind === 'safety' || p.kind === 'clinical' || p.kind === 'attention')
  // Only a headline-worthy strength (priority 5 or lower, e.g. "Thriving") replaces the default.
  const strength = patterns.find(p => p.kind === 'strength' && p.priority <= 5)
  const headline: Bi = concern?.title ?? strength?.title ?? def.defaultHeadline

  return {
    kind: 'profile',
    version: 1,
    key: def.key,
    headline,
    safety: patterns.some(p => p.kind === 'safety'),
    composite,
    quadrant,
    scales,
    patterns,
    missing,
    notes: def.notes ?? [],
  }
}

/** Split fired patterns into the legacy package_results text columns. */
export function toResultColumns(report: ProfileReport) {
  const strengths = report.patterns.filter(p => p.kind === 'strength')
  const risks = report.patterns.filter(p => p.kind === 'safety' || p.kind === 'clinical' || p.kind === 'attention')
  const recs: Bi[] = []
  const seen = new Set<string>()
  for (const p of report.patterns) {
    if (p.recommendation && !seen.has(p.recommendation.en)) {
      seen.add(p.recommendation.en)
      recs.push(p.recommendation)
    }
  }
  return {
    strengths_en: strengths.map(p => p.title.en),
    strengths_ar: strengths.map(p => p.title.ar),
    risk_indicators_en: risks.map(p => p.title.en),
    risk_indicators_ar: risks.map(p => p.title.ar),
    recommendations_en: recs.map(r => r.en),
    recommendations_ar: recs.map(r => r.ar),
  }
}
