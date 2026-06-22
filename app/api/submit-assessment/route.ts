import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import type { ScoringBand } from '@/lib/types'

async function notifyAdminsHighRisk(submissionId: string, definitionId: string, patientId: string) {
  try {
    const db = createAdminClient()
    const dedupeLink = `/x/control/results?submission=${submissionId}`

    const { count } = await db
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'high_risk')
      .eq('link', dedupeLink)
    if ((count ?? 0) > 0) return

    const [defRes, adminsRes] = await Promise.all([
      db.from('assessment_definitions').select('name_en, name_ar').eq('id', definitionId).single(),
      db.from('profiles').select('id').in('role', ['admin', 'superadmin']),
    ])

    const nameEn = defRes.data?.name_en ?? 'Unknown'
    const nameAr = defRes.data?.name_ar ?? nameEn

    if (adminsRes.data && adminsRes.data.length > 0) {
      await db.from('notifications').insert(
        adminsRes.data.map(a => ({
          user_id: a.id,
          type: 'high_risk',
          title_en: '⚠ High-risk flag raised',
          title_ar: '⚠ تم رفع علامة خطورة عالية',
          body_en: `Assessment: ${nameEn} — submission ${submissionId}`,
          body_ar: `التقييم: ${nameAr} — رمز التقديم ${submissionId}`,
          link: dedupeLink,
        }))
      )
    }
  } catch (err) {
    console.error('[notifyAdminsHighRisk] error (non-fatal):', err instanceof Error ? err.message : 'unknown')
  }
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
    // Auth check via SSR client (validates session cookie)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Use admin client for all DB ops — bypasses RLS which can fail in route
    // handler context when the JWT isn't forwarded to PostgREST. Auth is
    // already enforced above; patient_id is always set to user.id below.
    const db = createAdminClient()

    // 20 submissions per hour per user
    const rl = await checkRateLimit(`submit:${user.id}`, { limit: 20, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const body: SubmitBody = await request.json()
    const { definition_id, responses } = body

    if (!definition_id || !Array.isArray(responses) || responses.length === 0 || responses.length > 200) {
      return NextResponse.json({ error: 'definition_id and responses are required (max 200 items)' }, { status: 400 })
    }

    // Fetch definition
    const { data: def, error: defErr } = await db
      .from('assessment_definitions')
      .select('id, code, name_en, name_ar, scoring_logic, high_risk_threshold, total_questions, is_active')
      .eq('id', definition_id)
      .single()

    if (defErr || !def) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    if (!def.is_active) return NextResponse.json({ error: 'Assessment is not active' }, { status: 400 })

    // Fetch items to validate response values
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

    // Validate and score — deduplicate item_ids to prevent score inflation
    let totalScore = 0
    const seenItemIds = new Set<string>()
    const validatedResponses: Array<{ item_id: string; value: number; label_en: string; label_ar: string }> = []

    for (const resp of responses) {
      if (typeof resp.item_id !== 'string' || typeof resp.value !== 'number') {
        return NextResponse.json({ error: 'Invalid response format' }, { status: 400 })
      }
      if (seenItemIds.has(resp.item_id)) continue // deduplicate — first response per item wins
      const item = itemMap.get(resp.item_id)
      if (!item) continue // skip unknown items silently
      seenItemIds.add(resp.item_id)

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
    // Safety items (e.g. PHQ-9 Q9 suicidal ideation) trigger high_risk regardless of total score
    const safetyItemTriggered = validatedResponses.some(r => {
      const item = itemMap.get(r.item_id)
      return item?.is_safety_item && r.value > 0
    })
    const highRisk = safetyItemTriggered || (def.high_risk_threshold !== null && totalScore >= def.high_risk_threshold)

    // Persist submission + responses atomically in a single transaction
    const responsePayload = validatedResponses.map(r => ({
      item_id: r.item_id,
      response_value: r.value,
      response_label_en: r.label_en,
      response_label_ar: r.label_ar,
    }))

    const { data: submissionId, error: subErr } = await db.rpc('submit_assessment_atomic', {
      p_patient_id: user.id,
      p_definition_id: definition_id,
      p_total_score: totalScore,
      p_severity_band: band?.severity_en ?? '',
      p_high_risk_flag: highRisk,
      p_is_self_initiated: true,
      p_responses: responsePayload,
    })

    if (subErr || !submissionId) {
      console.error('submission error:', subErr?.message ?? 'unknown')
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
    }

    // Server-side high-risk admin alert — idempotent, fire-and-forget
    if (highRisk) {
      notifyAdminsHighRisk(submissionId as string, definition_id, user.id).catch(() => {})
    }

    // Log the submission in audit trail
    await db.from('audit_log').insert({
      actor_id: user.id,
      action: 'assessment_submitted',
      target_type: 'assessment_submission',
      target_id: submissionId as string,
      reason: `${def.name_en} — score ${totalScore}${band ? ` (${band.severity_en})` : ''}${highRisk ? ' HIGH RISK' : ''}`,
    }).then(() => {}) // fire-and-forget; don't block response

    return NextResponse.json({
      submission_id: submissionId,
      score: totalScore,
      band_en: band?.severity_en ?? null,
      band_ar: band?.severity_ar ?? null,
      high_risk: highRisk,
    })
  } catch (err) {
    console.error('submit-assessment error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
