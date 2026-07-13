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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#F3650A' }}
          >
            <Phone className="w-3 h-3" aria-hidden="true" />
            {isAr ? line.country_ar : line.country_en} · {line.number}
          </a>
        ))}
        <a
          href={CRISIS_HELPLINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ backgroundColor: '#1D6296', color: 'white' }}
        >
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
          {t('crisis.more', lang)}
        </a>
        {showEmergencyLink && (
          <Link
            href="/emergency"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-colors"
            style={{ borderColor: '#EF4444', color: '#991B1B' }}
          >
            {isAr ? 'صفحة الطوارئ' : 'Emergency resources'}
          </Link>
        )}
      </div>
    </div>
  )
}
