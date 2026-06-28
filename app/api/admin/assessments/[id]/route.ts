import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Per-assessment deep-dive analytics (Phase 4).
//
// Computed directly from base tables (assessment_definitions / _submissions /
// _responses / _items) via the service-role client, then aggregated in code —
// the same pattern as the Clinical Risk route, which avoids the drifted
// admin_* materialized views.
//
// Psychometrics note: item difficulty and discrimination (item–total
// correlation) are only statistically meaningful with sufficient responses.
// Below MIN_N they are withheld (returned null) and the UI shows an honest
// "insufficient data" state rather than noise.
const MIN_N = 30

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}

function stdev(xs: number[]): number {
  const n = xs.length
  if (n < 2) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / n)
}

// Pearson correlation; null when undefined (n<2 or zero variance).
function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length
  if (n < 2 || ys.length !== n) return null
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0
  for (let i = 0; i < n; i++) {
    sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; syy += ys[i] * ys[i]; sxy += xs[i] * ys[i]
  }
  const dx = Math.sqrt(n * sxx - sx * sx)
  const dy = Math.sqrt(n * syy - sy * sy)
  if (dx === 0 || dy === 0) return null
  return (n * sxy - sx * sy) / (dx * dy)
}

function ageFrom(dob: string | null): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (isNaN(d.getTime())) return null
  const age = Math.floor((Date.now() - d.getTime()) / 31557600000) // ms/year
  return age >= 0 && age < 130 ? age : null
}

function ageBucket(age: number | null): string {
  if (age == null) return 'Unknown'
  if (age < 18) return 'Under 18'
  if (age < 25) return '18–24'
  if (age < 35) return '25–34'
  if (age < 45) return '35–44'
  if (age < 55) return '45–54'
  return '55+'
}

// Group submissions by a derived key → { group, count, avgScore }, sorted by count.
function breakdown(
  rows: { score: number; key: string | null }[],
): { group: string; count: number; avgScore: number }[] {
  const map = new Map<string, { count: number; sum: number }>()
  for (const r of rows) {
    const key = r.key && r.key.trim() ? r.key : 'Unknown'
    const cur = map.get(key) ?? { count: 0, sum: 0 }
    cur.count += 1
    cur.sum += r.score
    map.set(key, cur)
  }
  return Array.from(map.entries())
    .map(([group, v]) => ({ group, count: v.count, avgScore: Math.round((v.sum / v.count) * 10) / 10 }))
    .sort((a, b) => b.count - a.count)
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
    const db = createAdminClient()
    const id = params.id

    // 1. Definition
    const { data: def, error: defErr } = await db
      .from('assessment_definitions')
      .select('id, code, name_en, name_ar, total_questions, high_risk_threshold, is_active')
      .eq('id', id)
      .single()

    if (defErr || !def) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    // 2. Submissions for this assessment
    const { data: subsRaw } = await db
      .from('assessment_submissions')
      .select('id, patient_id, total_score, severity_band, submitted_at, high_risk_flag, is_self_initiated, guest_dob, guest_gender, guest_marital, guest_education, guest_country')
      .eq('definition_id', id)
      .order('submitted_at', { ascending: true })

    const subs = subsRaw ?? []
    const completions = subs.length

    // Empty assessment — return the shell so the page renders an empty state.
    if (completions === 0) {
      return NextResponse.json({
        definition: def,
        header: { completions: 0, avgScore: null, lastSubmittedAt: null, highRiskCount: 0, selfInitiatedCount: 0 },
        scoreHistogram: [], severityBands: [], trend: [],
        demographics: { gender: [], ageGroup: [], country: [], education: [] },
        itemAnalysis: { minN: MIN_N, psychometricsAvailable: false, items: [] },
      })
    }

    const scores = subs.map((s) => s.total_score ?? 0)
    const scoreById = new Map(subs.map((s) => [s.id, s.total_score ?? 0]))

    // 3. Enrich registered-patient demographics from profiles
    const patientIds = Array.from(new Set(subs.map((s) => s.patient_id).filter(Boolean))) as string[]
    const profileMap = new Map<string, { gender: string | null; date_of_birth: string | null; country_of_residence: string | null; educational_status: string | null }>()
    if (patientIds.length) {
      const { data: profs } = await db
        .from('profiles')
        .select('id, gender, date_of_birth, country_of_residence, educational_status')
        .in('id', patientIds)
      for (const p of profs ?? []) profileMap.set(p.id, p)
    }

    // Resolve demographics per submission (guest fields, else patient profile)
    const demoRows = subs.map((s) => {
      const p = s.patient_id ? profileMap.get(s.patient_id) : undefined
      const score = s.total_score ?? 0
      return {
        score,
        gender: s.guest_gender ?? p?.gender ?? null,
        country: s.guest_country ?? p?.country_of_residence ?? null,
        education: s.guest_education ?? p?.educational_status ?? null,
        age: ageBucket(ageFrom(s.guest_dob ?? p?.date_of_birth ?? null)),
      }
    })

    // 4. Score histogram + severity bands
    const histMap = new Map<number, number>()
    for (const sc of scores) histMap.set(sc, (histMap.get(sc) ?? 0) + 1)
    const scoreHistogram = Array.from(histMap.entries())
      .map(([score, count]) => ({ score, count }))
      .sort((a, b) => a.score - b.score)

    const severityBands = breakdown(subs.map((s) => ({ score: s.total_score ?? 0, key: s.severity_band })))
      .map(({ group, count }) => ({ band: group, count }))

    // 5. Trend — completions + avg score per day
    const trendMap = new Map<string, { count: number; sum: number }>()
    for (const s of subs) {
      const day = (s.submitted_at ?? '').slice(0, 10)
      if (!day) continue
      const cur = trendMap.get(day) ?? { count: 0, sum: 0 }
      cur.count += 1
      cur.sum += s.total_score ?? 0
      trendMap.set(day, cur)
    }
    const trend = Array.from(trendMap.entries())
      .map(([date, v]) => ({ date, completions: v.count, avgScore: Math.round((v.sum / v.count) * 10) / 10 }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 6. Item analysis
    const { data: items } = await db
      .from('assessment_items')
      .select('id, item_number, question_en, question_ar, is_safety_item, subscale')
      .eq('definition_id', id)
      .order('item_number', { ascending: true })

    const subIds = subs.map((s) => s.id)
    const { data: responses } = await db
      .from('assessment_responses')
      .select('submission_id, item_id, response_value')
      .in('submission_id', subIds)

    // group responses by item
    const byItem = new Map<string, { values: number[]; totals: number[] }>()
    for (const r of responses ?? []) {
      if (r.item_id == null || r.response_value == null) continue
      const cur = byItem.get(r.item_id) ?? { values: [], totals: [] }
      cur.values.push(r.response_value)
      cur.totals.push(scoreById.get(r.submission_id) ?? 0)
      byItem.set(r.item_id, cur)
    }

    const psychometricsAvailable = completions >= MIN_N
    const itemAnalysis = {
      minN: MIN_N,
      psychometricsAvailable,
      items: (items ?? []).map((it) => {
        const d = byItem.get(it.id) ?? { values: [], totals: [] }
        const n = d.values.length
        const maxObserved = n ? Math.max(...d.values) : 0
        const m = mean(d.values)
        return {
          itemId: it.id,
          itemNumber: it.item_number,
          questionEn: it.question_en,
          questionAr: it.question_ar,
          isSafetyItem: it.is_safety_item,
          subscale: it.subscale,
          n,
          mean: Math.round(m * 100) / 100,
          stdev: Math.round(stdev(d.values) * 100) / 100,
          missingPercent: completions ? Math.round(((completions - n) / completions) * 1000) / 10 : 0,
          // Gated psychometrics — withheld until enough responses
          difficultyIndex: psychometricsAvailable && maxObserved > 0 ? Math.round((m / maxObserved) * 100) / 100 : null,
          discriminationIndex: psychometricsAvailable ? (() => {
            const c = pearson(d.values, d.totals)
            return c == null ? null : Math.round(c * 100) / 100
          })() : null,
        }
      }),
    }

    const highRiskCount = subs.filter((s) => s.high_risk_flag).length
    const selfInitiatedCount = subs.filter((s) => s.is_self_initiated).length

    return NextResponse.json({
      definition: def,
      header: {
        completions,
        avgScore: Math.round(mean(scores) * 10) / 10,
        lastSubmittedAt: subs[subs.length - 1]?.submitted_at ?? null,
        highRiskCount,
        selfInitiatedCount,
      },
      scoreHistogram,
      severityBands,
      trend,
      demographics: {
        gender: breakdown(demoRows.map((r) => ({ score: r.score, key: r.gender }))),
        ageGroup: breakdown(demoRows.map((r) => ({ score: r.score, key: r.age }))),
        country: breakdown(demoRows.map((r) => ({ score: r.score, key: r.country }))),
        education: breakdown(demoRows.map((r) => ({ score: r.score, key: r.education }))),
      },
      itemAnalysis,
    })
  } catch (err: any) {
    if (err?.digest?.toString().startsWith('NEXT_REDIRECT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Assessment analytics error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
