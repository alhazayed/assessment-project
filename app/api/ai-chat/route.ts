import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { checkAiBudget } from '@/lib/security/aiBudgetGuard'

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

const MAX_MESSAGE_LEN = 1000

const SYSTEM_INSTRUCTION = `You are Wafi, a warm and supportive AI companion on the Vwelfare mental health platform. You help users understand their emotional wellbeing and mental health in a compassionate, non-judgmental way.

Guidelines:
- Be empathetic, warm, and supportive — never clinical or cold
- Provide psychoeducation: explain concepts in simple, accessible language
- Offer practical coping strategies grounded in evidence-based approaches (CBT, mindfulness, DBT skills)
- If the user expresses immediate danger, self-harm intent, or crisis, ALWAYS direct them to emergency services or a crisis line and do NOT attempt to counsel them
- Never diagnose, prescribe, or replace professional mental health care
- Keep responses concise (2–4 paragraphs max)
- Always end with a gentle question or encouragement to keep the user engaged

IMPORTANT DISCLAIMER (always apply): You are not a licensed therapist and cannot replace professional mental health care. If this is an emergency, the user should call their local emergency number or a crisis line.`

const EMERGENCY_KEYWORDS = [
  'kill myself', 'end my life', 'suicide', 'suicidal', 'self-harm', 'self harm',
  'cutting myself', 'hurt myself', 'want to die', 'no reason to live',
  'أنتحر', 'أقتل نفسي', 'إيذاء النفس',
]

function containsEmergencyKeyword(text: string): boolean {
  const lower = text.toLowerCase()
  return EMERGENCY_KEYWORDS.some(kw => lower.includes(kw))
}

function buildEmergencyResponse(lang: string): string {
  if (lang === 'ar') {
    return 'أسمعك، وأنا قلق عليك. إذا كنت تفكر في إيذاء نفسك، أرجوك تواصل فوراً مع خدمات الطوارئ أو خط دعم الأزمات. سلامتك هي الأهم. اتصل بالرقم 920033360 (خط دعم الصحة النفسية السعودي) أو توجه لأقرب طوارئ.'
  }
  return "I hear you, and I'm genuinely concerned about you. If you're having thoughts of hurting yourself, please reach out to emergency services or a crisis line right now. Your safety is the most important thing. In the US, call or text 988 (Suicide & Crisis Lifeline). If you're in immediate danger, please call 911 or go to your nearest emergency room."
}

export async function POST(request: Request) {
  // Support both cookie auth (web) and Bearer token auth (mobile)
  let userId: string | null = null

  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const admin = createAdminClient()
    const { data: { user } } = await admin.auth.getUser(token)
    userId = user?.id ?? null
  } else {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 20 messages / minute, 100 / day per user
  const [burstRl, dailyRl] = await Promise.all([
    checkRateLimit(`ai-chat:burst:${userId}`, { limit: 20, windowMs: 60 * 1000 }),
    checkRateLimit(`ai-chat:daily:${userId}`, { limit: 100, windowMs: 24 * 60 * 60 * 1000 }),
  ])
  if (!burstRl.allowed || !dailyRl.allowed) {
    const retryAfter = !dailyRl.allowed ? '86400' : '60'
    return NextResponse.json(
      { error: !dailyRl.allowed ? 'Daily message limit reached. Try again tomorrow.' : 'Too many messages. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': retryAfter } }
    )
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
  }

  const budget = await checkAiBudget()
  if (!budget.allowed) {
    return NextResponse.json({ error: 'AI services temporarily unavailable' }, { status: 503 })
  }

  let body: { message?: string; lang?: string; history?: Array<{ role: string; text: string }> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const message = typeof body.message === 'string' ? body.message.slice(0, MAX_MESSAGE_LEN).trim() : ''
  const lang = body.lang === 'ar' ? 'ar' : 'en'
  const history = Array.isArray(body.history) ? body.history.slice(-10) : []

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  // Emergency keyword intercept — no API call needed
  if (containsEmergencyKeyword(message)) {
    return NextResponse.json({ reply: buildEmergencyResponse(lang), emergency: true })
  }

  // Build conversation history for multi-turn context
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []

  for (const turn of history) {
    if (typeof turn.text !== 'string') continue
    const role = turn.role === 'user' ? 'user' : 'model'
    contents.push({ role, parts: [{ text: turn.text.slice(0, MAX_MESSAGE_LEN) }] })
  }

  const langInstruction = lang === 'ar'
    ? 'Please respond in Arabic (Modern Standard Arabic, MSA). Use clear, warm, accessible language.'
    : 'Please respond in English.'

  contents.push({
    role: 'user',
    parts: [{ text: `${langInstruction}\n\nUser message: ${message}` }],
  })

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'AI service error' }, { status: 502 })
  }

  const data = await res.json()
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  if (!reply) {
    return NextResponse.json({ error: 'Empty response from AI' }, { status: 502 })
  }

  return NextResponse.json({ reply, emergency: false })
}
