import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

export async function POST(request: Request) {
  try {
    // Rate-limit: 20 AI requests per minute per IP (protect free-tier quota)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rl = checkRateLimit(`ai-recommend:${ip}`, { limit: 20, windowMs: 60 * 1000 })
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

    const prompt = `You are a clinical psychologist assistant helping match users to appropriate psychological assessments.
Analyze how this user is feeling and recommend the 2-4 most clinically relevant assessments from the provided list.
Be empathetic and focus on what would genuinely help the user understand themselves better.
Return ONLY a valid JSON array — no markdown, no explanation outside JSON.

The user says: "${text.trim()}"

Available assessments:
${assessmentList}

Return a JSON array:
[
  {
    "id": "<assessment UUID>",
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
        contents: [{ parts: [{ text: prompt }] }],
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

    let recommendations
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    } catch {
      recommendations = []
    }

    return NextResponse.json({ recommendations })
  } catch (err) {
    console.error('recommend-assessments error:', err)
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 })
  }
}
