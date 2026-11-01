'use client'

import type { Lang } from '@/lib/i18n'
import { Languages, Shield } from 'lucide-react'
import { isEnglishOnlyValidated } from '@/lib/scale-scoring'

interface Props {
  lang: Lang
  className?: string
  /** Assessment code; English-only-validated scales also show a translation notice. */
  code?: string | null
}

/** Screening / not-a-diagnosis disclaimer for take + result surfaces. */
export default function ScreeningDisclaimer({ lang, className = '', code }: Props) {
  const isAr = lang === 'ar'
  const disclaimer = (cls: string) => (
    <div
      className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[12.5px] leading-relaxed ${cls}`}
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
  if (!isEnglishOnlyValidated(code)) return disclaimer(className)
  return (
    <div className={`space-y-2 ${className}`}>
      {disclaimer('')}
      <TranslationNotice lang={lang} />
    </div>
  )
}

/** Notice for scales validated in English only, with an unvalidated Arabic translation. */
export function TranslationNotice({ lang, className = '' }: { lang: Lang; className?: string }) {
  const isAr = lang === 'ar'
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[12.5px] leading-relaxed ${className}`}
      style={{ backgroundColor: '#FFF8E6', border: '1px solid #F2D58A', color: '#5C4300' }}
      role="note"
    >
      <Languages className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
      <p>
        {isAr
          ? 'هذا المقياس مُعتمد علمياً باللغة الإنجليزية فقط. الترجمة العربية متاحة للتيسير لكنها غير مُعتمدة، لذا قد لا تكون النتائج دقيقة تماماً عند الإجابة بالعربية. للحصول على أدق نتيجة، أجب بالإنجليزية.'
          : 'This assessment is validated in English only. An Arabic translation is available for convenience but has not been validated, so results from the Arabic version may be less accurate.'}
      </p>
    </div>
  )
}
