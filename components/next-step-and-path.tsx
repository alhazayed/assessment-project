'use client'

import Link from 'next/link'
import { Map, ArrowRight } from 'lucide-react'
import { pathForAssessmentCode, SELF_KNOWLEDGE_PATHS } from '@/lib/self-knowledge'
import type { Lang } from '@/lib/i18n'

interface Related {
  id: string
  code: string
  name_en: string
  name_ar: string | null
}

interface Props {
  lang: Lang
  currentCode: string
  relatedAssessments: Related[]
}

/**
 * Single primary next-step CTA + optional theme path upsell.
 * Replaces the noisy equal-weight related-assessments grid as the main action.
 */
export default function NextStepAndPath({ lang, currentCode, relatedAssessments }: Props) {
  const isAr = lang === 'ar'
  const path = pathForAssessmentCode(currentCode) ?? SELF_KNOWLEDGE_PATHS[0]
  const primary = relatedAssessments[0]
  const nextInPath = relatedAssessments.find(r => path.codes.includes(r.code) && r.code !== currentCode) ?? primary

  return (
    <div className="space-y-4">
      {nextInPath && (
        <div className="card p-5" style={{ borderInlineStart: '4px solid var(--vw-blue)' }}>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--vw-blue)' }}>
            {isAr ? 'خطوتك التالية' : 'Your next step'}
          </p>
          <h3 className="text-[15px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            {isAr && nextInPath.name_ar ? nextInPath.name_ar : nextInPath.name_en}
          </h3>
          <p className="text-[13px] mb-4" style={{ color: 'var(--text-secondary)' }}>
            {isAr
              ? 'متابعة قصيرة لتعميق فهمك لنفسك في نفس الموضوع.'
              : 'A short follow-up to deepen self-understanding on the same theme.'}
          </p>
          <Link href={`/assessments/${nextInPath.id}`} className="btn-primary inline-flex items-center gap-2">
            {isAr ? 'ابدأ الآن' : 'Start now'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EAF2F9' }}>
            <Map className="w-4 h-4" style={{ color: 'var(--vw-blue)' }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {isAr ? path.labelAr : path.labelEn}
            </h3>
            <p className="text-[13px] mt-0.5 mb-3" style={{ color: 'var(--text-secondary)' }}>
              {isAr ? path.descAr : path.descEn}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/my-packages" className="btn-secondary text-[12.5px]">
                {isAr ? 'استكشف الملفات الشخصية' : 'Explore Profiles'}
              </Link>
              <Link href="/paths/personality" className="btn-secondary text-[12.5px]">
                {isAr ? 'أساس الشخصية' : 'Personality path'}
              </Link>
              <Link href="/insights#self-map" className="btn-ghost text-[12.5px]">
                {isAr ? 'خريطتي الذاتية' : 'My Self Map'}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {relatedAssessments.length > 1 && (
        <div className="card p-5">
          <h3 className="text-[13.5px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            {isAr ? 'خيارات إضافية' : 'More options'}
          </h3>
          <div className="flex flex-wrap gap-2">
            {relatedAssessments.slice(1, 4).map(ra => (
              <Link
                key={ra.id}
                href={`/assessments/${ra.id}`}
                className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium"
                style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)' }}
              >
                {isAr && ra.name_ar ? ra.name_ar : ra.name_en}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
