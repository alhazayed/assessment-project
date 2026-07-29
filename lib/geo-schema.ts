import { SITE_URL, PUBLIC_MEDICAL_CONTENT_REVIEWED } from '@/lib/site-url'
import type { FaqItem } from '@/lib/faq-content'

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'V Welfare',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description:
      'Bilingual mental health assessment and wellbeing platform offering validated psychometric screening in Arabic and English.',
    email: 'info@vwelfare.com',
    areaServed: ['SA', 'AE', 'Global'],
    availableLanguage: ['en', 'ar'],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'info@vwelfare.com',
      availableLanguage: ['English', 'Arabic'],
    },
  }
}

export function webSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'V Welfare',
    url: SITE_URL,
    inLanguage: ['en', 'ar'],
    description: 'Free validated mental health screening tools in Arabic and English.',
    publisher: { '@type': 'Organization', name: 'V Welfare', url: SITE_URL },
  }
}

export function webApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'V Welfare',
    url: SITE_URL,
    description:
      'Compassionate, science-backed mental health assessments and wellbeing tools in Arabic and English.',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web',
    inLanguage: ['ar', 'en'],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'SAR',
      description: 'Free mental health screening assessments',
    },
  }
}

export function faqPageSchema(items: FaqItem[], lang: 'en' | 'ar' = 'en') {
  const isAr = lang === 'ar'
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: isAr ? 'ar' : 'en',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: isAr ? item.questionAr : item.questionEn,
      acceptedAnswer: {
        '@type': 'Answer',
        text: isAr ? item.answerAr : item.answerEn,
      },
    })),
  }
}

export function medicalWebPageSchema(opts: {
  name: string
  description: string
  path: string
  citation?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name: opts.name,
    description: opts.description,
    url: `${SITE_URL}${opts.path}`,
    inLanguage: ['en', 'ar'],
    lastReviewed: PUBLIC_MEDICAL_CONTENT_REVIEWED,
    medicalAudience: {
      '@type': 'MedicalAudience',
      audienceType: 'Patient',
    },
    isPartOf: { '@type': 'WebSite', name: 'V Welfare', url: SITE_URL },
    ...(opts.citation
      ? {
          citation: {
            '@type': 'CreativeWork',
            name: opts.citation,
          },
        }
      : {}),
  }
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }
}

export function itemListSchema(items: { name: string; url: string; description: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: item.url,
      description: item.description,
    })),
  }
}
