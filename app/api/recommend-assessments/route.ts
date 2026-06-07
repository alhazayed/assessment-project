import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { text, lang } = await request.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: 'No input provided' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-anthropic-api-key-here') {
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

    const systemPrompt = `You are a clinical psychologist assistant helping match users to appropriate psychological assessments.
Your role is to analyze how a user is feeling and recommend the 2-4 most clinically relevant assessments from the provided list.
Be empathetic, non-judgmental, and focus on what would genuinely help the user understand themselves better.
Always respond with valid JSON only — no markdown, no explanation outside JSON.`

    const userPrompt = `The user says: "${text.trim()}"

Available assessments:
${assessmentList}

Based on what the user shared, recommend the 2-4 most relevant assessments.
Return a JSON array with this exact structure:
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

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''

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
