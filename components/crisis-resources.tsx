'use client'

import Link from 'next/link'
import { Phone, ExternalLink } from 'lucide-react'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import { CRISIS_LINES, CRISIS_HELPLINE_URL } from '@/lib/crisis-resources'

interface CrisisResourcesProps {
  lang: Lang
  /** Compact layout for inline use in assessment results */
  compact?: boolean
  showEmergencyLink?: boolean
}

/**
 * Reusable crisis-line block. Uses the existing crisis.* i18n keys and the
 * shared CRISIS_LINES data. Unlike CrisisBanner it renders unconditionally,
 * so use it wherever someone may be at risk right now (safety interrupt,
 * high-risk results, guest results) — it must never depend on saved data.
 */
export default function CrisisResources({ lang, compact = false, showEmergencyLink = true }: CrisisResourcesProps) {
  const isAr = lang === 'ar'

  return (
    <div className={compact ? 'mt-3' : 'mt-4'}>
      {!compact && (
        <>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            {t('crisis.title', lang)}
          </p>
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
            {t('crisis.body', lang)}
          </p>
        </>
      )}
      <div className="flex flex-wrap gap-2">
        {CRISIS_LINES.map(line => (
          <a
            key={line.number}
            href={`tel:${line.tel ?? line.number.replace(/\D/g, '')}`}
            className="inline-flex items-center gap-2 min-h-11 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--crisis-call-bg)' }}
          >
            <Phone className="w-4 h-4" aria-hidden="true" />
            <span>{isAr ? line.country_ar : line.country_en}</span>
            <span dir="ltr">· {line.number}</span>
          </a>
        ))}
        <a
          href={CRISIS_HELPLINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 min-h-11 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{ backgroundColor: '#1D6296', color: 'white' }}
        >
          <ExternalLink className="w-4 h-4" aria-hidden="true" />
          {t('crisis.more', lang)}
        </a>
        {showEmergencyLink && (
          <Link
            href="/emergency"
            className="inline-flex items-center gap-2 min-h-11 px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors"
            style={{ borderColor: 'var(--crisis-link-border)', color: 'var(--crisis-link-text)' }}
          >
            {isAr ? 'صفحة الطوارئ' : 'Emergency resources'}
          </Link>
        )}
      </div>
    </div>
  )
}
