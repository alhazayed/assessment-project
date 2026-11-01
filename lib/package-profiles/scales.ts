import type { Bi, ItemResponse, Metrics, ScaleInput, ScaleResult, SubscaleScore } from './types'

/** Display name and maximum total for every scale a profile package uses. */
export const SCALE_INFO: Record<string, { name: Bi; max: number | null }> = {
  PHQ9:    { name: { en: 'Depression (PHQ-9)', ar: 'الاكتئاب (PHQ-9)' }, max: 27 },
  GAD7:    { name: { en: 'Anxiety (GAD-7)', ar: 'القلق (GAD-7)' }, max: 21 },
  PHQ15:   { name: { en: 'Physical symptoms (PHQ-15)', ar: 'الأعراض الجسدية (PHQ-15)' }, max: 30 },
  WHO5:    { name: { en: 'Wellbeing (WHO-5)', ar: 'الرفاهية (WHO-5)' }, max: 25 },
  ISI:     { name: { en: 'Insomnia (ISI)', ar: 'الأرق (ISI)' }, max: 28 },
  PSS10:   { name: { en: 'Perceived stress (PSS-10)', ar: 'الضغط المُدرَك (PSS-10)' }, max: 40 },
  OLBI:    { name: { en: 'Burnout (OLBI)', ar: 'الاحتراق الوظيفي (OLBI)' }, max: 64 },
  BRS:     { name: { en: 'Resilience (BRS)', ar: 'المرونة النفسية (BRS)' }, max: 30 },
  SWLS:    { name: { en: 'Life satisfaction (SWLS)', ar: 'الرضا عن الحياة (SWLS)' }, max: 35 },
  RSES:    { name: { en: 'Self-esteem (RSES)', ar: 'تقدير الذات (RSES)' }, max: 30 },
  FFMQ:    { name: { en: 'Mindfulness (FFMQ)', ar: 'اليقظة الذهنية (FFMQ)' }, max: 195 },
  IPIP120: { name: { en: 'Big Five personality (IPIP-NEO-120)', ar: 'العوامل الخمسة للشخصية (IPIP-NEO-120)' }, max: null },
  ECRR:    { name: { en: 'Attachment in close relationships (ECR-R)', ar: 'التعلّق في العلاقات القريبة (ECR-R)' }, max: null },
  DERS:    { name: { en: 'Emotion regulation difficulties (DERS)', ar: 'صعوبات تنظيم المشاعر (DERS)' }, max: 180 },
  MDQ:     { name: { en: 'Mood swings screen (MDQ)', ar: 'فحص تقلبات المزاج (MDQ)' }, max: 13 },
  ASRM:    { name: { en: 'Elevated mood (ASRM)', ar: 'ارتفاع المزاج (ASRM)' }, max: 20 },
  AUDIT:   { name: { en: 'Alcohol use (AUDIT)', ar: 'استخدام الكحول (AUDIT)' }, max: 40 },
  EAT26:   { name: { en: 'Eating attitudes (EAT-26)', ar: 'اتجاهات الأكل (EAT-26)' }, max: 78 },
  ACSI28:  { name: { en: 'Athletic coping skills (ACSI-28)', ar: 'مهارات التكيّف الرياضي (ACSI-28)' }, max: 84 },
}

const IPIP_DOMAINS: Record<string, Bi> = {
  N: { en: 'Neuroticism', ar: 'العصابية' },
  E: { en: 'Extraversion', ar: 'الانبساط' },
  O: { en: 'Openness', ar: 'الانفتاح' },
  A: { en: 'Agreeableness', ar: 'الوداعة' },
  C: { en: 'Conscientiousness', ar: 'يقظة الضمير' },
}

const LABELS: Record<string, Record<string, Bi>> = {
  OLBI: {
    E: { en: 'Exhaustion', ar: 'الإنهاك' },
    D: { en: 'Disengagement', ar: 'الانفصال عن العمل' },
  },
  ECRR: {
    Anxiety: { en: 'Attachment anxiety', ar: 'قلق التعلّق' },
    Avoidance: { en: 'Attachment avoidance', ar: 'تجنّب التعلّق' },
  },
  DERS: {
    Nonacceptance: { en: 'Non-acceptance of emotions', ar: 'عدم تقبّل المشاعر' },
    Goals: { en: 'Staying on task when upset', ar: 'الاستمرار في المهام عند الانزعاج' },
    Impulse: { en: 'Impulse control when upset', ar: 'ضبط الاندفاع عند الانزعاج' },
    Awareness: { en: 'Emotional awareness', ar: 'الوعي بالمشاعر' },
    Strategies: { en: 'Access to calming strategies', ar: 'الوصول إلى استراتيجيات التهدئة' },
    Clarity: { en: 'Emotional clarity', ar: 'وضوح المشاعر' },
  },
  FFMQ: {
    'Observe': { en: 'Observing', ar: 'الملاحظة' },
    'Describe': { en: 'Describing', ar: 'الوصف' },
    'Act with Awareness': { en: 'Acting with awareness', ar: 'التصرّف بوعي' },
    'Non-judging': { en: 'Non-judging', ar: 'عدم إصدار الأحكام' },
    'Non-reacting': { en: 'Non-reacting', ar: 'عدم الانفعال التلقائي' },
  },
  ACSI28: {
    coping_adversity: { en: 'Coping with adversity', ar: 'التعامل مع الشدائد' },
    peaking_pressure: { en: 'Peaking under pressure', ar: 'التألق تحت الضغط' },
    goal_setting: { en: 'Goal setting and mental preparation', ar: 'تحديد الأهداف والاستعداد الذهني' },
    concentration: { en: 'Concentration', ar: 'التركيز' },
    freedom_worry: { en: 'Freedom from worry', ar: 'التحرر من القلق' },
    confidence: { en: 'Confidence and achievement motivation', ar: 'الثقة ودافعية الإنجاز' },
    coachability: { en: 'Coachability', ar: 'تقبّل التوجيه' },
  },
}

function group(responses: ItemResponse[], keyOf: (r: ItemResponse) => string | null) {
  const out = new Map<string, number[]>()
  for (const r of responses) {
    const k = keyOf(r)
    if (!k) continue
    const arr = out.get(k) ?? []
    arr.push(r.value)
    out.set(k, arr)
  }
  return out
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : NaN)
const round2 = (x: number) => Math.round(x * 100) / 100

/**
 * Turn one scale's latest submission into a report row plus the flat metrics
 * the pattern rules read. Responses are already reverse-keyed in the database
 * (response_options carry keyed values), so subscales are plain aggregates.
 */
export function scoreScale(input: ScaleInput): { result: ScaleResult; metrics: Metrics } {
  const { code, total, responses } = input
  const info = SCALE_INFO[code] ?? { name: { en: code, ar: code }, max: null }
  const m: Metrics = { [`${code}.total`]: total }
  const subscales: SubscaleScore[] = []
  const byItem = new Map(responses.map(r => [r.item_number, r.value]))

  switch (code) {
    case 'PHQ9': {
      const item9 = byItem.get(9)
      if (item9 !== undefined) m['PHQ9.item9'] = item9
      break
    }
    case 'WHO5':
      m['WHO5.pct'] = total * 4
      break
    case 'BRS':
      m['BRS.mean'] = round2(total / 6)
      break
    case 'AUDIT': {
      const c = [1, 2, 3].map(n => byItem.get(n))
      if (c.every(v => v !== undefined)) m['AUDIT.c'] = sum(c as number[])
      break
    }
    case 'OLBI':
    case 'ECRR':
    case 'DERS':
    case 'FFMQ': {
      const labels = LABELS[code]
      const groups = group(responses, r => r.subscale)
      const scaleMax = code === 'ECRR' ? 7 : code === 'OLBI' ? 4 : 5
      for (const [key, label] of Object.entries(labels)) {
        const vals = groups.get(key)
        if (!vals?.length) continue
        const score = round2(mean(vals))
        m[`${code}.${key}`] = score
        subscales.push({ key, label, score, metric: 'mean', min: 1, max: scaleMax })
      }
      break
    }
    case 'IPIP120': {
      const domains = group(responses, r => (r.subscale ? r.subscale.split('-')[0] : null))
      for (const [key, label] of Object.entries(IPIP_DOMAINS)) {
        const vals = domains.get(key)
        if (!vals?.length) continue
        const score = round2(mean(vals))
        m[`IPIP120.${key}`] = score
        subscales.push({ key, label, score, metric: 'mean', min: 1, max: 5 })
      }
      break
    }
    case 'ACSI28': {
      const groups = group(responses, r => r.subscale)
      for (const [key, label] of Object.entries(LABELS.ACSI28)) {
        const vals = groups.get(key)
        if (!vals?.length) continue
        const score = sum(vals)
        m[`ACSI28.${key}`] = score
        subscales.push({ key, label, score, metric: 'sum', min: 0, max: 12 })
      }
      break
    }
  }

  return {
    result: {
      code,
      name: info.name,
      total,
      max: info.max,
      submitted_at: input.submitted_at,
      band: input.band,
      bandColor: input.bandColor,
      subscales,
    },
    metrics: m,
  }
}

/** Lowest-scoring subscale, used for "growth lever" style patterns. */
export function lowestSubscale(result: ScaleResult | undefined): SubscaleScore | null {
  if (!result || result.subscales.length === 0) return null
  return [...result.subscales].sort((a, b) => a.score / a.max - b.score / b.max)[0]
}

export function highestSubscale(result: ScaleResult | undefined): SubscaleScore | null {
  if (!result || result.subscales.length === 0) return null
  return [...result.subscales].sort((a, b) => b.score / b.max - a.score / a.max)[0]
}
