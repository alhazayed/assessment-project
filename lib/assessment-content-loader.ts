import type { AssessmentContent, BandContent } from './assessment-content'
import type { AssessmentContentAr } from './assessment-content-ar'

type ContentModule = typeof import('./assessment-content')

let contentModule: ContentModule | null = null
let arContent: Record<string, AssessmentContentAr> | null = null
let loadPromise: Promise<void> | null = null

/** Lazy-load heavy assessment interpretation content (deferred until results screen). */
export async function ensureAssessmentContentLoaded(): Promise<void> {
  if (contentModule && arContent) return
  if (!loadPromise) {
    loadPromise = Promise.all([
      import('./assessment-content'),
      import('./assessment-content-ar'),
    ]).then(([main, ar]) => {
      contentModule = main
      arContent = ar.ASSESSMENT_CONTENT_AR
    })
  }
  await loadPromise
}

export async function getAssessmentContentAsync(code: string): Promise<AssessmentContent | null> {
  await ensureAssessmentContentLoaded()
  return contentModule!.getAssessmentContent(code)
}

export async function getLocalizedBandContentAsync(
  code: string,
  band: string,
  lang: string
): Promise<BandContent | null> {
  await ensureAssessmentContentLoaded()
  return contentModule!.getLocalizedBandContent(code, band, lang, arContent!)
}

export async function getLocalizedAssessmentMetaAsync(
  code: string,
  lang: string
): Promise<{ overview: string; measuresDomain: string } | null> {
  await ensureAssessmentContentLoaded()
  return contentModule!.getLocalizedAssessmentMeta(code, lang, arContent!)
}

export async function getIpipModules() {
  await ensureAssessmentContentLoaded()
  return {
    IPIP_DOMAINS: contentModule!.IPIP_DOMAINS,
    getIpipDomainLevel: contentModule!.getIpipDomainLevel,
  }
}
