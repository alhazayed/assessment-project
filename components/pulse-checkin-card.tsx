'use client'

import Link from 'next/link'
import { Activity, ArrowRight } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

export interface PulseItem {
  id: string
  code: string
  name_en: string
  name_ar: string | null
  total_questions: number
  reasonEn: string
  reasonAr: string
}

interface Props {
  lang: Lang
  items: PulseItem[]
}

/** Visible dashboard check-in / rescreening card. */
export default function PulseCheckinCard({ lang, items }: Props) {
  if (!items.length) return null
  const isAr = lang === 'ar'

  return (
    <div className="card p-5 mb-6" style={{ borderInlineStart: '4px solid var(--vw-blue)' }}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EAF2F9' }}>
          <Activity className="w-4 h-4" style={{ color: 'var(--vw-blue)' }} />
        </div>
        <div className="min-w-0">
          <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
            {isAr ? 'نبضة قصيرة لفهم نفسك' : 'A short pulse to know yourself'}
          </h2>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {isAr
              ? 'فحص سريع (دقائق معدودة) لتتبّع كيف تشعر الآن.'
              : 'A quick check-in (a few minutes) to track how you feel right now.'}
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {items.slice(0, 3).map(item => (
          <Link
            key={item.id}
            href={`/assessments/${item.id}`}
            className="flex items-center justify-between gap-3 p-3 rounded-xl transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--surface-alt)' }}
          >
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {isAr && item.name_ar ? item.name_ar : item.name_en}
              </p>
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {isAr ? item.reasonAr : item.reasonEn}
                {' · '}
                {item.total_questions}{isAr ? ' سؤال' : ' Q'}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--vw-blue)' }} />
          </Link>
        ))}
      </div>
    </div>
  )
}
