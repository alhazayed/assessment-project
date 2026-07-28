'use client'

import Link from 'next/link'
import { Compass, ArrowRight } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

interface Props {
  lang: Lang
  className?: string
  compact?: boolean
}

/** Promotes Insights radar as the user’s “Self Map”. */
export default function SelfMapLink({ lang, className = '', compact = false }: Props) {
  const isAr = lang === 'ar'
  if (compact) {
    return (
      <Link
        href="/insights#self-map"
        className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${className}`}
        style={{ color: 'var(--vw-blue)' }}
      >
        <Compass className="w-3.5 h-3.5" />
        {isAr ? 'خريطتي الذاتية' : 'My Self Map'}
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    )
  }

  return (
    <Link
      href="/insights#self-map"
      className={`card-hover p-4 flex items-center gap-3 ${className}`}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EAF2F9' }}>
        <Compass className="w-5 h-5" style={{ color: 'var(--vw-blue)' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>
          {isAr ? 'خريطتي الذاتية' : 'My Self Map'}
        </p>
        <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
          {isAr
            ? 'شاهد كيف تتصل مجالات مزاجك وتوترك ورفاهيتك معاً.'
            : 'See how your mood, stress, and wellbeing domains connect.'}
        </p>
      </div>
      <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--vw-blue)' }} />
    </Link>
  )
}
