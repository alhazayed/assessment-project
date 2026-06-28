import { MetadataRoute } from 'next'

// Keep in sync with app/sitemap.ts — advertise the canonical production host,
// never the Vercel preview URL.
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.vwelfare.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // Public marketing/auth-entry pages are crawlable; everything behind
      // auth (PHI) and all internal/admin/API surfaces are disallowed.
      allow: ['/', '/login', '/register', '/privacy', '/terms', '/sample-result', '/clinicians'],
      disallow: [
        '/dashboard',
        '/assessments',
        '/packages',
        '/adhd-zones',
        '/mood',
        '/insights',
        '/journal',
        '/messages',
        '/notifications',
        '/profile',
        '/patients',
        '/patient/',
        '/clinician/',
        '/onboarding',
        '/forgot-password',
        '/reset-password',
        '/api/',
        '/x/control',
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
  }
}
