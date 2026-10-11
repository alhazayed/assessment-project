import type { Metadata } from 'next'
import { SITE_URL, absoluteUrl } from '@/lib/site-url'
import { getLanguage } from '@/lib/get-language'

interface PublicPageMeta {
  title: string
  description: string
  /** Path without domain, e.g. `/learn/phq-9` */
  path: string
  /** Language the page renders in. Arabic renders canonicalise to their own `?lang=ar` URL. */
  lang?: 'en' | 'ar'
}

/** Shared metadata for indexable public marketing / education pages. */
export function publicPageMetadata({ title, description, path, lang = 'en' }: PublicPageMeta): Metadata {
  const url = path === '/' ? SITE_URL : absoluteUrl(path)
  const arUrl = `${url}?lang=ar`
  const selfUrl = lang === 'ar' ? arUrl : url
  return {
    title,
    description,
    alternates: {
      canonical: selfUrl,
      languages: {
        en: url,
        ar: arUrl,
        'x-default': url,
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'V Welfare',
      locale: lang === 'ar' ? 'ar_SA' : 'en_US',
      title,
      description,
      url: selfUrl,
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

interface LocalizedCopy {
  title: string
  description: string
}

/** `publicPageMetadata` for a page with English and Arabic copy, picked from the request language. */
export async function localizedPublicMetadata({
  en,
  ar,
  path,
}: {
  en: LocalizedCopy
  ar: LocalizedCopy
  path: string
}): Promise<Metadata> {
  const lang = await getLanguage()
  const copy = lang === 'ar' ? ar : en
  return publicPageMetadata({ ...copy, path, lang })
}
