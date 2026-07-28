import Link from 'next/link'
import { AlertCircle, ChevronRight } from 'lucide-react'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'

interface Props {
  lang: Lang
  completed: number
  total: number
  nextHref?: string
  showOnboardingLink?: boolean
}

export default function ProfileCompletionBanner({
  lang,
  completed,
  total,
  nextHref = '/profile?complete=true',
  showOnboardingLink = false,
}: Props) {
  const percent = Math.round((completed / total) * 100)

  return (
    <div
      className="mb-6 rounded-xl p-4 flex items-start gap-3"
      style={{ background: '#FEF2EC', border: '1px solid #F3C5A0' }}
    >
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#F3650A' }} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: '#9B3D08' }}>
          {t('profile.banner.title', lang)}
        </p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: '#C2560A' }}>
          {t('profile.banner.body', lang)}
        </p>
        <div className="mt-3 mb-2">
          <div className="flex items-center justify-between text-[11px] font-medium mb-1" style={{ color: '#9B3D08' }}>
            <span>{t('profile.banner.progress', lang)}</span>
            <span>{completed}/{total} ({percent}%)</span>
          </div>
          <div className="progress-track h-2">
            <div
              className="progress-fill h-2 transition-all"
              style={{ width: `${percent}%`, backgroundColor: '#F3650A' }}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <Link
            href={nextHref}
            className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
            style={{ color: '#9B3D08' }}
          >
            {t('profile.banner.cta', lang)}
            <ChevronRight className="w-3 h-3" />
          </Link>
          {showOnboardingLink && (
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
              style={{ color: '#C2560A' }}
            >
              {t('profile.banner.onboarding', lang)}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
