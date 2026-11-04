import type { Bi } from './types'
import { PROFILE_DEFS } from './definitions'
import { SCALE_INFO } from './scales'

/**
 * What a package's combined report contains, written for the package catalog
 * so a buyer knows what they get before paying. Built from the profile
 * definition itself, so the list always matches what the report really shows.
 */
export function packageReportContents(profileKey: string | null | undefined): Bi[] {
  const def = profileKey ? PROFILE_DEFS[profileKey] : undefined
  if (!def) return []

  const items: Bi[] = [
    { en: 'A one-line headline that sums up your profile', ar: 'خلاصة في سطر واحد تلخّص ملفك' },
  ]
  if (def.composite) {
    items.push({ en: `Your combined score: ${def.composite.label.en}`, ar: `درجتك المجمّعة: ${def.composite.label.ar}` })
  }
  if (def.quadrant) {
    items.push({ en: `Where you stand on: ${def.quadrant.label.en}`, ar: `موقعك في: ${def.quadrant.label.ar}` })
  }
  items.push({
    en: `Your score and level on each of the ${def.codes.length} scales, with their sub-scores`,
    ar: `درجتك ومستواك في كل مقياس من المقاييس الـ${def.codes.length} مع درجاتها الفرعية`,
  })
  items.push({
    en: 'Patterns found across your results, each with a practical next step and the research behind it',
    ar: 'الأنماط التي تظهر عبر نتائجك، مع خطوة عملية تالية لكل نمط والبحث العلمي الذي يستند إليه',
  })
  if (def.rules.some(r => r.kind === 'strength')) {
    items.push({ en: 'Your strengths, not only your risks', ar: 'نقاط قوتك، وليس المخاطر فقط' })
  }
  if (def.rules.some(r => r.kind === 'safety')) {
    items.push({
      en: 'Support and emergency contacts straight away if any answer suggests you may be at risk',
      ar: 'جهات الدعم والطوارئ فوراً إذا أشارت أي إجابة إلى أنك قد تكون معرّضاً للخطر',
    })
  }
  items.push({ en: 'A PDF copy you can keep or share with a professional', ar: 'نسخة PDF يمكنك الاحتفاظ بها أو مشاركتها مع مختص' })
  return items
}

/** Display names of the scales a package's report reads, in report order. */
export function packageScaleNames(profileKey: string | null | undefined): Bi[] {
  const def = profileKey ? PROFILE_DEFS[profileKey] : undefined
  if (!def) return []
  return def.codes.map(code => SCALE_INFO[code]?.name ?? { en: code, ar: code })
}
