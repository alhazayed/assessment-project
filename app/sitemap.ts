import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-url'
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

function withAlternates(path: string) {
  const url = `${SITE_URL}${path}`
  return {
    url,
    alternates: {
      languages: {
        en: url,
        ar: `${url}?lang=ar`,
      },
    },
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = []

  for (const route of staticRoutes) {
    entries.push({
      ...withAlternates(route.path),
      lastModified: now,
      changeFrequency: route.freq,
      priority: route.priority,
    })
  }

  const learnSlugs = [...new Set(LEARN_PAGES.map(p => p.slug))]
  for (const slug of learnSlugs) {
    entries.push({
      ...withAlternates(`/learn/${slug}`),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    })
  }

  return entries
}
