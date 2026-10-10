/**
 * Numeric scoring summaries for the public /learn guides.
 *
 * `source: 'app'` ranges mirror `assessment_definitions.scoring_logic` in
 * production, so a guide shows the same bands a user gets on their result.
 * Keep them in sync when scoring_logic changes. `source: 'published'` is used
 * for instruments the platform does not score itself (AUDIT-C, ESS) and
 * follows the instrument's published cutoffs.
 */

export interface LearnScoreRange {
  min: number
  max: number
  labelEn: string
  labelAr: string
}

export interface LearnScoring {
  shortName: string
  items: number
  min: number
  max: number
  /** true when a higher total is the better outcome (WHO-5, RSES). */
  higherIsBetter?: boolean
  source: 'app' | 'published'
  ranges: LearnScoreRange[]
}

export const LEARN_SCORING: Record<string, LearnScoring> = {
  PHQ9: {
    shortName: 'PHQ-9', items: 9, min: 0, max: 27, source: 'app',
    ranges: [
      { min: 0, max: 4, labelEn: 'Minimal', labelAr: 'ضئيل' },
      { min: 5, max: 9, labelEn: 'Mild', labelAr: 'خفيف' },
      { min: 10, max: 14, labelEn: 'Moderate', labelAr: 'متوسط' },
      { min: 15, max: 19, labelEn: 'Moderately severe', labelAr: 'متوسط إلى شديد' },
      { min: 20, max: 27, labelEn: 'Severe', labelAr: 'شديد' },
    ],
  },
  GAD7: {
    shortName: 'GAD-7', items: 7, min: 0, max: 21, source: 'app',
    ranges: [
      { min: 0, max: 4, labelEn: 'Minimal', labelAr: 'ضئيل' },
      { min: 5, max: 9, labelEn: 'Mild', labelAr: 'خفيف' },
      { min: 10, max: 14, labelEn: 'Moderate', labelAr: 'متوسط' },
      { min: 15, max: 21, labelEn: 'Severe', labelAr: 'شديد' },
    ],
  },
  WHO5: {
    shortName: 'WHO-5', items: 5, min: 0, max: 25, higherIsBetter: true, source: 'app',
    ranges: [
      { min: 0, max: 7, labelEn: 'Likely depression', labelAr: 'احتمال اكتئاب' },
      { min: 8, max: 12, labelEn: 'Low', labelAr: 'منخفض' },
      { min: 13, max: 17, labelEn: 'Moderate', labelAr: 'متوسط' },
      { min: 18, max: 25, labelEn: 'Good', labelAr: 'جيد' },
    ],
  },
  DASS21: {
    shortName: 'DASS-21', items: 21, min: 0, max: 63, source: 'app',
    ranges: [
      { min: 0, max: 13, labelEn: 'Normal range', labelAr: 'النطاق الطبيعي' },
      { min: 14, max: 25, labelEn: 'Mild–moderate distress', labelAr: 'ضيق خفيف إلى متوسط' },
      { min: 26, max: 40, labelEn: 'Moderate–severe distress', labelAr: 'ضيق متوسط إلى شديد' },
      { min: 41, max: 63, labelEn: 'Severe distress', labelAr: 'ضيق شديد' },
    ],
  },
  PCL5: {
    shortName: 'PCL-5', items: 20, min: 0, max: 80, source: 'app',
    ranges: [
      { min: 0, max: 31, labelEn: 'Below threshold', labelAr: 'دون العتبة' },
      { min: 32, max: 80, labelEn: 'Probable PTSD', labelAr: 'اضطراب ما بعد الصدمة المحتمل' },
    ],
  },
  ASRS: {
    shortName: 'ASRS', items: 6, min: 0, max: 24, source: 'app',
    ranges: [
      { min: 0, max: 13, labelEn: 'Below screening threshold', labelAr: 'دون عتبة الفحص' },
      { min: 14, max: 17, labelEn: 'Symptoms possible', labelAr: 'أعراض محتملة' },
      { min: 18, max: 24, labelEn: 'Highly consistent with ADHD', labelAr: 'متوافق بشدة مع اضطراب فرط الحركة' },
    ],
  },
  ISI: {
    shortName: 'ISI', items: 7, min: 0, max: 28, source: 'app',
    ranges: [
      { min: 0, max: 7, labelEn: 'No clinically significant insomnia', labelAr: 'لا يوجد أرق ذو دلالة سريرية' },
      { min: 8, max: 14, labelEn: 'Subthreshold insomnia', labelAr: 'أرق دون العتبة' },
      { min: 15, max: 21, labelEn: 'Moderate insomnia', labelAr: 'أرق متوسط' },
      { min: 22, max: 28, labelEn: 'Severe insomnia', labelAr: 'أرق شديد' },
    ],
  },
  AUDITC: {
    shortName: 'AUDIT-C', items: 3, min: 0, max: 12, source: 'published',
    ranges: [
      { min: 0, max: 2, labelEn: 'Negative screen', labelAr: 'فحص سلبي' },
      { min: 3, max: 3, labelEn: 'Positive screen for women', labelAr: 'فحص إيجابي للنساء' },
      { min: 4, max: 12, labelEn: 'Positive screen', labelAr: 'فحص إيجابي' },
    ],
  },
  ACE: {
    shortName: 'ACE', items: 10, min: 0, max: 10, source: 'app',
    ranges: [
      { min: 0, max: 1, labelEn: 'Low ACE score', labelAr: 'درجة ACE منخفضة' },
      { min: 2, max: 3, labelEn: 'Moderate ACE score', labelAr: 'درجة ACE متوسطة' },
      { min: 4, max: 10, labelEn: 'High ACE score', labelAr: 'درجة ACE مرتفعة' },
    ],
  },
  K10: {
    shortName: 'K-10', items: 10, min: 10, max: 50, source: 'app',
    ranges: [
      { min: 10, max: 15, labelEn: 'Low distress', labelAr: 'ضائقة منخفضة' },
      { min: 16, max: 21, labelEn: 'Moderate distress', labelAr: 'ضائقة متوسطة' },
      { min: 22, max: 29, labelEn: 'High distress', labelAr: 'ضائقة عالية' },
      { min: 30, max: 50, labelEn: 'Very high distress', labelAr: 'ضائقة عالية جداً' },
    ],
  },
  PSS10: {
    shortName: 'PSS-10', items: 10, min: 0, max: 40, source: 'app',
    ranges: [
      { min: 0, max: 13, labelEn: 'Low stress', labelAr: 'ضغط منخفض' },
      { min: 14, max: 26, labelEn: 'Moderate stress', labelAr: 'ضغط متوسط' },
      { min: 27, max: 40, labelEn: 'High stress', labelAr: 'ضغط مرتفع' },
    ],
  },
  OCIR: {
    shortName: 'OCI-R', items: 18, min: 0, max: 72, source: 'app',
    ranges: [
      { min: 0, max: 20, labelEn: 'Below clinical threshold', labelAr: 'دون العتبة السريرية' },
      { min: 21, max: 40, labelEn: 'Mild OCD symptoms', labelAr: 'أعراض وسواس خفيفة' },
      { min: 41, max: 60, labelEn: 'Moderate OCD symptoms', labelAr: 'أعراض وسواس متوسطة' },
      { min: 61, max: 72, labelEn: 'Severe OCD symptoms', labelAr: 'أعراض وسواس شديدة' },
    ],
  },
  ESS: {
    shortName: 'ESS', items: 8, min: 0, max: 24, source: 'published',
    ranges: [
      { min: 0, max: 10, labelEn: 'Normal daytime sleepiness', labelAr: 'نعاس نهاري طبيعي' },
      { min: 11, max: 12, labelEn: 'Mild excessive sleepiness', labelAr: 'نعاس مفرط خفيف' },
      { min: 13, max: 15, labelEn: 'Moderate excessive sleepiness', labelAr: 'نعاس مفرط متوسط' },
      { min: 16, max: 24, labelEn: 'Severe excessive sleepiness', labelAr: 'نعاس مفرط شديد' },
    ],
  },
  PHQ15: {
    shortName: 'PHQ-15', items: 15, min: 0, max: 30, source: 'app',
    ranges: [
      { min: 0, max: 4, labelEn: 'Minimal', labelAr: 'ضئيل' },
      { min: 5, max: 9, labelEn: 'Low', labelAr: 'منخفض' },
      { min: 10, max: 14, labelEn: 'Medium', labelAr: 'متوسط' },
      { min: 15, max: 30, labelEn: 'High', labelAr: 'مرتفع' },
    ],
  },
  CAGE: {
    shortName: 'CAGE', items: 4, min: 0, max: 4, source: 'app',
    ranges: [
      { min: 0, max: 1, labelEn: 'Low risk', labelAr: 'خطر منخفض' },
      { min: 2, max: 4, labelEn: 'Likely alcohol use disorder', labelAr: 'احتمال اضطراب تعاطي الكحول' },
    ],
  },
  RSES: {
    shortName: 'RSES', items: 10, min: 0, max: 30, higherIsBetter: true, source: 'app',
    ranges: [
      { min: 0, max: 14, labelEn: 'Low self-esteem', labelAr: 'تقدير ذات منخفض' },
      { min: 15, max: 25, labelEn: 'Normal self-esteem', labelAr: 'تقدير ذات طبيعي' },
      { min: 26, max: 30, labelEn: 'High self-esteem', labelAr: 'تقدير ذات مرتفع' },
    ],
  },
  MDQ: {
    shortName: 'MDQ', items: 13, min: 0, max: 13, source: 'app',
    ranges: [
      { min: 0, max: 6, labelEn: 'Screen negative', labelAr: 'نتيجة سلبية' },
      { min: 7, max: 13, labelEn: 'Screen positive', labelAr: 'نتيجة إيجابية' },
    ],
  },
}

export function getLearnScoring(code: string): LearnScoring | undefined {
  return LEARN_SCORING[code]
}

export function formatRange(r: { min: number; max: number }): string {
  return r.min === r.max ? `${r.min}` : `${r.min}–${r.max}`
}

/** One-sentence, quotable answer to "how is the X scored?". */
export function scoringSummary(s: LearnScoring, lang: 'en' | 'ar'): string {
  if (lang === 'ar') {
    const direction = s.higherIsBetter ? 'نتيجة أفضل' : 'أعراض أشد'
    return `عدد البنود في ${s.shortName}: ${s.items}. تتراوح الدرجة الكلية من ${s.min} إلى ${s.max}، والدرجة الأعلى تشير إلى ${direction}.`
  }
  const direction = s.higherIsBetter ? 'a more favourable result' : 'more severe symptoms'
  return `The ${s.shortName} has ${s.items} items. Total scores range from ${s.min} to ${s.max}; higher scores indicate ${direction}.`
}
