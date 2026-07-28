/**
 * Self-knowledge product helpers: first-insight themes, pulse checks,
 * strengths framing, and growth pathways.
 */

export type InsightThemeId =
  | 'mood'
  | 'anxiety'
  | 'stress'
  | 'sleep'
  | 'wellbeing'
  | 'personality'
  | 'relationships'
  | 'work'

export interface InsightTheme {
  id: InsightThemeId
  labelEn: string
  labelAr: string
  descEn: string
  descAr: string
  /** Preferred assessment codes in order of preference (first available wins). */
  preferredCodes: string[]
  /** Brief pulse codes for follow-up check-ins. */
  pulseCodes: string[]
}

export const INSIGHT_THEMES: InsightTheme[] = [
  {
    id: 'mood',
    labelEn: 'My mood',
    labelAr: 'مزاجي',
    descEn: 'Understand low mood, energy, and interest.',
    descAr: 'افهم انخفاض المزاج والطاقة والاهتمام.',
    preferredCodes: ['PHQ9', 'DASS21', 'CESD'],
    pulseCodes: ['PHQ9', 'WHO5'],
  },
  {
    id: 'anxiety',
    labelEn: 'My worry & anxiety',
    labelAr: 'قلقي وهمومي',
    descEn: 'See how worry shows up in daily life.',
    descAr: 'تعرّف كيف يظهر القلق في حياتك اليومية.',
    preferredCodes: ['GAD7', 'DASS21', 'PSWQ'],
    pulseCodes: ['GAD7', 'PSS4'],
  },
  {
    id: 'stress',
    labelEn: 'My stress load',
    labelAr: 'ضغطي النفسي',
    descEn: 'Measure how overwhelmed you feel right now.',
    descAr: 'قِس مدى شعورك بالإرهاق حالياً.',
    preferredCodes: ['PSS10', 'PSS4', 'K10'],
    pulseCodes: ['PSS4', 'WHO5'],
  },
  {
    id: 'sleep',
    labelEn: 'My sleep',
    labelAr: 'نومي',
    descEn: 'Check insomnia severity and sleep strain.',
    descAr: 'افحص شدة الأرق وإجهاد النوم.',
    preferredCodes: ['ISI'],
    pulseCodes: ['ISI', 'WHO5'],
  },
  {
    id: 'wellbeing',
    labelEn: 'My wellbeing',
    labelAr: 'رفاهيتي',
    descEn: 'Start with strengths, resilience, and life satisfaction.',
    descAr: 'ابدأ بنقاط القوة والمرونة والرضا عن الحياة.',
    preferredCodes: ['WHO5', 'BRS', 'SWLS', 'RSES'],
    pulseCodes: ['WHO5', 'BRS'],
  },
  {
    id: 'personality',
    labelEn: 'My personality',
    labelAr: 'شخصيتي',
    descEn: 'Build a baseline of how you typically think and relate.',
    descAr: 'ابنِ أساساً لطريقتك المعتادة في التفكير والتواصل.',
    preferredCodes: ['BFI44', 'IPIP120'],
    pulseCodes: ['WHO5', 'PSS4'],
  },
  {
    id: 'relationships',
    labelEn: 'My relationships',
    labelAr: 'علاقاتي',
    descEn: 'Explore closeness, attachment, and connection.',
    descAr: 'استكشف القرب والتعلق والتواصل.',
    preferredCodes: ['ECRR', 'UCLA', 'RSES'],
    pulseCodes: ['WHO5', 'RSES'],
  },
  {
    id: 'work',
    labelEn: 'Work & burnout',
    labelAr: 'العمل والإرهاق',
    descEn: 'Check burnout and workplace strain.',
    descAr: 'افحص الإرهاق وضغط بيئة العمل.',
    preferredCodes: ['OLBI', 'PSS10', 'DASS21'],
    pulseCodes: ['PSS4', 'WHO5'],
  },
]

/** Positive / strengths-oriented assessment codes. */
export const STRENGTH_ORIENTED_CODES = new Set([
  'WHO5', 'SWLS', 'RSES', 'BRS', 'CDRISC', 'WHOQOL', 'PANAS', 'FFMQ', 'BFI44', 'IPIP120', 'WEMWBS',
])

export function deriveStrengths(
  code: string,
  bandEn: string,
  whatThisMeans: string[],
  lang: 'en' | 'ar'
): string[] {
  const strengths: string[] = []
  const band = bandEn.toLowerCase()
  const isLowSymptom =
    band.includes('minimal') ||
    band.includes('none') ||
    band.includes('normal') ||
    band.includes('low') ||
    band.includes('below') ||
    band.includes('no problem') ||
    band.includes('negative')

  if (STRENGTH_ORIENTED_CODES.has(code)) {
    if (lang === 'ar') {
      strengths.push('هذا المقياس يسلّط الضوء على جوانب إيجابية في تجربتك — وليس فقط الصعوبات.')
      if (whatThisMeans[0]) strengths.push(whatThisMeans[0])
    } else {
      strengths.push('This scale highlights positive aspects of your experience — not only difficulties.')
      if (whatThisMeans[0]) strengths.push(whatThisMeans[0])
    }
    return strengths.slice(0, 3)
  }

  if (isLowSymptom) {
    strengths.push(
      lang === 'ar'
        ? 'أعراضك في هذا المجال ضمن نطاق منخفض حالياً — وهذه نقطة قوة تستحق البناء عليها.'
        : 'Your symptoms in this area are currently in a lower range — a strength worth building on.'
    )
  } else {
    strengths.push(
      lang === 'ar'
        ? 'إكمالك لهذا التقييم خطوة واعية نحو فهم نفسك بشكل أوضح.'
        : 'Completing this assessment is a conscious step toward understanding yourself more clearly.'
    )
    strengths.push(
      lang === 'ar'
        ? 'الوعي بأنماطك هو أساس التغيير — حتى عندما تشعر بالتحدي.'
        : 'Awareness of your patterns is the foundation of change — even when things feel challenging.'
    )
  }

  // Pull any positively framed bullets from whatThisMeans
  for (const point of whatThisMeans) {
    const p = point.toLowerCase()
    if (
      p.includes('protective') ||
      p.includes('within the expected') ||
      p.includes('normal') ||
      p.includes('strength') ||
      p.includes('وقائي') ||
      p.includes('نطاق المتوقع') ||
      p.includes('طبيعي')
    ) {
      strengths.push(point)
    }
  }

  return [...new Set(strengths)].slice(0, 3)
}

export interface SelfKnowledgePath {
  id: string
  labelEn: string
  labelAr: string
  descEn: string
  descAr: string
  codes: string[]
}

/** Theme pathways shown after results (product “Profiles”, not SaaS plans). */
export const SELF_KNOWLEDGE_PATHS: SelfKnowledgePath[] = [
  {
    id: 'anxiety-stress',
    labelEn: 'Anxiety & Stress path',
    labelAr: 'مسار القلق والضغط',
    descEn: 'Deepen insight across worry, stress, and recovery.',
    descAr: 'عمّق فهمك عبر القلق والضغط والتعافي.',
    codes: ['GAD7', 'PSS10', 'DASS21', 'WHO5', 'BRS'],
  },
  {
    id: 'depression',
    labelEn: 'Mood & Depression path',
    labelAr: 'مسار المزاج والاكتئاب',
    descEn: 'Track mood patterns and protective wellbeing factors.',
    descAr: 'تتبّع أنماط المزاج وعوامل الرفاهية الوقائية.',
    codes: ['PHQ9', 'DASS21', 'WHO5', 'BRS'],
  },
  {
    id: 'trauma-resilience',
    labelEn: 'Trauma & Resilience path',
    labelAr: 'مسار الصدمة والمرونة',
    descEn: 'Pair trauma screening with resilience strengths.',
    descAr: 'اجمع بين فحص الصدمة ونقاط قوة المرونة.',
    codes: ['PCL5', 'BRS', 'WHO5', 'DASS21'],
  },
  {
    id: 'personality-baseline',
    labelEn: 'Personality baseline → pulse',
    labelAr: 'أساس الشخصية ← نبضات قصيرة',
    descEn: 'Take a personality baseline once, then short wellbeing pulses.',
    descAr: 'خذ أساساً للشخصية مرة واحدة، ثم نبضات رفاهية قصيرة.',
    codes: ['BFI44', 'IPIP120', 'WHO5', 'PSS4'],
  },
  {
    id: 'healthy-lifestyle',
    labelEn: 'Healthy lifestyle path',
    labelAr: 'مسار نمط الحياة الصحي',
    descEn: 'Sleep, stress, and wellbeing in one journey.',
    descAr: 'النوم والضغط والرفاهية في رحلة واحدة.',
    codes: ['ISI', 'WHO5', 'PSS10', 'DASS21'],
  },
]

export function pathForAssessmentCode(code: string): SelfKnowledgePath | undefined {
  return SELF_KNOWLEDGE_PATHS.find(p => p.codes.includes(code))
}

/** Ultra-brief pulse suggestions for dashboard check-ins. */
export const PULSE_CODES = ['WHO5', 'PSS4', 'PHQ9', 'GAD7', 'ISI'] as const
