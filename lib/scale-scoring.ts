// Subscale scoring and display rules for assessments whose total alone is not
// the result (multi-scale inventories, mean-scored scales, true/false scales).
//
// Item rows carry their subscale key in assessment_items.subscale and the
// keyed value in response_options (reverse-scored items are pre-inverted), so
// a subscale score is always computed from the stored response_value.

export type SubscaleMethod = 'sum' | 'mean' | 'percent'

export interface SubscaleDef {
  key: string
  labelEn: string
  labelAr: string
}

export interface ScaleScoring {
  /** How the overall score is presented. The stored total_score is always the item sum. */
  total: 'sum' | 'mean'
  /** Per-item value range, used for mean display and bar widths. */
  itemMin: number
  itemMax: number
  subscaleMethod: SubscaleMethod
  subscales: SubscaleDef[]
  /** Group facets into domains by the text before the first '-' (IPIP-NEO). */
  domains?: SubscaleDef[]
  /** Short line under the breakdown explaining what the numbers mean. */
  noteEn: string
  noteAr: string
}

/**
 * Assessments validated in English only. Their Arabic text is a working
 * translation that has not been validated, and the site says so.
 */
export const ENGLISH_ONLY_VALIDATED = new Set(['IPIP120', 'ACSI28', 'ADES', 'BPQ', 'DSS'])

export function isEnglishOnlyValidated(code: string | null | undefined): boolean {
  return !!code && ENGLISH_ONLY_VALIDATED.has(code)
}

const IPIP_FACETS: SubscaleDef[] = [
  { key: 'N-Anxiety', labelEn: 'Anxiety', labelAr: 'القلق' },
  { key: 'N-Anger', labelEn: 'Anger', labelAr: 'الغضب' },
  { key: 'N-Depression', labelEn: 'Depression', labelAr: 'الاكتئاب' },
  { key: 'N-Self-Consciousness', labelEn: 'Self-consciousness', labelAr: 'الوعي الذاتي المفرط' },
  { key: 'N-Immoderation', labelEn: 'Immoderation', labelAr: 'عدم الاعتدال' },
  { key: 'N-Vulnerability', labelEn: 'Vulnerability', labelAr: 'الهشاشة أمام الضغط' },
  { key: 'E-Friendliness', labelEn: 'Friendliness', labelAr: 'الودّ' },
  { key: 'E-Gregariousness', labelEn: 'Gregariousness', labelAr: 'حب الاجتماع' },
  { key: 'E-Assertiveness', labelEn: 'Assertiveness', labelAr: 'الحزم' },
  { key: 'E-Activity', labelEn: 'Activity level', labelAr: 'مستوى النشاط' },
  { key: 'E-Excitement-Seeking', labelEn: 'Excitement seeking', labelAr: 'البحث عن الإثارة' },
  { key: 'E-Cheerfulness', labelEn: 'Cheerfulness', labelAr: 'البهجة' },
  { key: 'O-Imagination', labelEn: 'Imagination', labelAr: 'الخيال' },
  { key: 'O-Artistic', labelEn: 'Artistic interests', labelAr: 'الاهتمامات الفنية' },
  { key: 'O-Emotionality', labelEn: 'Emotionality', labelAr: 'الانفعالية' },
  { key: 'O-Adventurousness', labelEn: 'Adventurousness', labelAr: 'حب المغامرة' },
  { key: 'O-Intellect', labelEn: 'Intellect', labelAr: 'الفكر' },
  { key: 'O-Liberalism', labelEn: 'Liberalism', labelAr: 'التحرر في القيم' },
  { key: 'A-Trust', labelEn: 'Trust', labelAr: 'الثقة' },
  { key: 'A-Morality', labelEn: 'Morality', labelAr: 'الاستقامة' },
  { key: 'A-Altruism', labelEn: 'Altruism', labelAr: 'الإيثار' },
  { key: 'A-Cooperation', labelEn: 'Cooperation', labelAr: 'التعاون' },
  { key: 'A-Modesty', labelEn: 'Modesty', labelAr: 'التواضع' },
  { key: 'A-Sympathy', labelEn: 'Sympathy', labelAr: 'التعاطف' },
  { key: 'C-Self-Efficacy', labelEn: 'Self-efficacy', labelAr: 'الكفاءة الذاتية' },
  { key: 'C-Orderliness', labelEn: 'Orderliness', labelAr: 'النظام' },
  { key: 'C-Dutifulness', labelEn: 'Dutifulness', labelAr: 'الالتزام بالواجب' },
  { key: 'C-Achievement', labelEn: 'Achievement striving', labelAr: 'السعي للإنجاز' },
  { key: 'C-Self-Discipline', labelEn: 'Self-discipline', labelAr: 'الانضباط الذاتي' },
  { key: 'C-Cautiousness', labelEn: 'Cautiousness', labelAr: 'الحذر' },
]

export const SCALE_SCORING: Record<string, ScaleScoring> = {
  IPIP120: {
    total: 'sum', itemMin: 1, itemMax: 5, subscaleMethod: 'sum',
    subscales: IPIP_FACETS,
    domains: [
      { key: 'N', labelEn: 'Neuroticism', labelAr: 'العصابية' },
      { key: 'E', labelEn: 'Extraversion', labelAr: 'الانبساطية' },
      { key: 'O', labelEn: 'Openness to experience', labelAr: 'الانفتاح على التجربة' },
      { key: 'A', labelEn: 'Agreeableness', labelAr: 'القبول' },
      { key: 'C', labelEn: 'Conscientiousness', labelAr: 'يقظة الضمير' },
    ],
    noteEn: 'Each domain is 24–120 and each facet 4–20. Low, average and high are based on the possible score range, not on population norms.',
    noteAr: 'يتراوح كل مجال بين 24 و120 وكل سمة فرعية بين 4 و20. التصنيف إلى منخفض ومتوسط ومرتفع مبني على مدى الدرجات الممكن وليس على معايير سكانية.',
  },
  ACSI28: {
    total: 'sum', itemMin: 0, itemMax: 3, subscaleMethod: 'sum',
    subscales: [
      { key: 'coping_adversity', labelEn: 'Coping with adversity', labelAr: 'التعامل مع الشدائد' },
      { key: 'peaking_pressure', labelEn: 'Peaking under pressure', labelAr: 'التألق تحت الضغط' },
      { key: 'goal_setting', labelEn: 'Goal setting and mental preparation', labelAr: 'تحديد الأهداف والإعداد الذهني' },
      { key: 'concentration', labelEn: 'Concentration', labelAr: 'التركيز' },
      { key: 'freedom_worry', labelEn: 'Freedom from worry', labelAr: 'التحرر من القلق' },
      { key: 'confidence', labelEn: 'Confidence and achievement motivation', labelAr: 'الثقة ودافعية الإنجاز' },
      { key: 'coachability', labelEn: 'Coachability', labelAr: 'تقبّل التوجيه' },
    ],
    noteEn: 'Each skill is scored 0–12 and the total 0–84. Higher scores mean stronger coping skills.',
    noteAr: 'تُحسب كل مهارة من 0 إلى 12 والمجموع من 0 إلى 84. الدرجات الأعلى تعني مهارات تكيّف أقوى.',
  },
  ADES: {
    total: 'mean', itemMin: 0, itemMax: 10, subscaleMethod: 'mean',
    subscales: [
      { key: 'amnesia', labelEn: 'Dissociative amnesia', labelAr: 'فقدان الذاكرة الانفصالي' },
      { key: 'absorption', labelEn: 'Absorption and imaginative involvement', labelAr: 'الاستغراق والانغماس التخيلي' },
      { key: 'passive_influence', labelEn: 'Passive influence', labelAr: 'التأثير السلبي' },
      { key: 'depersonalisation', labelEn: 'Depersonalisation and derealisation', labelAr: 'تبدد الشخصية والواقع' },
    ],
    noteEn: 'Scores are averages from 0 (never) to 10 (always).',
    noteAr: 'الدرجات متوسطات من 0 (أبداً) إلى 10 (دائماً).',
  },
  BPQ: {
    total: 'sum', itemMin: 0, itemMax: 1, subscaleMethod: 'percent',
    subscales: [
      { key: 'impulsivity', labelEn: 'Impulsivity', labelAr: 'الاندفاعية' },
      { key: 'affective_instability', labelEn: 'Affective instability', labelAr: 'عدم الاستقرار الوجداني' },
      { key: 'abandonment', labelEn: 'Abandonment', labelAr: 'الخوف من الهجر' },
      { key: 'relationships', labelEn: 'Relationships', labelAr: 'العلاقات' },
      { key: 'self_image', labelEn: 'Self-image', labelAr: 'صورة الذات' },
      { key: 'suicide_self_harm', labelEn: 'Suicide / self-harm', labelAr: 'الانتحار / إيذاء النفس' },
      { key: 'emptiness', labelEn: 'Emptiness', labelAr: 'الشعور بالفراغ' },
      { key: 'intense_anger', labelEn: 'Intense anger', labelAr: 'الغضب الشديد' },
      { key: 'quasi_psychotic', labelEn: 'Quasi-psychotic states', labelAr: 'حالات شبه ذهانية' },
    ],
    noteEn: 'Each subscale shows the share of its questions answered in the direction linked to borderline traits.',
    noteAr: 'يوضح كل مقياس فرعي نسبة أسئلته التي أُجيب عنها في الاتجاه المرتبط بسمات الشخصية الحدّية.',
  },
  DSS: {
    total: 'mean', itemMin: 1, itemMax: 5, subscaleMethod: 'mean',
    subscales: [
      { key: 'availability', labelEn: 'Availability stress', labelAr: 'ضغط الإتاحة الدائمة' },
      { key: 'approval', labelEn: 'Approval anxiety', labelAr: 'القلق من الاستحسان' },
      { key: 'fomo', labelEn: 'Fear of missing out', labelAr: 'الخوف من تفويت الأحداث' },
      { key: 'overload', labelEn: 'Connection overload', labelAr: 'الإرهاق من كثرة التواصل' },
      { key: 'vigilance', labelEn: 'Online vigilance', labelAr: 'اليقظة الدائمة على الإنترنت' },
    ],
    noteEn: 'Scores are averages from 1 (never) to 5 (always). Higher means more digital stress.',
    noteAr: 'الدرجات متوسطات من 1 (أبداً) إلى 5 (دائماً). الدرجة الأعلى تعني ضغطاً رقمياً أكبر.',
  },
}

export function getScaleScoring(code: string | null | undefined): ScaleScoring | null {
  return (code && SCALE_SCORING[code]) || null
}

export interface SubscaleScore {
  key: string
  labelEn: string
  labelAr: string
  /** Score in the subscale's own unit (sum, mean, or percent 0-100). */
  value: number
  /** Lowest and highest possible value, for bar widths. */
  min: number
  max: number
  answered: number
  items: number
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

function scoreGroup(def: SubscaleDef, values: number[], itemCount: number, cfg: ScaleScoring): SubscaleScore {
  const sum = values.reduce((a, b) => a + b, 0)
  let value: number, min: number, max: number
  if (cfg.subscaleMethod === 'mean') {
    value = values.length ? round1(sum / values.length) : 0
    min = cfg.itemMin; max = cfg.itemMax
  } else if (cfg.subscaleMethod === 'percent') {
    value = itemCount ? Math.round((sum / (itemCount * cfg.itemMax)) * 100) : 0
    min = 0; max = 100
  } else {
    value = sum
    min = itemCount * cfg.itemMin; max = itemCount * cfg.itemMax
  }
  return { key: def.key, labelEn: def.labelEn, labelAr: def.labelAr, value, min, max, answered: values.length, items: itemCount }
}

/**
 * Score every subscale (and IPIP domain) from item rows and saved answers.
 * `answers` maps item id → stored response_value (already reverse-keyed).
 */
export function computeSubscaleScores(
  code: string,
  items: Array<{ id: string; subscale: string | null }>,
  answers: Record<string, number>,
): { subscales: SubscaleScore[]; domains: SubscaleScore[] } | null {
  const cfg = getScaleScoring(code)
  if (!cfg) return null
  const group = (match: (sub: string) => boolean) => {
    const its = items.filter(i => i.subscale && match(i.subscale))
    const vals = its.map(i => answers[i.id]).filter((v): v is number => typeof v === 'number')
    return { count: its.length, vals }
  }
  const subscales = cfg.subscales.map(s => {
    const g = group(sub => sub === s.key)
    return scoreGroup(s, g.vals, g.count, cfg)
  }).filter(s => s.items > 0)
  const domains = (cfg.domains ?? []).map(d => {
    const g = group(sub => sub.split('-')[0] === d.key)
    return scoreGroup(d, g.vals, g.count, cfg)
  }).filter(d => d.items > 0)
  return { subscales, domains }
}

/** The overall score as shown to people: the item mean for mean-scored scales. */
export function displayTotal(code: string | null | undefined, rawSum: number, itemCount: number): string {
  const cfg = getScaleScoring(code)
  if (cfg?.total === 'mean' && itemCount > 0) return (rawSum / itemCount).toFixed(1)
  return String(rawSum)
}

/** Format one subscale value in its unit. */
export function formatSubscaleValue(code: string, value: number): string {
  const cfg = getScaleScoring(code)
  if (cfg?.subscaleMethod === 'percent') return `${value}%`
  if (cfg?.subscaleMethod === 'mean') return value.toFixed(1)
  return String(value)
}
