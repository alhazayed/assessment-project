import { MetadataRoute } from 'next'

// Canonical production domain. Falls back to it (not the Vercel preview URL)
// so the sitemap/robots always advertise the real host even if the env var
// is unset on a given deployment.
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.vwelfare.com'

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
          // None of these routes carry an existing query string, so the lang
          // param is always introduced with '?'. The previous '&' for non-root
          // paths produced malformed URLs and an unescaped-'&' XML parse error.
          ar: `${url}?lang=ar`,
        },
      },
    })
  }

  return entries
}
