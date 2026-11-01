/**
 * Types for "profile" packages: packages whose combined report is a profile of
 * separately scored scales plus evidence-based pattern rules, instead of a
 * weighted average of normalised scores.
 */

export interface Bi {
  en: string
  ar: string
}

/** One stored item response, as read from assessment_responses + assessment_items. */
export interface ItemResponse {
  item_number: number
  subscale: string | null
  value: number
}

/** The latest submission of one scale, as fed into the engine. */
export interface ScaleInput {
  code: string
  total: number
  submitted_at: string | null
  /** Band from assessment_definitions.scoring_logic, already resolved. */
  band: Bi | null
  bandColor: string | null
  responses: ItemResponse[]
}

/** A derived subscale (facet, domain, dimension) shown in the report. */
export interface SubscaleScore {
  key: string
  label: Bi
  /** Score on the subscale's own metric (mean or sum, see `metric`). */
  score: number
  metric: 'mean' | 'sum'
  min: number
  max: number
}

export interface ScaleResult {
  code: string
  name: Bi
  total: number
  max: number | null
  submitted_at: string | null
  band: Bi | null
  bandColor: string | null
  subscales: SubscaleScore[]
}

/** Flat numbers the pattern rules read, keyed `CODE.metric` (e.g. `PHQ9.total`). */
export type Metrics = Record<string, number>

export type PatternKind = 'safety' | 'clinical' | 'attention' | 'strength' | 'info'

export interface PatternRule {
  id: string
  kind: PatternKind
  /** Lower number = shown first and more likely to be the headline. */
  priority: number
  /** Every metric the rule reads; the rule is skipped if one is missing. */
  needs: string[]
  when: (m: Metrics) => boolean
  title: Bi
  text: Bi
  recommendation?: Bi
  /** Short citation shown under the pattern. */
  evidence?: string
}

export interface CompositeDef {
  label: Bi
  needs: string[]
  compute: (m: Metrics) => number
  max: number
  bands: { min: number; max: number; label: Bi; color: string }[]
  evidence: string
}

export interface ProfileDef {
  key: string
  /** Scale codes in display order. */
  codes: string[]
  composite?: CompositeDef
  /** Optional quadrant (two-axis) classification. */
  quadrant?: {
    label: Bi
    needs: string[]
    classify: (m: Metrics) => { label: Bi; text: Bi; color: string }
    evidence: string
  }
  rules: PatternRule[]
  /** Patterns whose wording depends on which subscale is highest or lowest. */
  extras?: (results: Record<string, ScaleResult>, m: Metrics) => FiredPattern[]
  /** Headline used when no clinical/attention/safety pattern fires. */
  defaultHeadline: Bi
  /** Extra notes always shown (e.g. English-only validation). */
  notes?: Bi[]
}

export interface FiredPattern {
  id: string
  kind: PatternKind
  priority: number
  title: Bi
  text: Bi
  recommendation?: Bi
  evidence?: string
}

/** Stored in package_results.dimension_scores for profile packages. */
export interface ProfileReport {
  kind: 'profile'
  version: 1
  key: string
  headline: Bi
  safety: boolean
  composite: { label: Bi; score: number; max: number; band: Bi; color: string; evidence: string } | null
  quadrant: { label: Bi; result: Bi; text: Bi; color: string; evidence: string } | null
  scales: ScaleResult[]
  patterns: FiredPattern[]
  missing: string[]
  notes: Bi[]
}

export function isProfileReport(x: unknown): x is ProfileReport {
  return !!x && typeof x === 'object' && (x as { kind?: unknown }).kind === 'profile'
}
