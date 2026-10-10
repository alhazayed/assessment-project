// Single source of truth for turning a stored (English) severity_band label
// into a display level. Previously five copies of a substring matcher lived
// across the app; they painted "Moderately severe" orange (it contains
// "moderate"), "Low resilience" green (it contains "low") and "High
// resilience" red (fell through to the default).
//
// The explicit table covers every label in lib/severity-labels.ar.json, which
// is generated from assessment_definitions.scoring_logic. Labels not in the
// table (e.g. a newly added assessment) fall back to a conservative keyword
// match that checks the most severe terms first.

export type SeverityLevel = 'minimal' | 'mild' | 'moderate' | 'severe' | 'neutral'

const LEVELS: Record<string, SeverityLevel> = {
  // ── minimal / favourable ──
  'Average life satisfaction': 'minimal',
  'Average range': 'minimal',
  'Average to above average': 'minimal',
  'Average to good quality of life': 'minimal',
  'Below clinical threshold': 'minimal',
  'Below screening threshold': 'minimal',
  'Below threshold': 'minimal',
  'Good': 'minimal',
  'Good quality of life': 'minimal',
  'Good resilience': 'minimal',
  'High mindfulness': 'minimal',
  'High resilience': 'minimal',
  'High self-esteem': 'minimal',
  'Highly satisfied': 'minimal',
  'Low ACE score': 'minimal',
  'Low anxiety sensitivity': 'minimal',
  'Low burnout': 'minimal',
  'Low distress': 'minimal',
  'Low loneliness': 'minimal',
  'Low pathological worry': 'minimal',
  'Low risk': 'minimal',
  'Low stress': 'minimal',
  'Minimal': 'minimal',
  'Minimal difficulties': 'minimal',
  'No clinically significant depression': 'minimal',
  'No clinically significant insomnia': 'minimal',
  'No or mild social anxiety': 'minimal',
  'None': 'minimal',
  'None/minimal': 'minimal',
  'Normal': 'minimal',
  'Normal eating attitudes': 'minimal',
  'Normal range': 'minimal',
  'Normal resilience': 'minimal',
  'Normal self-esteem': 'minimal',
  'Satisfied': 'minimal',
  'Screen negative': 'minimal',
  'Unlikely manic/hypomanic episode': 'minimal',
  'Very high resilience': 'minimal',
  'Low': 'minimal',

  // ── mild ──
  'Mild': 'mild',
  'Mild OCD symptoms': 'mild',
  'Mild PTSD symptoms': 'mild',
  'Mild depression': 'mild',
  'Mild social anxiety': 'mild',
  'Mild–moderate distress': 'mild',
  'Slightly below average': 'mild',
  'Subclinical': 'mild',
  'Subthreshold insomnia': 'mild',
  'Below average': 'mild',
  'Below average quality of life': 'mild',
  'Dissatisfied': 'mild',
  'Moderate resilience': 'mild',
  'Medium': 'mild',

  // ── moderate ──
  'Moderate': 'moderate',
  'Moderate ACE score': 'moderate',
  'Moderate OCD symptoms': 'moderate',
  'Moderate PTSD symptoms': 'moderate',
  'Moderate anxiety sensitivity': 'moderate',
  'Moderate burnout': 'moderate',
  'Moderate depression': 'moderate',
  'Moderate distress': 'moderate',
  'Moderate insomnia': 'moderate',
  'Moderate loneliness': 'moderate',
  'Moderate social anxiety': 'moderate',
  'Moderate stress': 'moderate',
  'Moderate worry': 'moderate',
  'Elevated difficulties': 'moderate',
  'Hazardous use': 'moderate',
  'Symptoms possible': 'moderate',
  'Screen positive': 'moderate',
  'Possible dependence – evaluation recommended': 'moderate',
  'Possible manic/hypomanic episode – evaluation recommended': 'moderate',
  'Low mindfulness': 'moderate',
  'Low resilience': 'moderate',
  'Low self-esteem': 'moderate',
  'Poor quality of life': 'moderate',
  'Extremely dissatisfied': 'moderate',
  'High': 'moderate',

  // ── severe ──
  'Moderately severe': 'severe',
  'Moderate to severe depression': 'severe',
  'Moderate–severe distress': 'severe',
  'Severe': 'severe',
  'Severe OCD symptoms': 'severe',
  'Severe PTSD symptoms': 'severe',
  'Severe depression': 'severe',
  'Severe distress': 'severe',
  'Severe insomnia': 'severe',
  'Severe social anxiety': 'severe',
  'Very severe social anxiety': 'severe',
  'Very high distress': 'severe',
  'Very high loneliness': 'severe',
  'Very high anxiety sensitivity': 'severe',
  'Extreme': 'severe',
  'Abnormal eating attitudes': 'severe',
  'Harmful use': 'severe',
  'Likely alcohol use disorder': 'severe',
  'Likely Depression': 'severe',
  'Probable PTSD': 'severe',
  'Highly consistent with ADHD': 'severe',
  'High ACE score': 'severe',
  'High anxiety sensitivity': 'severe',
  'High burnout': 'severe',
  'High distress': 'severe',
  'High loneliness': 'severe',
  'High stress': 'severe',
  'High worry': 'severe',
  'Pathological worry': 'severe',
  'Marked social anxiety': 'severe',
  'Significant difficulties': 'severe',

  // ── descriptive profiles (no good/bad direction) ──
  'Balanced Personality Profile': 'neutral',
  'Expressive & Engaged Profile': 'neutral',
  'Highly Active & Open Profile': 'neutral',
  'Moderate Trait Expression': 'neutral',
  'Reserved & Structured Profile': 'neutral',
}

/** True when a label is covered by the explicit table (not the keyword fallback). */
export function hasExplicitSeverity(band: string): boolean {
  return band.trim() in LEVELS
}

/** Map a stored English severity_band label to a display level. */
export function bandToSeverity(band: string | null | undefined): SeverityLevel {
  if (!band) return 'neutral'
  const exact = LEVELS[band.trim()]
  if (exact) return exact

  // Fallback for labels not in the table. Order matters: check the most
  // severe wording first so "moderately severe" never reads as moderate.
  const b = band.toLowerCase()
  if (/severe|extreme|very high|probable|likely|harmful|significant|pathological/.test(b)) return 'severe'
  if (/moderate|elevated|possible|positive|hazardous/.test(b)) return 'moderate'
  if (/mild|subclinical|subthreshold|slightly/.test(b)) return 'mild'
  if (/minimal|none|normal|negative|no clinically|below (clinical|screening)? ?threshold/.test(b)) return 'minimal'
  if (/profile/.test(b)) return 'neutral'
  return 'neutral'
}

/** The shared `.badge-*` class for a band (see app/globals.css). */
export function severityBadgeClass(band: string | null | undefined): string {
  const level = bandToSeverity(band)
  return level === 'neutral' ? 'badge-neutral' : `badge-${level}`
}

/** True when a band should never be presented with a reassuring/check-mark style. */
export function isConcerningBand(band: string | null | undefined): boolean {
  const level = bandToSeverity(band)
  return level === 'moderate' || level === 'severe'
}
