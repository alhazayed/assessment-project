import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

type RescreenRule = {
  intervalDays: number
  concernIntervalDays: number
  concernThreshold: number
  higherIsBetter: boolean
}

const RULES: Record<string, RescreenRule> = {
  PHQ9:   { intervalDays: 90,  concernIntervalDays: 14,  concernThreshold: 10, higherIsBetter: false },
  PHQ15:  { intervalDays: 90,  concernIntervalDays: 14,  concernThreshold: 15, higherIsBetter: false },
  GAD7:   { intervalDays: 90,  concernIntervalDays: 14,  concernThreshold: 10, higherIsBetter: false },
  DASS21: { intervalDays: 90,  concernIntervalDays: 14,  concernThreshold: 28, higherIsBetter: false },
  ISI:    { intervalDays: 90,  concernIntervalDays: 14,  concernThreshold: 15, higherIsBetter: false },
  PSS10:  { intervalDays: 90,  concernIntervalDays: 30,  concernThreshold: 27, higherIsBetter: false },
  PSS4:   { intervalDays: 90,  concernIntervalDays: 30,  concernThreshold: 9,  higherIsBetter: false },
  K10:    { intervalDays: 90,  concernIntervalDays: 14,  concernThreshold: 30, higherIsBetter: false },
  CESD:   { intervalDays: 90,  concernIntervalDays: 14,  concernThreshold: 16, higherIsBetter: false },
  GDS15:  { intervalDays: 90,  concernIntervalDays: 14,  concernThreshold: 5,  higherIsBetter: false },
  PCL5:   { intervalDays: 90,  concernIntervalDays: 14,  concernThreshold: 33, higherIsBetter: false },
  IESR:   { intervalDays: 90,  concernIntervalDays: 14,  concernThreshold: 33, higherIsBetter: false },
  PSWQ:   { intervalDays: 90,  concernIntervalDays: 30,  concernThreshold: 45, higherIsBetter: false },
  LSAS:   { intervalDays: 180, concernIntervalDays: 30,  concernThreshold: 55, higherIsBetter: false },
  SPIN:   { intervalDays: 180, concernIntervalDays: 30,  concernThreshold: 20, higherIsBetter: false },
  OLBI:   { intervalDays: 90,  concernIntervalDays: 30,  concernThreshold: 40, higherIsBetter: false },
  AUDIT:  { intervalDays: 180, concernIntervalDays: 30,  concernThreshold: 8,  higherIsBetter: false },
  ASRS:   { intervalDays: 365, concernIntervalDays: 90,  concernThreshold: 24, higherIsBetter: false },
  OCIR:   { intervalDays: 180, concernIntervalDays: 30,  concernThreshold: 21, higherIsBetter: false },
  EAT26:  { intervalDays: 180, concernIntervalDays: 30,  concernThreshold: 20, higherIsBetter: false },
  ACE:    { intervalDays: 365, concernIntervalDays: 180, concernThreshold: 4,  higherIsBetter: false },
  DERS:   { intervalDays: 90,  concernIntervalDays: 30,  concernThreshold: 90, higherIsBetter: false },
  WHO5:   { intervalDays: 180, concernIntervalDays: 30,  concernThreshold: 50, higherIsBetter: true  },
  BRS:    { intervalDays: 180, concernIntervalDays: 60,  concernThreshold: 18, higherIsBetter: true  },
  RSES:   { intervalDays: 180, concernIntervalDays: 60,  concernThreshold: 15, higherIsBetter: true  },
  SWLS:   { intervalDays: 180, concernIntervalDays: 60,  concernThreshold: 20, higherIsBetter: true  },
  CDRISC: { intervalDays: 180, concernIntervalDays: 60,  concernThreshold: 50, higherIsBetter: true  },
  FFMQ:   { intervalDays: 180, concernIntervalDays: 60,  concernThreshold: 117, higherIsBetter: true },
}

function isConcerning(score: number, rule: RescreenRule): boolean {
  return rule.higherIsBetter ? score < rule.concernThreshold : score >= rule.concernThreshold
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 5 calls per hour per user — this endpoint triggers DB writes
    const rl = await checkRateLimit(`rescreen:${user.id}`, { limit: 5, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests', created: 0 }, { status: 429 })
    }

    const { data: submissions } = await supabase
      .from('assessment_submissions')
      .select('submitted_at, total_score, definition_id, assessment_definitions(code, name_en, name_ar)')
      .eq('patient_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(250)

    if (!submissions?.length) return NextResponse.json({ created: 0 })

    // Most recent per definition
    const seenDefs = new Set<string>()
    const latest: Array<{
      defId: string
      code: string
      name_en: string
      name_ar: string
      score: number
      submittedAt: Date
    }> = []

    for (const s of submissions) {
      const def = s.assessment_definitions as unknown as { code: string; name_en: string; name_ar: string } | null
      if (!def?.code || !def.name_en || seenDefs.has(s.definition_id)) continue
      seenDefs.add(s.definition_id)
      latest.push({
        defId: s.definition_id,
        code: def.code,
        name_en: def.name_en,
        name_ar: def.name_ar ?? def.name_en,
        score: s.total_score,
        submittedAt: new Date(s.submitted_at),
      })
    }

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Bulk-fetch recent rescreen notifications to avoid per-item queries
    const { data: recentNotifs } = await supabase
      .from('notifications')
      .select('link')
      .eq('user_id', user.id)
      .eq('type', 'rescreen')
      .gte('created_at', sevenDaysAgo)

    const recentlyNotified = new Set(recentNotifs?.map(n => n.link) ?? [])

    const toCreate: Array<{
      user_id: string
      type: string
      title_en: string
      title_ar: string
      body_en: string
      body_ar: string
      link: string
    }> = []

    for (const item of latest) {
      const rule = RULES[item.code]
      if (!rule) continue

      const concerning = isConcerning(item.score, rule)
      const intervalDays = concerning ? rule.concernIntervalDays : rule.intervalDays
      const daysSince = (now.getTime() - item.submittedAt.getTime()) / (1000 * 60 * 60 * 24)

      if (daysSince < intervalDays) continue

      const link = `/assessments/${item.defId}`
      if (recentlyNotified.has(link)) continue

      toCreate.push({
        user_id: user.id,
        type: 'rescreen',
        title_en: `Time to recheck: ${item.name_en}`,
        title_ar: `حان وقت إعادة الفحص: ${item.name_ar}`,
        body_en: concerning
          ? `Your last ${item.name_en} score suggested elevated concern. Regular rescreening helps you monitor your progress.`
          : `It's been a while since your last ${item.name_en} assessment. Take a few minutes to check in.`,
        body_ar: concerning
          ? `أشارت نتيجتك الأخيرة في ${item.name_ar} إلى مستوى مرتفع يستدعي المتابعة. المراقبة المنتظمة تساعدك على تتبع تقدمك.`
          : `مضى وقت منذ آخر تقييم لك في ${item.name_ar}. خذ دقائق للتحقق من حالتك.`,
        link,
      })
    }

    if (toCreate.length > 0) {
      await supabase.from('notifications').insert(toCreate)
    }

    return NextResponse.json({ created: toCreate.length })
  } catch (err) {
    console.error('check-rescreening error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
