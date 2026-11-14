/**
 * The free AI summary: each result explained on its own. Reading scales
 * together is the paid package report's job, so the shape here has no
 * cross-scale "patterns" field.
 */

export type Tone = 'positive' | 'cautionary' | 'urgent'

export interface ScaleSummary {
  summary: string
  scales: { code: string; name: string; meaning: string; next_step: string }[]
  overall_tone: Tone
  high_priority_scale: string | null
}

const MAX_LEN = 1000

function str(x: unknown): string | null {
  return typeof x === 'string' && x.trim() ? x.trim().slice(0, MAX_LEN) : null
}

/**
 * Parse and check the model's JSON. Keeps only scales the user actually has
 * (by code, in their order), and forces an urgent tone when any result is
 * flagged high risk, whatever the model said. Returns null if unusable.
 */
export function parseScaleSummary(
  raw: string,
  results: { code: string; name: string; highRisk: boolean }[]
): ScaleSummary | null {
  let parsed: Record<string, unknown>
  try {
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return null
    parsed = JSON.parse(m[0])
  } catch {
    return null
  }
  const summary = str(parsed.summary)
  if (!summary || !Array.isArray(parsed.scales)) return null

  const byCode = new Map<string, { meaning: string; next_step: string }>()
  for (const s of parsed.scales as unknown[]) {
    if (!s || typeof s !== 'object') continue
    const o = s as Record<string, unknown>
    const code = str(o.code)
    const meaning = str(o.meaning)
    const next = str(o.next_step)
    if (code && meaning && next && !byCode.has(code)) byCode.set(code, { meaning, next_step: next })
  }
  const scales = results
    .filter(r => byCode.has(r.code))
    .map(r => ({ code: r.code, name: r.name, ...byCode.get(r.code)! }))
  if (scales.length === 0) return null

  const anyHighRisk = results.some(r => r.highRisk)
  const tone: Tone = anyHighRisk
    ? 'urgent'
    : parsed.overall_tone === 'positive' || parsed.overall_tone === 'cautionary' || parsed.overall_tone === 'urgent'
      ? parsed.overall_tone
      : 'cautionary'
  const hp = str(parsed.high_priority_scale)
  return {
    summary,
    scales,
    overall_tone: tone,
    high_priority_scale: hp && results.some(r => r.code === hp) ? hp : null,
  }
}
