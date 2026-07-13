import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateRichNarrative } from '@/lib/package-interpret'
import { scrubPHI } from '@/lib/security/anonymizePHI'
import type { InterpretationBand } from '@/lib/types'

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

interface AssessmentScore {
  assessment_code: string
  name_en: string
  name_ar: string
  weight_pct: number
  normalized: number
}

interface PkgAssessment {
  assessment_code: string
  name_en: string
  name_ar: string
  weight_pct: number
  is_available: boolean
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Rate limit: 30 package interpretations per hour per user
    const rl = await checkRateLimit(`package-interpret:${user.id}`, { limit: 30, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many package interpretations. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      )
    }

    const db = createAdminClient()

    const { data: pkg } = await db
      .from('packages')
      .select('*, package_assessments(assessment_code, name_en, name_ar, weight_pct, is_available)')
      .eq('id', params.id)
      .single()

    if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

    const { data: result } = await db
      .from('package_results')
      .select('*')
      .eq('package_id', params.id)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!result) return NextResponse.json({ error: 'No completed result found' }, { status: 404 })

    const available = (pkg.package_assessments as PkgAssessment[]).filter(a => a.is_available)
    const individualScores = result.individual_scores as Record<string, number>
    const pkgBands = pkg.interpretation_bands as InterpretationBand[]
    const band = pkgBands.find(b =>
      (result.composite_score ?? 0) >= b.min && (result.composite_score ?? 0) <= b.max
    ) ?? pkgBands[pkgBands.length - 1] ?? null

    const assessmentScores: AssessmentScore[] = available
      .filter(a => individualScores[a.assessment_code] !== undefined)
      .map(a => ({
        assessment_code: a.assessment_code,
        name_en: a.name_en,
        name_ar: a.name_ar,
        weight_pct: a.weight_pct,
        normalized: individualScores[a.assessment_code],
      }))

    const apiKey = process.env.GEMINI_API_KEY
    let strengths_en: string[]
    let strengths_ar: string[]
    let risks_en: string[]
    let risks_ar: string[]
    let recommendations_en: string[]
    let recommendations_ar: string[]
    let summary_en = ''
    let summary_ar = ''

    if (apiKey && apiKey !== 'your-gemini-api-key-here') {
      const scoreLines = assessmentScores
        .map(a => `• ${a.name_en} (${a.assessment_code}): ${a.normalized}/100 (weight: ${a.weight_pct}%)`)
        .join('\n')

      const bandLabel = band ? `"${band.band_en}"` : 'unknown'
      const pkgName = pkg.name_en as string
      const category = pkg.category as string

      const prompt = `You are analyzing psychological assessment results for a ${category} package called "${pkgName}".

Composite Score: ${result.composite_score}/100 — Band: ${bandLabel}

Individual Assessments:
${scoreLines}

Respond ONLY with this exact JSON (no markdown, no text outside JSON):
{
  "summary_en": "<2–3 sentence narrative summary integrating all results — compassionate and actionable>",
  "summary_ar": "<same summary in Arabic>",
  "strengths_en": ["<strength 1>", "<strength 2>"],
  "strengths_ar": ["<strength 1 in Arabic>", "<strength 2 in Arabic>"],
  "risks_en": ["<risk or area for attention>"],
  "risks_ar": ["<risk in Arabic>"],
  "recommendations_en": ["<practical recommendation 1>", "<recommendation 2>", "<recommendation 3>"],
  "recommendations_ar": ["<recommendation 1 in Arabic>", "<recommendation 2 in Arabic>", "<recommendation 3 in Arabic>"]
}

Rules:
- Be empathetic, not clinical. Speak to the person directly.
- Each strengths/risks/recommendations list: 1–4 items max.
- If composite ≥ 70: emphasize strengths, keep risks minimal.
- If composite < 45: be supportive but clear about growth areas.
- Keep Arabic translations natural, not literal.`

      try {
        const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: scrubPHI(prompt) }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1200 },
          }),
        })

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json()
          const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
          const jsonMatch = raw.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            if (
              typeof parsed.summary_en === 'string' &&
              Array.isArray(parsed.strengths_en) &&
              Array.isArray(parsed.risks_en) &&
              Array.isArray(parsed.recommendations_en)
            ) {
              summary_en = parsed.summary_en
              summary_ar = parsed.summary_ar ?? ''
              strengths_en = parsed.strengths_en
              strengths_ar = parsed.strengths_ar ?? parsed.strengths_en
              risks_en = parsed.risks_en
              risks_ar = parsed.risks_ar ?? parsed.risks_en
              recommendations_en = parsed.recommendations_en
              recommendations_ar = parsed.recommendations_ar ?? parsed.recommendations_en

              await db
                .from('package_results')
                .update({
                  summary_en,
                  summary_ar,
                  strengths_en,
                  strengths_ar,
                  risk_indicators_en: risks_en,
                  risk_indicators_ar: risks_ar,
                  recommendations_en,
                  recommendations_ar,
                })
                .eq('id', result.id)

              return NextResponse.json({
                source: 'ai',
                summary_en,
                summary_ar,
                strengths_en,
                strengths_ar,
                risks_en,
                risks_ar,
                recommendations_en,
                recommendations_ar,
              })
            }
          }
        }
      } catch {
        // Fall through to rule-based fallback
      }
    }

    // Rule-based fallback using rich narrative engine
    const narrative = generateRichNarrative(
      pkg.category as string,
      assessmentScores,
      result.composite_score ?? 0,
      band,
    )

    await db
      .from('package_results')
      .update({
        strengths_en: narrative.strengths_en,
        strengths_ar: narrative.strengths_ar,
        risk_indicators_en: narrative.risks_en,
        risk_indicators_ar: narrative.risks_ar,
        recommendations_en: narrative.recommendations_en,
        recommendations_ar: narrative.recommendations_ar,
      })
      .eq('id', result.id)

    return NextResponse.json({
      source: 'rule_based',
      summary_en: narrative.summary_en,
      summary_ar: narrative.summary_ar,
      strengths_en: narrative.strengths_en,
      strengths_ar: narrative.strengths_ar,
      risks_en: narrative.risks_en,
      risks_ar: narrative.risks_ar,
      recommendations_en: narrative.recommendations_en,
      recommendations_ar: narrative.recommendations_ar,
    })
  } catch (err) {
    console.error('interpret error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
