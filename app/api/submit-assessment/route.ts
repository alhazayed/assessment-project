import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ScoringBand } from '@/lib/types'

interface ResponseOption {
  value: number
  label_en: string
  label_ar: string
}

interface ItemRow {
  id: string
  response_options: ResponseOption[]
  subscale: string | null
}

interface SubmitBody {
  definition_id: string
  responses: Array<{ item_id: string; value: number }>
}

function calcBand(scoringLogic: ScoringBand[], score: number): ScoringBand | null {
  if (!scoringLogic || scoringLogic.length === 0) return null
  for (const band of scoringLogic) {
    if (score >= band.min && score <= band.max) return band
  }
  return scoringLogic[scoringLogic.length - 1]
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: SubmitBody = await request.json()
    const { definition_id, responses } = body

    if (!definition_id || !Array.isArray(responses) || responses.length === 0) {
      return NextResponse.json({ error: 'definition_id and responses are required' }, { status: 400 })
    }

    // Fetch definition
    const { data: def, error: defErr } = await supabase
      .from('assessment_definitions')
      .select('id, code, name_en, name_ar, scoring_logic, high_risk_threshold, total_questions, is_active')
      .eq('id', definition_id)
      .single()

    if (defErr || !def) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    if (!def.is_active) return NextResponse.json({ error: 'Assessment is not active' }, { status: 400 })

    // Fetch items to validate response values
    const { data: items } = await supabase
      .from('assessment_items')
      .select('id, response_options, subscale')
      .eq('definition_id', definition_id)

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Assessment items not found' }, { status: 404 })
    }

    const itemMap = new Map<string, ItemRow>(items.map(i => [i.id, i as ItemRow]))

    // Validate and score
    let totalScore = 0
    const validatedResponses: Array<{ item_id: string; value: number; label_en: string; label_ar: string }> = []

    for (const resp of responses) {
      const item = itemMap.get(resp.item_id)
      if (!item) continue // skip unknown items silently

      const validOption = item.response_options.find(o => o.value === resp.value)
      if (!validOption) {
        // Value not in the allowed options for this item — reject
        return NextResponse.json(
          { error: `Invalid response value ${resp.value} for item ${resp.item_id}` },
          { status: 400 }
        )
      }

      totalScore += validOption.value
      validatedResponses.push({
        item_id: resp.item_id,
        value: validOption.value,
        label_en: validOption.label_en,
        label_ar: validOption.label_ar,
      })
    }

    // Scoring bands + high-risk
    const scoringLogic = def.scoring_logic as ScoringBand[]
    const band = calcBand(scoringLogic, totalScore)
    const highRisk = def.high_risk_threshold !== null && totalScore >= def.high_risk_threshold

    // Persist submission
    const { data: submission, error: subErr } = await supabase
      .from('assessment_submissions')
      .insert({
        patient_id: user.id,
        definition_id,
        total_score: totalScore,
        severity_band: band?.severity_en ?? null,
        high_risk_flag: highRisk,
        is_self_initiated: true,
      })
      .select('id')
      .single()

    if (subErr || !submission) {
      console.error('submission insert error:', subErr)
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
    }

    // Persist individual responses
    const responseRows = validatedResponses.map(r => ({
      submission_id: submission.id,
      item_id: r.item_id,
      response_value: r.value,
      response_label_en: r.label_en,
      response_label_ar: r.label_ar,
    }))
    await supabase.from('assessment_responses').insert(responseRows)

    // Log the submission in audit trail
    await supabase.from('audit_log').insert({
      actor_id: user.id,
      action: 'assessment_submitted',
      target_type: 'assessment_submission',
      target_id: submission.id,
      reason: `${def.name_en} — score ${totalScore}${band ? ` (${band.severity_en})` : ''}${highRisk ? ' HIGH RISK' : ''}`,
    }).then(() => {}) // fire-and-forget; don't block response

    return NextResponse.json({
      submission_id: submission.id,
      score: totalScore,
      band_en: band?.severity_en ?? null,
      band_ar: band?.severity_ar ?? null,
      high_risk: highRisk,
    })
  } catch (err) {
    console.error('submit-assessment error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
