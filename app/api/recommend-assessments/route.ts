import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { scrubPHI } from '@/lib/security/anonymizePHI'
import { checkAiBudget } from '@/lib/security/aiBudgetGuard'
import { callAI, isAIConfigured, AIServiceError } from '@/lib/ai-client'

// Max chars for each description field sent to the AI model (controls token spend)
const MAX_DESC_CHARS = 80

/** Extract the real client IP, preferring Cloudflare's trusted header. */
function extractIp(request: Request): string {
  const cfIp = request.headers.get('cf-connecting-ip')?.trim()
  if (cfIp && /^[\d.:a-fA-F]{2,45}$/.test(cfIp)) return cfIp
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first && /^[\d.:a-fA-F]{2,45}$/.test(first)) return first
  }
  return 'unknown'
}

export async function POST(request: Request) {
  try {
    const ip = extractIp(request)

    // Burst: 3/min per IP; Daily: 30/day per IP
    const [burstRl, dailyRl] = await Promise.all([
      checkRateLimit(`ai-recommend:burst:${ip}`, { limit: 3, windowMs: 60 * 1000 }),
      checkRateLimit(`ai-recommend:daily:${ip}`, { limit: 30, windowMs: 24 * 60 * 60 * 1000 }),
    ])
    if (!burstRl.allowed || !dailyRl.allowed) {
      const retryAfter = !dailyRl.allowed ? '86400' : '60'
      return NextResponse.json(
        { error: !dailyRl.allowed ? 'Daily limit reached. Try again tomorrow.' : 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': retryAfter } }
      )
    }

    const body = await request.json().catch(() => null)
    const text = body?.text
    if (!text?.trim()) {
      return NextResponse.json({ error: 'No input provided' }, { status: 400 })
    }
    if (typeof text !== 'string' || text.length > 500) {
      return NextResponse.json({ error: 'Input too long (max 500 characters)' }, { status: 400 })
    }

    if (!isAIConfigured()) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }

    // Global AI cost circuit breaker
    const budget = await checkAiBudget()
    if (!budget.allowed) {
      return NextResponse.json({ error: 'AI services temporarily unavailable' }, { status: 503 })
    }

    const supabase = createClient()
    const { data: assessments } = await supabase
      .from('assessment_definitions')
      .select('id, code, name_en, name_ar, description_en')
      .eq('is_active', true)
      .order('name_en')
      .limit(30) // cap number of assessments sent to Gemini

    if (!assessments?.length) {
      return NextResponse.json({ error: 'No assessments available' }, { status: 500 })
    }

    // Truncate descriptions to cap token spend
    const assessmentList = assessments
      .map(a => {
        const desc = a.description_en
          ? a.description_en.slice(0, MAX_DESC_CHARS) + (a.description_en.length > MAX_DESC_CHARS ? '…' : '')
          : ''
        return `${a.code}: ${a.name_en}${desc ? ` — ${desc}` : ''}`
      })
      .join('\n')

    const systemInstruction = `You are a clinical psychologist assistant helping match users to appropriate psychological assessments.
Analyze how the user is feeling and recommend the 2-3 most clinically relevant assessments from the provided list.
Return ONLY a valid JSON array — no markdown, no explanation outside JSON.

Available assessments:
${assessmentList}

Return a JSON array (max 3 items):
[{"code":"<code>","name_en":"<name>","name_ar":"<arabic name>","reason_en":"<1 sentence>","reason_ar":"<1 sentence>","relevance":"high"|"medium"}]
Only include assessments from the provided list.`

    let raw: string
    try {
      const result = await callAI({
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: scrubPHI(text.trim()) },
        ],
        temperature: 0.3,
        maxTokens: 512,
      })
      raw = result.content
    } catch (err) {
      if (err instanceof AIServiceError) {
        console.error('[recommend-assessments] all providers failed:', err.message)
        return NextResponse.json({ error: 'AI service error', detail: err.message }, { status: 502 })
      }
      throw err
    }

    const validCodes = new Set(assessments.map(a => a.code))
    const codeToId = new Map(assessments.map(a => [a.code, a.id]))
    let recommendations: Array<{ id: string; code: string; name_en: string; name_ar: string; reason_en: string; reason_ar: string; relevance: string }> = []
    try {
      const jsonMatch = raw.match(/\[[\s\S]*?\]/)
      const parsed: unknown[] = jsonMatch ? JSON.parse(jsonMatch[0]) : []
      recommendations = (parsed
        .filter((r): r is Record<string, unknown> =>
          r !== null &&
          typeof r === 'object' &&
          typeof (r as Record<string, unknown>).code === 'string' &&
          validCodes.has((r as Record<string, unknown>).code as string) &&
          typeof (r as Record<string, unknown>).name_en === 'string' &&
          typeof (r as Record<string, unknown>).reason_en === 'string'
        )
        .map(r => ({ ...r, id: codeToId.get(r.code as string) ?? '' })) as typeof recommendations).slice(0, 3)
    } catch {
      recommendations = []
    }

    return NextResponse.json({ recommendations })
  } catch (err) {
    console.error('recommend-assessments error:', err)
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 })
  }
}
