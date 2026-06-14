import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/security/verifyTurnstile'
import type { ScoringBand } from '@/lib/types'

async function notifyAdminsHighRiskGuest(submissionId: string, definitionId: string) {
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
          title_en: '⚠ High-risk flag raised (guest)',
          title_ar: '⚠ تم رفع علامة خطورة عالية (زائر)',
          body_en: `Assessment: ${nameEn} — submission ${submissionId} (anonymous guest)`,
          body_ar: `التقييم: ${nameAr} — رمز التقديم ${submissionId} (زائر مجهول)`,
          link: dedupeLink,
        }))
      )
    }
  } catch (err) {
    console.error('[notifyAdminsHighRiskGuest] error (non-fatal):', err)
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
  is_safety_item: boolean
}

interface GuestDemographics {
  dob: string
  gender: string
  marital: string
  education: string
  country: string
}

interface SubmitBody {
  definition_id: string
  responses: Array<{ item_id: string; value: number }>
  demographics: GuestDemographics
}

// Allowed demographic enum values
const ALLOWED_GENDERS = new Set(['male', 'female', 'non_binary', 'prefer_not_to_say'])
const ALLOWED_MARITAL = new Set(['single', 'married', 'divorced', 'widowed', 'separated', 'prefer_not_to_say'])
const ALLOWED_EDUCATION = new Set([
  'no_formal', 'primary', 'secondary', 'vocational', 'bachelors', 'masters', 'doctorate', 'prefer_not_to_say',
])

// Global guest-submission circuit breaker: if more than this many guest
// submissions exist in the last 24 h, the platform is under abuse and we
// stop accepting new ones to protect the DB.
const GLOBAL_GUEST_DAILY_CIRCUIT_BREAKER = 500

function calcBand(scoringLogic: ScoringBand[], score: number): ScoringBand | null {
  if (!scoringLogic || scoringLogic.length === 0) return null
  for (const band of scoringLogic) {
    if (score >= band.min && score <= band.max) return band
  }
  return scoringLogic[scoringLogic.length - 1]
}

/** Extract the real client IP, preferring Cloudflare's trusted header. */
function extractIp(request: Request): string {
  // CF-Connecting-IP is set by Cloudflare and cannot be spoofed by the client
  const cfIp = request.headers.get('cf-connecting-ip')?.trim()
  if (cfIp && isValidIp(cfIp)) return cfIp

  // Fall back to the leftmost IP in X-Forwarded-For (set by load balancers)
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    // Take the first (client) IP in the chain
    const first = xff.split(',')[0]?.trim()
    if (first && isValidIp(first)) return first
  }

  return 'unknown'
}

function isValidIp(ip: string): boolean {
  // Basic IPv4 or IPv6 check — not exhaustive but blocks obvious garbage
  return /^[\d.:a-fA-F]{2,45}$/.test(ip)
}

export async function POST(request: Request) {
  try {
    const ip = extractIp(request)

    // Dual-window IP rate limiting:
    //   Burst:  3 submissions per minute   (blocks rapid-fire scripts)
    //   Daily:  5 submissions per day      (blocks IP-rotation campaigns)
    const [burstRl, dailyRl] = await Promise.all([
      checkRateLimit(`guest-submit:burst:${ip}`, { limit: 3, windowMs: 60 * 1000 }),
      checkRateLimit(`guest-submit:daily:${ip}`, { limit: 5, windowMs: 24 * 60 * 60 * 1000 }),
    ])
    if (!burstRl.allowed || !dailyRl.allowed) {
      const retryAfter = !dailyRl.allowed ? '86400' : '60'
      return NextResponse.json(
        { error: !dailyRl.allowed ? 'Daily submission limit reached. Please try again tomorrow.' : 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': retryAfter } }
      )
    }

    // Reject if the caller is already authenticated — they should use the regular endpoint
    const anonClient = createClient()
    const { data: { user } } = await anonClient.auth.getUser()
    if (user) {
      return NextResponse.json({ error: 'Authenticated users must use /api/submit-assessment' }, { status: 400 })
    }

    const body: SubmitBody & { turnstile_token?: string } = await request.json()
    const { definition_id, responses, demographics } = body

    // Cloudflare Turnstile CAPTCHA — only enforced when TURNSTILE_SECRET_KEY is configured.
    // Without the env var the widget is not shown on the frontend either, so no token arrives.
    if (process.env.TURNSTILE_SECRET_KEY) {
      const turnstileResult = await verifyTurnstileToken(body.turnstile_token, ip !== 'unknown' ? ip : undefined)
      if (!turnstileResult.success) {
        return NextResponse.json(
          { error: 'CAPTCHA verification failed. Please try again.' },
          { status: 403 }
        )
      }
    }

    if (!definition_id || typeof definition_id !== 'string' || definition_id.length > 100) {
      return NextResponse.json({ error: 'definition_id is required' }, { status: 400 })
    }
    if (!Array.isArray(responses) || responses.length === 0 || responses.length > 200) {
      return NextResponse.json({ error: 'responses must be a non-empty array (max 200 items)' }, { status: 400 })
    }
    if (!demographics?.gender || !demographics?.country) {
      return NextResponse.json({ error: 'demographics are required' }, { status: 400 })
    }

    // Demographic enum validation — reject obviously fake/junk data
    const gender = String(demographics.gender).toLowerCase().trim()
    if (!ALLOWED_GENDERS.has(gender)) {
      return NextResponse.json({ error: 'Invalid gender value' }, { status: 400 })
    }
    const marital = demographics.marital ? String(demographics.marital).toLowerCase().trim() : null
    if (marital && !ALLOWED_MARITAL.has(marital)) {
      return NextResponse.json({ error: 'Invalid marital status value' }, { status: 400 })
    }
    const education = demographics.education ? String(demographics.education).toLowerCase().trim() : null
    if (education && !ALLOWED_EDUCATION.has(education)) {
      return NextResponse.json({ error: 'Invalid education value' }, { status: 400 })
    }
    // Country: 2–3 character ISO code
    const country = String(demographics.country).toUpperCase().trim()
    if (!/^[A-Z]{2,3}$/.test(country)) {
      return NextResponse.json({ error: 'Invalid country code (use ISO 3166-1 alpha-2 or alpha-3)' }, { status: 400 })
    }
    // DOB: basic date format check
    const dob = demographics.dob ? String(demographics.dob).trim() : null
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      return NextResponse.json({ error: 'Invalid date of birth format (use YYYY-MM-DD)' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Global circuit breaker: count total guest submissions in the last 24 h.
    // If the platform is absorbing an IP-rotation attack, shut the door for all guests.
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: globalCount } = await supabase
      .from('assessment_submissions')
      .select('*', { count: 'exact', head: true })
      .is('patient_id', null)
      .gte('submitted_at', since24h)
    if ((globalCount ?? 0) >= GLOBAL_GUEST_DAILY_CIRCUIT_BREAKER) {
      console.warn('[guest-submit] circuit breaker triggered — global guest submissions in 24h:', globalCount)
      return NextResponse.json(
        { error: 'Guest submissions are temporarily unavailable. Please try again later.' },
        { status: 503 }
      )
    }

    // Per-definition per-IP daily cap: 1 submission per assessment per IP per day.
    // Prevents a bot from re-submitting the same test endlessly to inflate statistics.
    const perDefRl = await checkRateLimit(`guest-submit:def:${definition_id}:${ip}`, {
      limit: 1,
      windowMs: 24 * 60 * 60 * 1000,
    })
    if (!perDefRl.allowed) {
      return NextResponse.json(
        { error: 'You have already submitted this assessment today.' },
        { status: 429, headers: { 'Retry-After': '86400' } }
      )
    }

    const { data: def, error: defErr } = await supabase
      .from('assessment_definitions')
      .select('id, code, name_en, scoring_logic, high_risk_threshold, is_active')
      .eq('id', definition_id)
      .single()

    if (defErr || !def) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    if (!def.is_active) return NextResponse.json({ error: 'Assessment is not active' }, { status: 400 })

    const { data: items } = await supabase
      .from('assessment_items')
      .select('id, response_options, is_safety_item')
      .eq('definition_id', definition_id)

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Assessment items not found' }, { status: 404 })
    }

    // Reject if bot sends more responses than there are items
    if (responses.length > items.length) {
      return NextResponse.json(
        { error: `Too many responses: assessment has ${items.length} items` },
        { status: 400 }
      )
    }

    const itemMap = new Map<string, ItemRow>(items.map(i => [i.id, i as ItemRow]))

    let totalScore = 0
    const seenItemIds = new Set<string>()
    const validatedResponses: Array<{ item_id: string; value: number; label_en: string; label_ar: string }> = []

    for (const resp of responses) {
      if (typeof resp.item_id !== 'string' || typeof resp.value !== 'number') {
        return NextResponse.json({ error: 'Invalid response format' }, { status: 400 })
      }
      if (seenItemIds.has(resp.item_id)) continue // deduplicate — first response per item wins
      const item = itemMap.get(resp.item_id)
      if (!item) continue
      seenItemIds.add(resp.item_id)

      const validOption = item.response_options.find(o => o.value === resp.value)
      if (!validOption) {
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

    const scoringLogic = def.scoring_logic as ScoringBand[]
    const band = calcBand(scoringLogic, totalScore)
    const safetyItemTriggered = validatedResponses.some(r => {
      const item = itemMap.get(r.item_id)
      return item?.is_safety_item && r.value > 0
    })
    const highRisk = safetyItemTriggered || (def.high_risk_threshold !== null && totalScore >= def.high_risk_threshold)

    const { data: submission, error: subErr } = await supabase
      .from('assessment_submissions')
      .insert({
        patient_id: null,
        definition_id,
        total_score: totalScore,
        severity_band: band?.severity_en ?? '',
        high_risk_flag: highRisk,
        is_self_initiated: true,
        guest_dob:       dob,
        guest_gender:    gender,
        guest_marital:   marital,
        guest_education: education,
        guest_country:   country,
      })
      .select('id')
      .single()

    if (subErr || !submission) {
      console.error('guest submission insert error:', subErr)
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
    }

    const responseRows = validatedResponses.map(r => ({
      submission_id: submission.id,
      item_id: r.item_id,
      response_value: r.value,
      response_label_en: r.label_en,
      response_label_ar: r.label_ar,
    }))
    await supabase.from('assessment_responses').insert(responseRows)

    // Server-side high-risk admin alert — idempotent, fire-and-forget
    if (highRisk) {
      notifyAdminsHighRiskGuest(submission.id, definition_id).catch(() => {})
    }

    return NextResponse.json({
      submission_id: submission.id,
      score: totalScore,
      band_en: band?.severity_en ?? null,
      band_ar: band?.severity_ar ?? null,
      high_risk: highRisk,
    })
  } catch (err) {
    console.error('submit-assessment-guest error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
