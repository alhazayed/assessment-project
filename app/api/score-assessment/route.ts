import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import type { ScoringBand } from '@/lib/types'

function extractIp(request: Request): string {
  const cfIp = request.headers.get('cf-connecting-ip')?.trim()
  if (cfIp && /^[\d.:a-fA-F]{2,45}$/.test(cfIp)) return cfIp
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first && /^[\d.:a-fA-F]{2,45}$/.test(first)) return first
  }
  return 'unknown'
}

function calcBand(scoringLogic: ScoringBand[], score: number): ScoringBand | null {
  if (!scoringLogic || scoringLogic.length === 0) return null
  for (const band of scoringLogic) {
    if (score >= band.min && score <= band.max) return band
  }
  return scoringLogic[scoringLogic.length - 1]
}

interface ResponseOption {
  value: number
  label_en: string
  label_ar: string
}

interface ItemRow {
  id: string
  response_options: ResponseOption[]
  subscale: string | null
  is_safety_item: boolean
}

interface ScoreBody {
  definition_id: string
  responses: Array<{ item_id: string; value: number }>
}

export async function POST(request: Request) {
  try {
    const ip = extractIp(request)
    // 10 guest scorings per hour per IP
    const rl = await checkRateLimit(`guest-score:${ip}`, { limit: 10, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const db = createAdminClient()

    const body: ScoreBody = await request.json()
    const { definition_id, responses } = body

    if (!definition_id || !Array.isArray(responses) || responses.length === 0 || responses.length > 200) {
      return NextResponse.json({ error: 'definition_id and responses are required (max 200 items)' }, { status: 400 })
    }

    const { data: def, error: defErr } = await db
      .from('assessment_definitions')
      .select('id, scoring_logic, high_risk_threshold, is_active')
      .eq('id', definition_id)
      .single()

    if (defErr || !def) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    if (!def.is_active) return NextResponse.json({ error: 'Assessment is not active' }, { status: 400 })

    const { data: items } = await db
      .from('assessment_items')
      .select('id, response_options, subscale, is_safety_item')
      .eq('definition_id', definition_id)

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Assessment items not found' }, { status: 404 })
    }

    if (responses.length > items.length) {
      return NextResponse.json(
        { error: `Too many responses: assessment has ${items.length} items` },
        { status: 400 }
      )
    }

    const itemMap = new Map<string, ItemRow>(items.map(i => [i.id, i as ItemRow]))

    let totalScore = 0
    const seenItemIds = new Set<string>()
    const validatedResponses: Array<{ item_id: string; value: number }> = []

    for (const resp of responses) {
      if (typeof resp.item_id !== 'string' || typeof resp.value !== 'number') {
        return NextResponse.json({ error: 'Invalid response format' }, { status: 400 })
      }
      if (seenItemIds.has(resp.item_id)) continue
      const item = itemMap.get(resp.item_id)
      if (!item) continue
      seenItemIds.add(resp.item_id)

      const validOption = item.response_options.find(o => o.value === resp.value)
      if (!validOption) {
        return NextResponse.json(
          { error: `Invalid response value ${resp.value} for item ${resp.item_id}` },
          { status: 400 }
        )
      }

      totalScore += validOption.value
      validatedResponses.push({ item_id: resp.item_id, value: validOption.value })
    }

    const scoringLogic = def.scoring_logic as ScoringBand[]
    const band = calcBand(scoringLogic, totalScore)
    const safetyItemTriggered = validatedResponses.some(r => {
      const item = itemMap.get(r.item_id)
      return item?.is_safety_item && r.value > 0
    })
    const highRisk = safetyItemTriggered || (def.high_risk_threshold !== null && totalScore >= def.high_risk_threshold)

    return NextResponse.json({
      score: totalScore,
      band_en: band?.severity_en ?? null,
      band_ar: band?.severity_ar ?? null,
      high_risk: highRisk,
    })
  } catch (err) {
    console.error('score-assessment error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
