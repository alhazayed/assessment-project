import Link from 'next/link'
import { LifeBuoy } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

/**
 * Persistent link to /emergency. Rendered in every public header and footer,
 * the auth layout and the app sidebar so crisis help is always one tap away.
 *
 * - `pill`: compact header control (icon-only below sm, labelled above).
 *   Pass `iconOnly` in headers that have no room for the label.
 * - `inline`: plain text link for footers and nav lists. Pass `onDark` when
 *   it sits on the always-dark marketing footer.
 */
export default function CrisisHelpLink({
  lang,
  variant = 'pill',
  onDark = false,
  iconOnly = false,
  className = '',
}: {
  lang: Lang
  variant?: 'pill' | 'inline'
  onDark?: boolean
  iconOnly?: boolean
  className?: string
}) {
  const label = lang === 'ar' ? 'مساعدة في الأزمات' : 'Crisis help'

  if (variant === 'inline') {
    return (
      <Link
        href="/emergency"
        className={`inline-flex items-center gap-1.5 font-semibold hover:underline ${className}`}
        style={{ color: onDark ? '#FCA5A5' : 'var(--crisis-link-text)' }}
      >
        <LifeBuoy className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        {label}
      </Link>
    )
  }

  return (
    <Link
      href="/emergency"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center gap-1.5 min-h-11 min-w-11 px-2 sm:px-3 rounded-lg text-[13px] font-semibold transition-colors ${className}`}
      style={{ color: 'var(--crisis-link-text)' }}
    >
      <LifeBuoy className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      {!iconOnly && <span className="hidden sm:inline whitespace-nowrap">{label}</span>}
    </Link>
  )
}
