import type { SupabaseClient } from '@supabase/supabase-js'
import type { ScoringBand } from '@/lib/types'
import type { ProfileDef, ScaleInput } from './types'

const COLOR_CLASS: Record<string, string> = {
  green: '#22c55e', yellow: '#eab308', amber: '#f59e0b', orange: '#f97316', red: '#ef4444',
}

/** scoring_logic colours are a mix of names, hex values and Tailwind classes. */
function toHex(color: string | undefined): string | null {
  if (!color) return null
  if (color.startsWith('#')) return color
  if (COLOR_CLASS[color]) return COLOR_CLASS[color]
  const m = color.match(/text-(green|yellow|amber|orange|red)-/)
  return m ? COLOR_CLASS[m[1]] : null
}

/**
 * Read the user's latest submission (and its item responses) for every scale in
 * a profile package. Uses the service-role client, so callers must already have
 * checked that `userId` is the signed-in user.
 */
export async function loadScaleInputs(db: SupabaseClient, userId: string, def: ProfileDef): Promise<ScaleInput[]> {
  const { data: defs } = await db
    .from('assessment_definitions')
    .select('id, code, scoring_logic')
    .in('code', def.codes)
    .eq('is_active', true)
  if (!defs?.length) return []

  const { data: subs } = await db
    .from('assessment_submissions')
    .select('id, definition_id, total_score, submitted_at')
    .eq('patient_id', userId)
    .in('definition_id', defs.map(d => d.id))
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })

  const latest = new Map<string, { id: string; total_score: number; submitted_at: string }>()
  for (const s of subs ?? []) if (!latest.has(s.definition_id)) latest.set(s.definition_id, s)
  if (latest.size === 0) return []

  const subIds = [...latest.values()].map(s => s.id)
  const { data: responses } = await db
    .from('assessment_responses')
    .select('submission_id, response_value, assessment_items(item_number, subscale)')
    .in('submission_id', subIds)

  const bySub = new Map<string, ScaleInput['responses']>()
  for (const r of (responses ?? []) as unknown as {
    submission_id: string
    response_value: number
    assessment_items: { item_number: number; subscale: string | null } | null
  }[]) {
    if (!r.assessment_items) continue
    const arr = bySub.get(r.submission_id) ?? []
    arr.push({ item_number: r.assessment_items.item_number, subscale: r.assessment_items.subscale, value: Number(r.response_value) })
    bySub.set(r.submission_id, arr)
  }

  const inputs: ScaleInput[] = []
  for (const d of defs) {
    const s = latest.get(d.id)
    if (!s) continue
    const bands = (Array.isArray(d.scoring_logic) ? d.scoring_logic : []) as ScoringBand[]
    const band = bands.find(b => s.total_score >= b.min && s.total_score <= b.max)
    inputs.push({
      code: d.code,
      total: Number(s.total_score),
      submitted_at: s.submitted_at,
      band: band ? { en: band.severity_en, ar: band.severity_ar } : null,
      bandColor: toHex(band?.color),
      responses: bySub.get(s.id) ?? [],
    })
  }
  return inputs
}
