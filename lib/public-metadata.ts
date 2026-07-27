import type { Metadata } from 'next'
import { SITE_URL, absoluteUrl } from '@/lib/site-url'

interface PublicPageMeta {
  title: string
  description: string
  /** Path without domain, e.g. `/learn/phq-9` */
  path: string
}

/** Shared metadata for indexable public marketing / education pages. */
export function publicPageMetadata({ title, description, path }: PublicPageMeta): Metadata {
  const url = absoluteUrl(path)
  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: {
        en: url,
        ar: `${url}?lang=ar`,
        'x-default': url,
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'V Welfare',
      title,
      description,
      url,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'V Welfare Mental Health Platform' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
    robots: { index: true, follow: true },
  }
}

export function rootSiteMetadata(): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: 'V Welfare — Mental Health Assessment Platform',
      template: '%s | V Welfare',
    },
    description:
      'Compassionate, science-backed mental health assessments and wellbeing tools. Take validated psychometric assessments in Arabic and English.',
    openGraph: {
      type: 'website',
      siteName: 'V Welfare',
      locale: 'en_US',
      alternateLocale: ['ar_SA'],
      title: 'V Welfare — Mental Health Assessment Platform',
      description:
        'Science-backed mental health assessments and wellbeing tools in Arabic and English.',
      url: SITE_URL,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'V Welfare Mental Health Platform' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'V Welfare — Mental Health Assessment Platform',
      description: 'Science-backed mental health assessments and wellbeing tools.',
      images: ['/og-image.png'],
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  }
}
