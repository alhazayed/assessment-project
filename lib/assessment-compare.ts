// Pure helpers for comparing two attempts of the same assessment. Kept
// framework-free so both the result page (auto-compare vs last attempt) and the
// history page (compare any two) reuse identical logic, and so it is unit-testable.

export interface AttemptAnswer {
  value: number
  label_en: string
  label_ar: string
}

export interface Attempt {
  id: string
  submitted_at: string
  total_score: number
  severity_band: string | null
  high_risk_flag: boolean
  answers: Record<string, AttemptAnswer>
}

export interface CompareItem {
  id: string
  item_number: number
  question_en: string
  question_ar: string
}

export interface ChangedAnswer {
  item: CompareItem
  from: AttemptAnswer | null
  to: AttemptAnswer | null
  delta: number | null
}

export interface AttemptComparison {
  scoreDelta: number
  bandChanged: boolean
  fromBand: string | null
  toBand: string | null
  changed: ChangedAnswer[]
  unchangedCount: number
}

/**
 * Compare a `to` attempt (more recent) against a `from` attempt (older).
 * `scoreDelta` is to − from (positive = higher total on the recent attempt).
 * We deliberately do NOT label a change "better"/"worse": direction depends on
 * the scale (lower is better for PHQ-9, higher is better for WHO-5, neutral for
 * personality), and that metadata is not carried here — the UI shows the
 * direction and both severity bands and lets the reader interpret.
 */
export function compareAttempts(from: Attempt, to: Attempt, items: CompareItem[]): AttemptComparison {
  const changed: ChangedAnswer[] = []
  let unchangedCount = 0

  for (const item of items) {
    const a = from.answers[item.id] ?? null
    const b = to.answers[item.id] ?? null
    const av = a?.value ?? null
    const bv = b?.value ?? null
    if (av === bv) {
      if (a || b) unchangedCount++
      continue
    }
    changed.push({
      item,
      from: a,
      to: b,
      delta: av !== null && bv !== null ? bv - av : null,
    })
  }

  return {
    scoreDelta: to.total_score - from.total_score,
    bandChanged: (from.severity_band ?? '') !== (to.severity_band ?? ''),
    fromBand: from.severity_band ?? null,
    toBand: to.severity_band ?? null,
    changed,
    unchangedCount,
  }
}
