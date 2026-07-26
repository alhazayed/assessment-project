/**
 * Region-aware crisis hotline resources.
 * Single source of truth shared by the crisis banner, high-risk assessment
 * results, and the /emergency page.
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
  { country_en: 'International', country_ar: 'دولي', number: '+1-800-273-8255', tel: '18002738255' },
]

export const CRISIS_HELPLINE_URL = 'https://findahelpline.com'
