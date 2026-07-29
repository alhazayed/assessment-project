import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-url'

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
  '/x/control',
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
