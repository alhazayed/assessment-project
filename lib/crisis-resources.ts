/**
 * Region-aware crisis hotline resources.
 * Single source of truth shared by the crisis banner, high-risk assessment
 * results, and the /emergency page.
 *
 * Numbers should be verified with clinical/compliance before production changes.
 * US National Suicide Prevention Lifeline is now 988 (not the retired 1-800-273-8255).
 */

export interface CrisisLine {
  country_en: string
  country_ar: string
  number: string
  /** Digits-only tel: target (override for labels containing letters) */
  tel?: string
}

export const CRISIS_LINES: CrisisLine[] = [
  { country_en: 'Saudi Arabia', country_ar: 'المملكة العربية السعودية', number: '920033360', tel: '920033360' },
  { country_en: 'UAE', country_ar: 'الإمارات', number: '800HOPE (4673)', tel: '8004673' },
  // US/Canada — 988 Suicide & Crisis Lifeline (replaces retired 1-800-273-8255)
  { country_en: 'US / Canada', country_ar: 'الولايات المتحدة / كندا', number: '988', tel: '988' },
]

/** Local helpline directory for all other countries */
export const CRISIS_HELPLINE_URL = 'https://findahelpline.com'
