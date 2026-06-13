import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

export async function POST(request: Request) {
  try {
    // Rate-limit: 20 AI requests per minute per IP (protect free-tier quota)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rl = await checkRateLimit(`ai-recommend:${ip}`, { limit: 20, windowMs: 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })
    }

    const { text } = await request.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: 'No input provided' }, { status: 400 })
    }

    // Limit input length to prevent prompt injection with huge payloads
    if (text.length > 1000) {
      return NextResponse.json({ error: 'Input too long (max 1000 characters)' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }

    const supabase = createClient()
    const { data: assessments } = await supabase
      .from('assessment_definitions')
      .select('id, code, name_en, name_ar, description_en, description_ar')
      .eq('is_active', true)
      .order('name_en')

    if (!assessments?.length) {
      return NextResponse.json({ error: 'No assessments available' }, { status: 500 })
    }

    const assessmentList = assessments
      .map(a => `- ID: ${a.id} | Code: ${a.code} | Name: ${a.name_en} | Description: ${a.description_en || 'N/A'}`)
      .join('\n')

    const systemInstruction = `You are a clinical psychologist assistant helping match users to appropriate psychological assessments.
Analyze how the user is feeling and recommend the 2-4 most clinically relevant assessments from the provided list.
Be empathetic and focus on what would genuinely help the user understand themselves better.
Return ONLY a valid JSON array — no markdown, no explanation outside JSON.

Available assessments:
${assessmentList}

Return a JSON array:
[
  {
    "id": "<assessment UUID from the list above>",
    "code": "<assessment code>",
    "name_en": "<English name>",
    "name_ar": "<Arabic name>",
    "reason_en": "<1-2 sentence explanation in English of why this assessment fits>",
    "reason_ar": "<1-2 sentence explanation in Arabic of why this assessment fits>",
    "relevance": "high" | "medium"
  }
]
Only include assessments from the provided list. Order by relevance (highest first).`

    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: text.trim() }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Gemini API error:', res.status, err)
      return NextResponse.json({ error: 'AI service error' }, { status: 502 })
    }

    const data = await res.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    const validIds = new Set(assessments.map(a => a.id))
    let recommendations: Array<{ id: string; code: string; name_en: string; name_ar: string; reason_en: string; reason_ar: string; relevance: string }> = []
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      const parsed: unknown[] = jsonMatch ? JSON.parse(jsonMatch[0]) : []
      recommendations = parsed
        .filter((r): r is typeof recommendations[number] =>
          r !== null &&
          typeof r === 'object' &&
          typeof (r as Record<string, unknown>).id === 'string' &&
          validIds.has((r as Record<string, unknown>).id as string) &&
          typeof (r as Record<string, unknown>).name_en === 'string' &&
          typeof (r as Record<string, unknown>).reason_en === 'string'
        )
        .slice(0, 4)
    } catch {
      recommendations = []
    }

    return NextResponse.json({ recommendations })
  } catch (err) {
    console.error('recommend-assessments error:', err)
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 })
  }
}
