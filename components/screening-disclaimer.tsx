'use client'

import type { Lang } from '@/lib/i18n'
import { Shield } from 'lucide-react'

interface Props {
  lang: Lang
  className?: string
}

/** Screening / not-a-diagnosis disclaimer for take + result surfaces. */
export default function ScreeningDisclaimer({ lang, className = '' }: Props) {
  const isAr = lang === 'ar'
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[12.5px] leading-relaxed ${className}`}
      style={{ backgroundColor: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
      role="note"
    >
      <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--vw-blue)' }} aria-hidden />
      <p>
        {isAr
          ? 'هذه أداة فحص للتوعية الذاتية وليست تشخيصاً طبياً. النتائج لا تغني عن استشارة مختص بالصحة النفسية.'
          : 'This is a screening tool for self-understanding, not a medical diagnosis. Results do not replace care from a qualified mental health professional.'}
      </p>
    </div>
  )
}
