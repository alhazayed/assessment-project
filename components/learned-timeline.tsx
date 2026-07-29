'use client'

import Link from 'next/link'
import { BookOpen, Sparkles } from 'lucide-react'
import type { Lang } from '@/lib/i18n'
import { localizeSeverity } from '@/lib/severity-labels'

export interface TimelineEntry {
  id: string
  definitionId: string
  code: string
  nameEn: string
  nameAr: string | null
  score: number
  band: string
  submittedAt: string
  highRisk: boolean
}

interface Props {
  lang: Lang
  entries: TimelineEntry[]
}

/** “What I learned about myself” chronological insight list. */
export default function LearnedTimeline({ lang, entries }: Props) {
  const isAr = lang === 'ar'
  if (!entries.length) {
    return (
      <div className="card p-6 text-center">
        <Sparkles className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--vw-blue)' }} />
        <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          {isAr ? 'قصتك عن نفسك تبدأ هنا' : 'Your self-story starts here'}
        </p>
        <p className="text-[13px] mb-4" style={{ color: 'var(--text-secondary)' }}>
          {isAr ? 'أكمل تقييماً واحداً لتظهر أول رؤية.' : 'Complete one assessment to unlock your first insight.'}
        </p>
        <Link href="/first-insight" className="btn-primary">
          {isAr ? 'ابدأ أول رؤية' : 'Start first insight'}
        </Link>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4" style={{ color: 'var(--vw-blue)' }} />
        <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
          {isAr ? 'ما تعلّمته عن نفسي' : 'What I learned about myself'}
        </h2>
      </div>
      <ol className="space-y-3">
        {entries.slice(0, 8).map((e, i) => {
          const name = isAr && e.nameAr ? e.nameAr : e.nameEn
          const date = new Date(e.submittedAt).toLocaleDateString(isAr ? 'ar' : 'en', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
          return (
            <li key={e.id}>
              <Link
                href={`/assessments/${e.definitionId}/results/${e.id}`}
                className="flex gap-3 p-3 rounded-xl transition-opacity hover:opacity-90"
                style={{ backgroundColor: i === 0 ? '#EAF2F9' : 'var(--surface-alt)' }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold text-white" style={{ backgroundColor: 'var(--vw-blue)' }}>
                  {entries.length - i}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
                  <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {date} · {isAr ? 'الدرجة' : 'Score'} {e.score} · {localizeSeverity(e.band, lang)}
                    {e.highRisk ? (isAr ? ' · يحتاج انتباهاً' : ' · needs attention') : ''}
                  </p>
                </div>
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
