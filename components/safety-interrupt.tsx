'use client'

import { useEffect, useRef } from 'react'
import CrisisResources from '@/components/crisis-resources'
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
  const dialogRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  // Keep the latest handler without re-running the focus effect on every render.
  const onContinueRef = useRef(onContinue)
  useEffect(() => { onContinueRef.current = onContinue }, [onContinue])

  // Move focus into the dialog, keep Tab inside it, close on Escape, and
  // hand focus back to whatever was focused (the answer option) on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    headingRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onContinueRef.current()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      const inside = dialogRef.current.contains(active)
      if (e.shiftKey && (active === first || !inside || active === headingRef.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !inside)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previous && document.contains(previous)) previous.focus()
    }
  }, [])

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(18, 39, 60, 0.45)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="safety-interrupt-title"
      aria-describedby="safety-interrupt-desc"
    >
      <div className="card w-full max-w-lg p-6 space-y-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" aria-hidden="true" />
          </div>
          <div>
            <h2 id="safety-interrupt-title" ref={headingRef} tabIndex={-1} className="text-[16px] font-bold mb-1 outline-none" style={{ color: 'var(--text-primary)' }}>
              {isAr ? 'نحن هنا لدعمك' : 'We are here to support you'}
            </h2>
            <p id="safety-interrupt-desc" className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {isAr
                ? 'إجابتك تشير إلى أنك قد تمرّ بوقت صعب. يمكنك المتابعة بأمان، أو التوقف وطلب المساعدة الآن. لست وحدك.'
                : 'Your answer suggests you may be going through a difficult time. You can continue safely, or pause and reach out for help now. You are not alone.'}
            </p>
          </div>
        </div>

        {/* Unconditional: at this moment nothing high-risk has been saved yet,
            so CrisisBanner (which looks up saved submissions) would render nothing. */}
        <CrisisResources lang={lang} compact />

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
