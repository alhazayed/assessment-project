/**
 * Region-aware crisis hotline resources.
 * Shared by web crisis banner, high-risk assessment results, and emergency page.
 */

export interface CrisisLine {
  country_en: string
  country_ar: string
  number: string
  /** Digits-only tel: href (optional override for non-numeric labels) */
  tel?: string
}

export const CRISIS_LINES: CrisisLine[] = [
  { country_en: 'Saudi Arabia', country_ar: 'المملكة العربية السعودية', number: '920033360', tel: '920033360' },
  { country_en: 'UAE', country_ar: 'الإمارات', number: '800HOPE (4673)', tel: '8004673' },
  { country_en: 'International', country_ar: 'دولي', number: '+1-800-273-8255', tel: '18002738255' },
]

export const CRISIS_HELPLINE_URL = 'https://findahelpline.com'
