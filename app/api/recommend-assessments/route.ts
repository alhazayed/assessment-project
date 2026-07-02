import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { scrubPHI } from '@/lib/security/anonymizePHI'

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

interface AssessmentMeta {
  keywords_en: string[]
  keywords_ar: string[]
  reason_en: string
  reason_ar: string
}

// Keyword map and bilingual reasons for each assessment code
const ASSESSMENT_META: Record<string, AssessmentMeta> = {
  PHQ9: {
    keywords_en: ['depress', 'sad', 'hopeless', 'worthless', 'empty', 'no interest', 'lost interest', 'low mood', 'cry', 'suicid', 'self-harm', 'gloomy', 'miserable', 'unhappy', 'joyless', 'pointless', 'blue', 'guilt', 'pleasure'],
    keywords_ar: ['اكتئاب', 'حزن', 'يأس', 'بكاء', 'حزين', 'فقدان الاهتمام', 'لا قيمة', 'مزاج', 'كئيب', 'لا هدف', 'ذنب', 'متعب', 'شعور بالفراغ', 'وحيد', 'ميؤوس'],
    reason_en: 'Your description suggests low mood, sadness, or loss of interest — the PHQ-9 is the gold standard for measuring depression severity.',
    reason_ar: 'وصفك يشير إلى انخفاض المزاج أو الحزن أو فقدان الاهتمام — مقياس PHQ-9 هو المعيار الذهبي لقياس شدة الاكتئاب.',
  },
  GAD7: {
    keywords_en: ['anxi', 'worry', 'worri', 'nervous', 'panic', 'restless', 'tense', 'fear', 'scar', 'racing thought', 'heart racing', 'breathe', 'overwhelm', 'on edge', 'dread', 'uneasy', 'control'],
    keywords_ar: ['قلق', 'خوف', 'توتر', 'هلع', 'ارتجاف', 'تفكير', 'أفكار تتسارع', 'تسارع', 'السيطرة', 'الاسترخاء', 'خائف', 'رهبة', 'هواجس', 'مرعوب', 'قلقة'],
    reason_en: 'Your symptoms — racing thoughts, worry you can\'t control, inability to relax — are classic signs of anxiety that GAD-7 screens for.',
    reason_ar: 'أعراضك — الأفكار المتسارعة والقلق الذي لا تستطيع السيطرة عليه وصعوبة الاسترخاء — هي علامات القلق الكلاسيكية التي يقيسها مقياس GAD-7.',
  },
  ISI: {
    keywords_en: ['sleep', 'insomni', 'can\'t sleep', 'wake up', 'waking', 'fatigue', 'exhaust', 'rest', 'tired', 'nightmare', 'lying awake', 'fall asleep', 'stay asleep', 'drowsy', 'sleepy'],
    keywords_ar: ['نوم', 'أرق', 'لا أستطيع النوم', 'أستيقظ', 'إرهاق', 'تعب', 'كوابيس', 'مرهق', 'نائم', 'راحة', 'النعاس'],
    reason_en: 'Sleep difficulties you describe — trouble falling or staying asleep, fatigue — are exactly what the Insomnia Severity Index measures.',
    reason_ar: 'صعوبات النوم التي تصفها — صعوبة في النوم أو الاستمرار فيه والإرهاق — هي بالضبط ما يقيسه مؤشر شدة الأرق.',
  },
  DASS21: {
    keywords_en: ['stress', 'burn out', 'burnout', 'pressure', 'irritabl', 'frustrat', 'overwhelm', 'tense', 'agitat', 'hopeless', 'numb', 'on edge', 'wound up', 'overreact', 'nervous', 'dread', 'panic'],
    keywords_ar: ['ضغط', 'إرهاق وظيفي', 'محروق', 'ضيق', 'متوتر', 'عصبي', 'محبط', 'مشاعر', 'إرهاق نفسي', 'ضغوط', 'حدة', 'انفجار', 'لا أتحكم'],
    reason_en: 'The DASS-21 measures depression, anxiety, and stress together — useful when you\'re experiencing a mix of these symptoms.',
    reason_ar: 'يقيس مقياس DASS-21 الاكتئاب والقلق والضغط معاً — مفيد عندما تعاني من مزيج من هذه الأعراض.',
  },
  PCL5: {
    keywords_en: ['trauma', 'ptsd', 'flashback', 'nightmare', 'abuse', 'accident', 'violence', 'intrusive', 'avoid', 'hypervigilant', 'startle', 'numb', 'detach', 'assault', 'attack', 'incident', 'haunting'],
    keywords_ar: ['صدمة', 'كوابيس', 'ذكريات مؤلمة', 'حادثة', 'عنف', 'اعتداء', 'مؤلم', 'متيقظ', 'خدر', 'تجنب', 'ماضي', 'موقف صادم', 'حذر'],
    reason_en: 'Your mention of trauma-related experiences or intrusive memories suggests the PCL-5 PTSD checklist would be valuable.',
    reason_ar: 'ذكرك لتجارب مرتبطة بصدمة أو ذكريات تدخلية يشير إلى أن قائمة PTSD PCL-5 ستكون قيّمة.',
  },
  WHO5: {
    keywords_en: ['quality of life', 'wellbeing', 'well-being', 'overall', 'general', 'happy', 'satisfaction', 'energy', 'functioning', 'cheerful', 'fresh', 'active', 'interest in life', 'daily life'],
    keywords_ar: ['جودة الحياة', 'رفاهية', 'سعادة', 'رضا', 'صحة عامة', 'طاقة', 'نشاط', 'حيوية', 'مزاجي', 'حياتي بشكل عام'],
    reason_en: 'The WHO-5 Well-Being Index gives a quick snapshot of your overall mental wellness and quality of life.',
    reason_ar: 'يمنحك مؤشر WHO-5 للرفاهية لمحة سريعة عن صحتك النفسية العامة وجودة حياتك.',
  },
  ASRS: {
    keywords_en: ['adhd', 'attention', 'focus', 'concentrat', 'hyperactiv', 'impulsiv', 'distract', 'forgetful', 'procrastinat', 'fidget', 'restless', 'scatter', 'organize', 'interrupt', 'impatient'],
    keywords_ar: ['تركيز', 'انتباه', 'تشتت', 'نسيان', 'نشاط زائد', 'اندفاع', 'تأخير', 'فرط الحركة', 'لا أستطيع الجلوس', 'تنظيم', 'مقاطعة', 'صعوبة في الإنهاء'],
    reason_en: 'Attention difficulties, distractibility, or impulsivity you describe are hallmark ADHD symptoms — the ASRS screens for adult ADHD.',
    reason_ar: 'صعوبات الانتباه والتشتت أو الاندفاعية التي تصفها هي أعراض ADHD النموذجية — يفحص مقياس ASRS لـ ADHD لدى البالغين.',
  },
  MDQ: {
    keywords_en: ['bipolar', 'mood swing', 'manic', 'mania', 'euphoria', 'grandiose', 'racing thought', 'impulsive spending', 'sleep less', 'high energy', 'irritabl', 'elevated mood', 'up and down', 'extreme', 'cycle'],
    keywords_ar: ['ثنائي القطب', 'تقلب المزاج', 'نشوة', 'طاقة عالية', 'نوم قليل', 'تصرفات متهورة', 'مزاج متقلب', 'هوس', 'أعلى وأسفل', 'دورات مزاجية'],
    reason_en: 'Extreme mood swings, periods of unusually high energy, or cycles between very high and very low moods suggest screening with the MDQ.',
    reason_ar: 'تقلبات المزاج الشديدة أو فترات الطاقة العالية بشكل غير معتاد أو الدورات بين المزاج العالي والمنخفض جداً تقترح الفحص باستخدام MDQ.',
  },
  IPIP120: {
    keywords_en: ['personality', 'who am i', 'traits', 'character', 'introvert', 'extrovert', 'curious', 'self-discover', 'self-aware', 'identity', 'strengths', 'big five'],
    keywords_ar: ['شخصية', 'من أنا', 'صفات', 'طباع', 'انطوائي', 'اجتماعي', 'فضول', 'اكتشاف الذات', 'هوية', 'نقاط قوة'],
    reason_en: 'If you want to understand your core personality traits and how you relate to the world, the IPIP-120 Big Five assessment offers deep insight.',
    reason_ar: 'إذا أردت فهم سمات شخصيتك الجوهرية وكيفية تعاملك مع العالم، فإن تقييم IPIP-120 للشخصية الخمسة الكبرى يقدم رؤية عميقة.',
  },
}

function scoreAssessment(query: string, meta: AssessmentMeta): number {
  const lower = query.toLowerCase()
  let score = 0
  for (const kw of meta.keywords_en) {
    if (lower.includes(kw.toLowerCase())) score += 2
  }
  for (const kw of meta.keywords_ar) {
    if (query.includes(kw)) score += 2
  }
  return score
}

export async function POST(request: Request) {
  try {
    const ip = extractIp(request)

    // Burst: 5/min per IP; Daily: 50/day per IP (local matching is free)
    const [burstRl, dailyRl] = await Promise.all([
      checkRateLimit(`ai-recommend:burst:${ip}`, { limit: 5, windowMs: 60 * 1000 }),
      checkRateLimit(`ai-recommend:daily:${ip}`, { limit: 50, windowMs: 24 * 60 * 60 * 1000 }),
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

    const query = scrubPHI(text.trim())

    // Fetch active assessments to get real IDs and names
    const supabase = await createClient()
    const { data: assessments } = await supabase
      .from('assessment_definitions')
      .select('id, code, name_en, name_ar')
      .eq('is_active', true)
      .order('name_en')

    if (!assessments?.length) {
      return NextResponse.json({ error: 'No assessments available' }, { status: 500 })
    }

    const codeToAssessment = new Map(assessments.map(a => [a.code, a]))

    // Score each known assessment against the query
    const scored = Object.entries(ASSESSMENT_META)
      .map(([code, meta]) => {
        const assessment = codeToAssessment.get(code)
        if (!assessment) return null
        const score = scoreAssessment(query, meta)
        return { code, score, assessment, meta }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    // If nothing matched, try a broader fallback: recommend PHQ9 + GAD7 as general screeners
    const results = scored.length > 0 ? scored : (() => {
      const fallbackCodes = ['PHQ9', 'GAD7', 'WHO5']
      return fallbackCodes
        .map(code => {
          const assessment = codeToAssessment.get(code)
          const meta = ASSESSMENT_META[code]
          if (!assessment || !meta) return null
          return { code, score: 1, assessment, meta }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    })()

    const recommendations = results.map(({ code, score, assessment, meta }) => ({
      id: assessment.id,
      code,
      name_en: assessment.name_en,
      name_ar: assessment.name_ar,
      reason_en: meta.reason_en,
      reason_ar: meta.reason_ar,
      relevance: score >= 4 ? 'high' : 'medium',
    }))

    return NextResponse.json({ recommendations })
  } catch (err) {
    console.error('recommend-assessments error:', err)
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 })
  }
}
