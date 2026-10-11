import { MetadataRoute } from 'next'
import { SITE_URL, PUBLIC_MEDICAL_CONTENT_REVIEWED } from '@/lib/site-url'
import { LEARN_PAGES } from '@/lib/public-learn'

const staticRoutes: { path: string; freq: 'weekly' | 'monthly'; priority: number }[] = [
  { path: '', freq: 'weekly', priority: 1.0 },
  { path: '/learn', freq: 'weekly', priority: 0.9 },
  { path: '/faq', freq: 'monthly', priority: 0.85 },
  { path: '/clinicians', freq: 'monthly', priority: 0.8 },
  { path: '/contact', freq: 'monthly', priority: 0.7 },
  { path: '/sample-result', freq: 'monthly', priority: 0.75 },
  { path: '/packages', freq: 'monthly', priority: 0.6 },
  { path: '/privacy', freq: 'monthly', priority: 0.4 },
  { path: '/terms', freq: 'monthly', priority: 0.4 },
]

/** One entry per language, each listing both alternates, so Arabic pages are crawlable in their own right. */
function localizedEntries(
  path: string,
  rest: Omit<MetadataRoute.Sitemap[number], 'url' | 'alternates'>,
): MetadataRoute.Sitemap {
  const url = `${SITE_URL}${path}`
  const arUrl = `${url}?lang=ar`
  const alternates = { languages: { en: url, ar: arUrl } }
  return [
    { url, alternates, ...rest },
    { url: arUrl, alternates, ...rest },
  ]
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const reviewed = new Date(PUBLIC_MEDICAL_CONTENT_REVIEWED)
  const entries: MetadataRoute.Sitemap = []

  for (const route of staticRoutes) {
    entries.push(
      ...localizedEntries(route.path, {
        lastModified: route.path === '/learn' || route.path === '/faq' ? reviewed : now,
        changeFrequency: route.freq,
        priority: route.priority,
      }),
    )
  }

  const learnSlugs = [...new Set(LEARN_PAGES.map(p => p.slug))]
  for (const slug of learnSlugs) {
    entries.push(
      ...localizedEntries(`/learn/${slug}`, {
        lastModified: reviewed,
        changeFrequency: 'monthly',
        priority: 0.7,
      }),
    )
  }

  return entries
}
