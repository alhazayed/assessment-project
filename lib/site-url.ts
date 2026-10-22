/** Canonical production site URL — single source of truth for SEO / GEO metadata. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.vwelfare.com').replace(/\/$/, '')

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

/** Last content review date for public medical/educational pages (ISO date). */
export const PUBLIC_MEDICAL_CONTENT_REVIEWED = '2026-07-27'

/**
 * Clinician who reviewed the public medical/educational content. While null,
 * the "reviewed by" line and the schema.org `reviewedBy` field are omitted:
 * never fill this with a placeholder, it must name a real reviewer.
 */
export const PUBLIC_MEDICAL_CONTENT_REVIEWER: {
  nameEn: string
  nameAr: string
  /** Credentials, e.g. "Consultant Psychiatrist". */
  titleEn: string
  titleAr: string
  /** Optional public profile URL. */
  url?: string
} | null = null
