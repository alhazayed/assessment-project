import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { checkAiBudget } from '@/lib/security/aiBudgetGuard'
import { callGemini } from '@/lib/gemini'
import { scrubPHI } from '@/lib/security/anonymizePHI'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPackagesEnabled } from '@/lib/feature-flags'
import { parseScaleSummary } from '@/lib/synthesis'
import { loadSaleCandidates, pickPackage } from '@/lib/billing/suggest-package'

export async function POST(_request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Burst: 2/min; Daily cap: 10/day — synthesis is expensive (~3K tokens/call)
    const [burstRl, dailyRl] = await Promise.all([
      checkRateLimit(`ai-synthesis:burst:${user.id}`, { limit: 2, windowMs: 60 * 1000 }),
      checkRateLimit(`ai-synthesis:daily:${user.id}`, { limit: 10, windowMs: 24 * 60 * 60 * 1000 }),
    ])
    if (!burstRl.allowed || !dailyRl.allowed) {
      const retryAfter = !dailyRl.allowed ? '86400' : '60'
      return NextResponse.json(
        { error: !dailyRl.allowed ? 'Daily AI limit reached. Try again tomorrow.' : 'Too many requests. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': retryAfter } }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }

    // Global AI cost circuit breaker
    const budget = await checkAiBudget()
    if (!budget.allowed) {
      return NextResponse.json({ error: 'AI services temporarily unavailable' }, { status: 503 })
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
      return NextResponse.json({ error: 'Complete at least 3 assessments to unlock your results summary', code: 'INSUFFICIENT_DATA' }, { status: 422 })
    }

    const resultsSummary = latestPerScale
      .map(r =>
        `• ${r.name} (${r.code}): Score ${r.score}` +
        (r.band ? `, Severity: ${r.band}` : '') +
        (r.highRisk ? ' [HIGH RISK]' : '') +
        ` — taken ${new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
      )
      .join('\n')

    // Free tier: each result is explained on its own. Reading several scales
    // together (patterns across scales, quadrants, a combined picture) is what
    // the paid package report sells, so the free summary must not do it.
    const systemInstruction = `You are a compassionate psychologist explaining a person's questionnaire results to them, ONE RESULT AT A TIME.

Provide your answer in this exact JSON format (no markdown, no text outside JSON):
{
  "summary": "<1-2 plain sentences: which results are in a healthy range and which are elevated, listed separately>",
  "scales": [
    { "code": "<scale code exactly as given>", "meaning": "<one plain sentence: what this score means on this questionnaire's own bands>", "next_step": "<one practical next step for this result only>" }
  ],
  "overall_tone": "positive",
  "high_priority_scale": "<code of the single result most worth following up, or null>"
}

Rules:
- Explain each scale independently. Do NOT link scales to each other, do NOT describe patterns, overlaps or causes across scales (for example, do not say sleep is affecting mood, or that two results together suggest something). Do NOT give an overall diagnosis or profile.
- One entry in "scales" per result given, in the same order, using the given code.
- overall_tone must be exactly one of: "positive", "cautionary", "urgent"
- If any result is marked [HIGH RISK], overall_tone must be "urgent" and that scale's next_step must say to contact a professional or an emergency line now.
- Be empathetic and avoid clinical jargon. This is not a diagnosis.`

    const res = await callGemini(apiKey, {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      // Scrub PHI before any text leaves for the third-party AI provider (defence in depth).
      contents: [{ role: 'user', parts: [{ text: scrubPHI(`Assessment Results:\n${resultsSummary}`) }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    })

    if (!res.ok) {
      console.error('Gemini synthesis error:', res.status, await res.text())
      return NextResponse.json({ error: 'AI service error' }, { status: 502 })
    }

    const data = await res.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    const synthesis = parseScaleSummary(raw, latestPerScale)
    if (!synthesis) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    // The combined reading lives in the paid package that best matches what
    // this person has already taken (only while packages are on sale).
    let suggestedPackage = null
    if (await isPackagesEnabled()) {
      try {
        suggestedPackage = pickPackage(await loadSaleCandidates(createAdminClient()), latestPerScale.map(r => r.code))
      } catch (err) {
        console.error('synthesis: package suggestion failed:', err instanceof Error ? err.message : err)
      }
    }

    return NextResponse.json({ synthesis, scaleCount: latestPerScale.length, suggestedPackage })
  } catch (err) {
    console.error('synthesis error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
