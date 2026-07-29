'use client'

import CrisisBanner from '@/components/crisis-banner'
import type { Lang } from '@/lib/i18n'
import { AlertTriangle } from 'lucide-react'

interface Props {
  lang: Lang
  onContinue: () => void
  onPause: () => void
}

/**
 * Soft interrupt when a safety item (e.g. PHQ-9 Q9) is endorsed mid-flow.
 * Does not block completion — user can continue or pause safely.
 */
export default function SafetyInterrupt({ lang, onContinue, onPause }: Props) {
  const isAr = lang === 'ar'
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(18, 39, 60, 0.45)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="safety-interrupt-title"
    >
      <div className="card w-full max-w-lg p-6 space-y-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 id="safety-interrupt-title" className="text-[16px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {isAr ? 'نحن هنا لدعمك' : 'We are here to support you'}
            </h2>
            <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {isAr
                ? 'إجابتك تشير إلى أنك قد تمرّ بوقت صعب. يمكنك المتابعة بأمان، أو التوقف وطلب المساعدة الآن. لست وحدك.'
                : 'Your answer suggests you may be going through a difficult time. You can continue safely, or pause and reach out for help now. You are not alone.'}
            </p>
          </div>
        </div>

        <CrisisBanner lang={lang} />

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button type="button" onClick={onContinue} className="btn-primary flex-1">
            {isAr ? 'متابعة التقييم' : 'Continue assessment'}
          </button>
          <button type="button" onClick={onPause} className="btn-secondary flex-1">
            {isAr ? 'حفظ والخروج' : 'Save & exit'}
          </button>
        </div>
      </div>
    </div>
  )
}
