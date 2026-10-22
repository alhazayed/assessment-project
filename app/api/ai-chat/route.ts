import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { checkAiBudget } from '@/lib/security/aiBudgetGuard'
import { callGemini } from '@/lib/gemini'
import { scrubPHI } from '@/lib/security/anonymizePHI'

const MAX_MESSAGE_LEN = 1000
// Assistant replies can be longer than user messages (512 output tokens).
const MAX_MODEL_TURN_LEN = 4000
const MAX_HISTORY_TURNS = 10

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
  'end it all', 'take my life', 'not worth living', 'overdose',
  // Arabic emergency keywords
  'أنتحر', 'أقتل نفسي', 'إيذاء النفس',
  'الانتحار', 'أريد أن أموت', 'لا أريد العيش',
  'أؤذي نفسي', 'إنهاء حياتي', 'جرح نفسي',
  'لا معنى للحياة', 'أريد الموت',
]

/**
 * Normalise text before keyword matching so trivial variations can't slip past
 * the crisis check: case, Latin accents, Arabic tashkeel and tatweel, Arabic
 * letter variants (alef/yaa/taa marbuta/hamza seats), zero-width and bidi
 * controls, punctuation (self-harm vs self harm) and repeated whitespace.
 */
function normalizeForKeywordMatch(text: string): string {
  return text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')                 // Latin combining diacritics
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '') // Arabic tashkeel, Quranic marks, tatweel
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g, '') // zero-width / bidi controls
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')   // آ أ إ ٱ -> ا
    .replace(/\u0649/g, '\u064A')                       // ى -> ي
    .replace(/\u0629/g, '\u0647')                       // ة -> ه
    .replace(/\u0624/g, '\u0648')                       // ؤ -> و
    .replace(/\u0626/g, '\u064A')                       // ئ -> ي
    .replace(/[^\p{L}\p{N}]+/gu, ' ')                   // punctuation/whitespace -> single space
    .trim()
}

const NORMALIZED_EMERGENCY_KEYWORDS = EMERGENCY_KEYWORDS.map(normalizeForKeywordMatch)

function containsEmergencyKeyword(text: string): boolean {
  const normalized = ` ${normalizeForKeywordMatch(text)} `
  return NORMALIZED_EMERGENCY_KEYWORDS.some(kw => normalized.includes(kw))
}

/**
 * Chat history lives only in the client, so assistant ("model") turns are
 * HMAC-signed by this route and must come back with a valid signature bound
 * to the same user. Unsigned or forged model turns are dropped, which stops a
 * client from putting words in the assistant's mouth.
 */
function historySigningKey(): string | null {
  const explicit = process.env.AI_CHAT_HISTORY_SECRET
  if (explicit) return explicit
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return null
  // Derive a purpose-specific key so the service key itself is never used directly.
  return createHmac('sha256', serviceKey).update('ai-chat-history-v1').digest('hex')
}

function signModelTurn(userId: string, text: string): string | null {
  const key = historySigningKey()
  if (!key) return null
  return createHmac('sha256', key).update(`${userId}\n${text}`).digest('base64url')
}

function verifyModelTurn(userId: string, text: string, sig: unknown): boolean {
  if (typeof sig !== 'string' || !sig) return false
  const expected = signModelTurn(userId, text)
  if (!expected) return false
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
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
    const supabase = await createClient()
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

  let body: { message?: string; lang?: string; history?: Array<{ role?: unknown; text?: unknown; sig?: unknown }> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const message = typeof body.message === 'string' ? body.message.slice(0, MAX_MESSAGE_LEN).trim() : ''
  const lang = body.lang === 'ar' ? 'ar' : 'en'
  const rawHistory = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY_TURNS) : []

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  // Keep only user turns and model turns this route signed for this user.
  // Anything else (unknown roles, unsigned/forged model turns) is dropped.
  const history: Array<{ role: 'user' | 'model'; text: string }> = []
  for (const turn of rawHistory) {
    if (!turn || typeof turn.text !== 'string') continue
    if (turn.role === 'user') {
      history.push({ role: 'user', text: turn.text.slice(0, MAX_MESSAGE_LEN) })
    } else if (
      turn.role === 'model' &&
      turn.text.length <= MAX_MODEL_TURN_LEN &&
      verifyModelTurn(userId, turn.text, turn.sig)
    ) {
      history.push({ role: 'model', text: turn.text })
    }
  }

  // Emergency keyword intercept — no API call needed. Check the new message,
  // and it joined with the previous user turn so a phrase split across two
  // messages is still caught. Older turns aren't re-checked: they were checked
  // when sent, and re-checking them would repeat the crisis reply every turn.
  const previousUserTurn = history.filter(t => t.role === 'user').at(-1)?.text ?? ''
  const splitAcrossTurns =
    !containsEmergencyKeyword(previousUserTurn) && containsEmergencyKeyword(`${previousUserTurn} ${message}`)
  if (containsEmergencyKeyword(message) || splitAcrossTurns) {
    return NextResponse.json({ reply: buildEmergencyResponse(lang), emergency: true })
  }

  // Build conversation history for multi-turn context
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []

  for (const turn of history) {
    // Scrub PHI before any text leaves for the third-party AI provider.
    contents.push({ role: turn.role, parts: [{ text: scrubPHI(turn.text) }] })
  }

  const langInstruction = lang === 'ar'
    ? 'Please respond in Arabic (Modern Standard Arabic, MSA). Use clear, warm, accessible language.'
    : 'Please respond in English.'

  contents.push({
    role: 'user',
    // Emergency detection ran on the raw message above; the copy sent to the
    // third-party AI provider is PHI-scrubbed (defence in depth).
    parts: [{ text: `${langInstruction}\n\nUser message: ${scrubPHI(message)}` }],
  })

  const res = await callGemini(apiKey, {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'AI service error' }, { status: 502 })
  }

  const data = await res.json()
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  if (!reply) {
    return NextResponse.json({ error: 'Empty response from AI' }, { status: 502 })
  }

  // Signature lets the client send this reply back as a trusted history turn.
  return NextResponse.json({ reply, emergency: false, sig: signModelTurn(userId, reply) })
}
