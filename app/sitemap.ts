import { MetadataRoute } from 'next'

const BASE = 'https://vwelfare.vercel.app'

const publicRoutes = [
  { path: '',        freq: 'weekly'  as const, priority: 1.0 },
  { path: '/login',  freq: 'monthly' as const, priority: 0.5 },
  { path: '/register', freq: 'monthly' as const, priority: 0.7 },
  { path: '/privacy', freq: 'monthly' as const, priority: 0.4 },
  { path: '/terms',   freq: 'monthly' as const, priority: 0.4 },
  { path: '/sample-result', freq: 'monthly' as const, priority: 0.6 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = []

  for (const route of publicRoutes) {
    const url = `${BASE}${route.path}`
    entries.push({
      url,
      lastModified: now,
      changeFrequency: route.freq,
      priority: route.priority,
      alternates: {
        languages: {
          en: url,
          ar: `${url}${route.path ? '&' : '?'}lang=ar`,
        },
      },
    })
  }

  return entries
}
