import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-url'

// The admin panel is deliberately not listed: naming it here would advertise
// its path. It is covered by noindex metadata in app/x/control/layout.tsx.
const PHI_DISALLOW = [
  '/dashboard',
  '/assessments',
  '/packages/',
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
  '/checkout',
  '/connect/',
  '/api/',
  '/billing',
]

const PUBLIC_ALLOW = [
  '/',
  '/learn',
  '/learn/',
  '/faq',
  '/login',
  '/register',
  '/privacy',
  '/terms',
  '/sample-result',
  '/clinicians',
  '/contact',
  '/packages',
]

/** Opt-out known model-training crawlers; search/answer bots use the default rule. */
const TRAINING_BOTS = [
  'GPTBot',
  'Google-Extended',
  'CCBot',
  'anthropic-ai',
  'ClaudeBot',
  'Applebot-Extended',
  'meta-externalagent',
  'Bytespider',
  'FacebookBot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: TRAINING_BOTS,
        disallow: ['/'],
      },
      {
        userAgent: '*',
        allow: PUBLIC_ALLOW,
        disallow: PHI_DISALLOW,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
