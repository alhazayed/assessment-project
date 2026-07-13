'use client'

import { useLang } from '@/lib/use-lang'

interface PageLoaderProps {
  /** Optional override for loading message */
  message?: string
  /** Compact variant for inline sections */
  variant?: 'page' | 'inline'
}

export default function PageLoader({ message, variant = 'page' }: PageLoaderProps) {
  const lang = useLang()
  const label = message ?? (lang === 'ar' ? 'جاري التحميل…' : 'Loading…')

  if (variant === 'inline') {
    return (
      <div className="flex items-center justify-center gap-3 py-12" role="status" aria-live="polite">
        <div
          className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0"
          style={{ borderColor: 'var(--vw-blue)', borderTopColor: 'transparent' }}
          aria-hidden="true"
        />
        <span className="text-[13.5px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-6xl" role="status" aria-live="polite">
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="skeleton h-8 w-2/3 max-w-xs" />
          <div className="skeleton h-4 w-1/2 max-w-sm" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-10 w-1/2" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          ))}
        </div>
        <div className="card p-6 space-y-4">
          <div className="skeleton h-5 w-1/4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
          <div className="skeleton h-4 w-4/6" />
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  )
}
