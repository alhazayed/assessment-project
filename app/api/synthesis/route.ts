import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rl = checkRateLimit(`ai-synthesis:${user.id}`, { limit: 3, windowMs: 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }

    const { data: submissions } = await supabase
      .from('assessment_submissions')
      .select('submitted_at, total_score, severity_band, high_risk_flag, assessment_definitions(name_en, name_ar, code, description_en)')
      .eq('patient_id', user.id)
      .order('submitted_at', { ascending: false })

    if (!submissions?.length) {
      return NextResponse.json({ error: 'No assessment results found', code: 'NO_DATA' }, { status: 404 })
    }

    const seenCodes = new Set<string>()
    const latestPerScale: Array<{
      code: string
      name: string
      score: number
      band: string | null
      highRisk: boolean
      date: string
    }> = []

    for (const s of submissions) {
      const def = s.assessment_definitions as unknown as { code: string; name_en: string } | null
      if (!def?.code || seenCodes.has(def.code)) continue
      seenCodes.add(def.code)
      latestPerScale.push({
        code: def.code,
        name: def.name_en,
        score: s.total_score,
        band: s.severity_band,
        highRisk: s.high_risk_flag,
        date: s.submitted_at,
      })
    }

    if (latestPerScale.length < 3) {
      return NextResponse.json({ error: 'Complete at least 3 assessments to unlock your Full Picture', code: 'INSUFFICIENT_DATA' }, { status: 422 })
    }

    const resultsSummary = latestPerScale
      .map(r =>
        `• ${r.name} (${r.code}): Score ${r.score}` +
        (r.band ? `, Severity: ${r.band}` : '') +
        (r.highRisk ? ' [HIGH RISK]' : '') +
        ` — taken ${new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
      )
      .join('\n')

    const prompt = `You are a compassionate clinical psychologist reviewing multiple psychological assessment results for a single patient. Synthesize these results into a coherent clinical picture that helps the patient understand their overall mental health across domains.

Assessment Results:
${resultsSummary}

Provide a synthesis in this exact JSON format (no markdown, no text outside JSON):
{
  "summary": "<2-3 sentence overview of the overall clinical picture in plain, empathetic language>",
  "patterns": ["<cross-scale pattern 1>", "<pattern 2>"],
  "strengths": ["<identified strength or protective factor>"],
  "areas_of_concern": ["<area that warrants attention, include HIGH RISK flags prominently>"],
  "recommendations": ["<practical actionable recommendation 1>", "<recommendation 2>", "<recommendation 3>"],
  "overall_tone": "positive",
  "high_priority_scale": "<code of the scale most warranting follow-up attention, or null>"
}

Rules:
- overall_tone must be exactly one of: "positive", "cautionary", "urgent"
- Be empathetic and accessible — avoid clinical jargon
- Highlight connections between domains (e.g., sleep affecting mood, anxiety affecting social functioning)
- If any HIGH RISK flag is present, overall_tone must be "urgent" and it must appear in areas_of_concern
- Keep recommendations practical and achievable without professional help
- Strengths list may be empty [] if none are evident`

    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
      }),
    })

    if (!res.ok) {
      console.error('Gemini synthesis error:', res.status, await res.text())
      return NextResponse.json({ error: 'AI service error' }, { status: 502 })
    }

    const data = await res.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    let synthesis
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      synthesis = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      synthesis = null
    }

    if (!synthesis) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    return NextResponse.json({ synthesis, scaleCount: latestPerScale.length })
  } catch (err) {
    console.error('synthesis error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
