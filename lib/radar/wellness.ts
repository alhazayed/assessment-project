/**
 * Mental-health radar normalization logic.
 *
 * Pure, dependency-free scoring helpers so the mapping from raw assessment
 * scores to a 0–100 "wellness" scale can be unit-tested in isolation, without
 * pulling in React or recharts. The radar component renders whatever this
 * produces — keeping the math here means the chart and the tests share one
 * source of truth for how a score becomes a domain wellness percentage.
 */

export type ScoreEntry = {
  submitted_at: string
  total_score: number
  assessment_definitions: { name_en: string; name_ar: string; code: string } | null
}

export type DomainConfig = {
  en: string
  ar: string
}

export type ScaleRadarConfig = {
  domain: string
  minScore: number
  maxScore: number
  higherIsBetter: boolean
}

export type RadarPoint = { domain: string; wellness: number; fullMark: number }

export const DOMAINS: Record<string, DomainConfig> = {
  'Depression':    { en: 'Depression',    ar: 'الاكتئاب' },
  'Anxiety':       { en: 'Anxiety',       ar: 'القلق' },
  'Stress':        { en: 'Stress',        ar: 'التوتر' },
  'Sleep':         { en: 'Sleep',         ar: 'النوم' },
  'Resilience':    { en: 'Resilience',    ar: 'المرونة' },
  'Wellbeing':     { en: 'Wellbeing',     ar: 'الرفاهية' },
  'Trauma':        { en: 'Trauma',        ar: 'الصدمة' },
  'Social':        { en: 'Social',        ar: 'الاجتماعي' },
  'Burnout':       { en: 'Burnout',       ar: 'الإرهاق' },
  'Mindfulness':   { en: 'Mindfulness',   ar: 'اليقظة' },
  'Emotion Reg.':  { en: 'Emotion Reg.',  ar: 'المشاعر' },
  'Eating':        { en: 'Eating',        ar: 'الأكل' },
  'Substance':     { en: 'Substance',     ar: 'المواد' },
  'ADHD':          { en: 'ADHD',          ar: 'فرط الحركة' },
  'OCD':           { en: 'OCD',           ar: 'الوسواس' },
  'Mood':          { en: 'Mood',          ar: 'المزاج' },
  'Somatic':       { en: 'Somatic',       ar: 'الجسدي' },
}

export const SCALE_CONFIG: Record<string, ScaleRadarConfig> = {
  PHQ9:   { domain: 'Depression',   minScore: 0,   maxScore: 27,  higherIsBetter: false },
  PHQ15:  { domain: 'Somatic',      minScore: 0,   maxScore: 30,  higherIsBetter: false },
  CESD:   { domain: 'Depression',   minScore: 0,   maxScore: 60,  higherIsBetter: false },
  GDS15:  { domain: 'Depression',   minScore: 0,   maxScore: 15,  higherIsBetter: false },
  GAD7:   { domain: 'Anxiety',      minScore: 0,   maxScore: 21,  higherIsBetter: false },
  ASI3:   { domain: 'Anxiety',      minScore: 0,   maxScore: 72,  higherIsBetter: false },
  PDSS:   { domain: 'Anxiety',      minScore: 0,   maxScore: 28,  higherIsBetter: false },
  PSWQ:   { domain: 'Anxiety',      minScore: 16,  maxScore: 80,  higherIsBetter: false },
  DASS21: { domain: 'Stress',       minScore: 0,   maxScore: 126, higherIsBetter: false },
  PSS10:  { domain: 'Stress',       minScore: 0,   maxScore: 40,  higherIsBetter: false },
  PSS4:   { domain: 'Stress',       minScore: 0,   maxScore: 16,  higherIsBetter: false },
  K10:    { domain: 'Stress',       minScore: 10,  maxScore: 50,  higherIsBetter: false },
  ISI:    { domain: 'Sleep',        minScore: 0,   maxScore: 28,  higherIsBetter: false },
  BRS:    { domain: 'Resilience',   minScore: 6,   maxScore: 30,  higherIsBetter: true  },
  CDRISC: { domain: 'Resilience',   minScore: 0,   maxScore: 100, higherIsBetter: true  },
  WHO5:   { domain: 'Wellbeing',    minScore: 0,   maxScore: 100, higherIsBetter: true  },
  WHOQOL: { domain: 'Wellbeing',    minScore: 26,  maxScore: 130, higherIsBetter: true  },
  SWLS:   { domain: 'Wellbeing',    minScore: 5,   maxScore: 35,  higherIsBetter: true  },
  RSES:   { domain: 'Wellbeing',    minScore: 0,   maxScore: 30,  higherIsBetter: true  },
  PCL5:   { domain: 'Trauma',       minScore: 0,   maxScore: 80,  higherIsBetter: false },
  IESR:   { domain: 'Trauma',       minScore: 0,   maxScore: 75,  higherIsBetter: false },
  ACE:    { domain: 'Trauma',       minScore: 0,   maxScore: 10,  higherIsBetter: false },
  LSAS:   { domain: 'Social',       minScore: 0,   maxScore: 144, higherIsBetter: false },
  SPIN:   { domain: 'Social',       minScore: 0,   maxScore: 72,  higherIsBetter: false },
  UCLA:   { domain: 'Social',       minScore: 3,   maxScore: 9,   higherIsBetter: false },
  OLBI:   { domain: 'Burnout',      minScore: 16,  maxScore: 64,  higherIsBetter: false },
  FFMQ:   { domain: 'Mindfulness',  minScore: 39,  maxScore: 195, higherIsBetter: true  },
  DERS:   { domain: 'Emotion Reg.', minScore: 36,  maxScore: 180, higherIsBetter: false },
  EAT26:  { domain: 'Eating',       minScore: 0,   maxScore: 78,  higherIsBetter: false },
  AUDIT:  { domain: 'Substance',    minScore: 0,   maxScore: 40,  higherIsBetter: false },
  CAGE:   { domain: 'Substance',    minScore: 0,   maxScore: 4,   higherIsBetter: false },
  ASRS:   { domain: 'ADHD',         minScore: 0,   maxScore: 72,  higherIsBetter: false },
  OCIR:   { domain: 'OCD',          minScore: 0,   maxScore: 72,  higherIsBetter: false },
  MDQ:    { domain: 'Mood',         minScore: 0,   maxScore: 13,  higherIsBetter: false },
  ASRM:   { domain: 'Mood',         minScore: 0,   maxScore: 20,  higherIsBetter: false },
}

/**
 * Map a raw assessment score to a 0–100 wellness percentage.
 *
 * For "higher is better" scales (e.g. resilience) a higher raw score maps to
 * higher wellness; for symptom scales (e.g. depression) it inverts so that a
 * higher symptom burden maps to lower wellness. The result is clamped to
 * [0, 100] so out-of-range scores can never produce nonsensical points.
 */
export function toWellness(score: number, cfg: ScaleRadarConfig): number {
  const range = cfg.maxScore - cfg.minScore
  if (range === 0) return 50
  const raw = cfg.higherIsBetter
    ? (score - cfg.minScore) / range
    : (cfg.maxScore - score) / range
  return Math.round(Math.min(1, Math.max(0, raw)) * 100)
}

/**
 * Build the radar series from a patient's score history.
 *
 * Keeps only the most recent score per assessment code, converts each to a
 * wellness percentage, averages codes that share a domain, and returns the
 * domains sorted by their localized label. `scoreHistory` is expected
 * oldest-first (as returned by the insights query); the reverse walk means the
 * last occurrence of each code wins.
 */
export function buildRadarData(scoreHistory: ScoreEntry[], isAr: boolean): RadarPoint[] {
  const seenCodes = new Set<string>()
  const latestPerCode: Record<string, number> = {}

  for (const s of [...scoreHistory].reverse()) {
    const code = s.assessment_definitions?.code
    if (!code || seenCodes.has(code)) continue
    seenCodes.add(code)
    latestPerCode[code] = s.total_score
  }

  const domainScores: Record<string, number[]> = {}

  for (const [code, score] of Object.entries(latestPerCode)) {
    const cfg = SCALE_CONFIG[code]
    if (!cfg) continue
    const wellness = toWellness(score, cfg)
    if (!domainScores[cfg.domain]) domainScores[cfg.domain] = []
    domainScores[cfg.domain].push(wellness)
  }

  return Object.entries(domainScores)
    .filter(([, scores]) => scores.length > 0)
    .map(([domainKey, scores]) => ({
      domain: isAr ? (DOMAINS[domainKey]?.ar ?? domainKey) : (DOMAINS[domainKey]?.en ?? domainKey),
      wellness: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      fullMark: 100,
    }))
    .sort((a, b) => a.domain.localeCompare(b.domain))
}
