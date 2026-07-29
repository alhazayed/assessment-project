'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle2, AlertTriangle, BookOpen, FlaskConical, Brain, Loader2, Sparkles,
} from 'lucide-react'
import type { AssessmentDefinition } from '@/lib/types'
import { getAssessmentContent, getLocalizedBandContent, getLocalizedAssessmentMeta, IPIP_DOMAINS, getIpipDomainLevel } from '@/lib/assessment-content'
import { ASSESSMENT_CONTENT_AR } from '@/lib/assessment-content-ar'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import AttemptCompareCard from '@/components/attempt-compare-card'
import CrisisBanner from '@/components/crisis-banner'
import ScreeningDisclaimer from '@/components/screening-disclaimer'
import SelfMapLink from '@/components/self-map-link'
import NextStepAndPath from '@/components/next-step-and-path'
import { deriveStrengths } from '@/lib/self-knowledge'

const AssessmentPdfDownloadButton = dynamic(
  () => import('@/app/(app)/assessments/[id]/pdf-download-button').then(m => m.AssessmentPdfDownloadButton),
  { ssr: false, loading: () => <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px]" style={{ color: 'var(--text-muted)' }}><Loader2 className="w-4 h-4 animate-spin" /></span> }
)

function severityColor(band: string) {
  const b = band.toLowerCase()
  if (b.includes('minimal') || b.includes('none') || b.includes('normal') || b.includes('low') || b.includes('negative') || b.includes('below') || b.includes('no ')) return 'badge-minimal border'
  if (b.includes('mild') || b.includes('subthreshold') || b.includes('moderate risk')) return 'badge-mild border'
  if (b.includes('moderate') || b.includes('possible')) return 'badge-moderate border'
  return 'badge-severe border'
}

interface RelatedAssessment {
  id: string
  code: string
  name_en: string
  name_ar: string
  description_en: string | null
  description_ar: string | null
  total_questions: number
}

export interface AssessmentResultProps {
  lang: Lang
  definition: AssessmentDefinition
  score: number
  bandEn: string
  bandAr: string
  highRisk: boolean
  submittedAt: string
  patientNames: { en: string; ar: string | null }
  submissionId?: string
  showNavLinks?: boolean
}

export default function AssessmentResultView({
  lang,
  definition,
  score,
  bandEn,
  bandAr,
  highRisk,
  submittedAt,
  patientNames,
  submissionId,
  showNavLinks = true,
}: AssessmentResultProps) {
  const supabase = useMemo(() => createClient(), [])
  const [relatedAssessments, setRelatedAssessments] = useState<RelatedAssessment[]>([])
  const [domainScores, setDomainScores] = useState<Record<string, number> | null>(null)

  const displayBand = lang === 'ar' ? bandAr : bandEn
  const isPositive = bandEn.toLowerCase().includes('minimal') || bandEn.toLowerCase().includes('none') || bandEn.toLowerCase().includes('normal') || bandEn.toLowerCase().includes('low risk') || bandEn.toLowerCase().includes('below') || bandEn.toLowerCase().includes('no problem')
  const defName = lang === 'ar' && definition.name_ar ? definition.name_ar : definition.name_en
  const completedOn = new Date(submittedAt).toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { year: 'numeric', month: 'long', day: 'numeric' })
  const assessmentMeta = getLocalizedAssessmentMeta(definition.code, lang, ASSESSMENT_CONTENT_AR)
  const bandContent = getLocalizedBandContent(definition.code, bandEn, lang, ASSESSMENT_CONTENT_AR)
  const strengths = deriveStrengths(
    definition.code,
    bandEn,
    bandContent?.whatThisMeans ?? [],
    lang === 'ar' ? 'ar' : 'en'
  )

  // Life-domain hints for self-knowledge framing
  const lifeDomains = lang === 'ar'
    ? [
        { label: 'النوم والطاقة', hint: 'كيف يؤثر هذا على راحتك ونومك؟' },
        { label: 'العمل والدراسة', hint: 'هل يظهر هذا في تركيزك أو إنتاجيتك؟' },
        { label: 'العلاقات', hint: 'كيف ينعكس ذلك على تواصلك مع الآخرين؟' },
      ]
    : [
        { label: 'Sleep & energy', hint: 'How might this show up in rest and energy?' },
        { label: 'Work & study', hint: 'Does this affect focus or productivity?' },
        { label: 'Relationships', hint: 'How does this show up with people you care about?' },
      ]

  useEffect(() => {
    async function loadRelated() {
      const content = getAssessmentContent(definition.code)
      if (!content || content.relatedCodes.length === 0) return
      const { data } = await supabase
        .from('assessment_definitions')
        .select('id, code, name_en, name_ar, description_en, description_ar, total_questions')
        .in('code', content.relatedCodes)
        .eq('is_active', true)
      if (data) setRelatedAssessments(data as RelatedAssessment[])
    }
    loadRelated()
  }, [definition.code, supabase])

  useEffect(() => {
    if (definition.code !== 'IPIP120' || !submissionId) return
    async function loadDomains() {
      const [{ data: items }, { data: responses }] = await Promise.all([
        supabase.from('assessment_items').select('id, subscale').eq('definition_id', definition.id),
        supabase.from('assessment_responses').select('item_id, response_value').eq('submission_id', submissionId),
      ])
      if (!items || !responses) return
      const answerMap = Object.fromEntries(responses.map(r => [r.item_id, r.response_value]))
      const scores: Record<string, number> = { N: 0, E: 0, O: 0, A: 0, C: 0 }
      items.forEach(item => {
        const domain = item.subscale?.charAt(0)
        if (domain && domain in scores) scores[domain] += answerMap[item.id] ?? 0
      })
      setDomainScores(scores)
    }
    loadDomains()
  }, [definition.code, definition.id, submissionId, supabase])

  return (
    <div className="py-8 px-4 max-w-3xl mx-auto space-y-6">
      <div className="card p-8 text-center">
        {highRisk ? (
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        ) : (
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isPositive ? 'bg-green-100' : 'bg-orange-100'}`}>
            <CheckCircle2 className={`w-8 h-8 ${isPositive ? 'text-green-600' : 'text-orange-500'}`} />
          </div>
        )}
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{t('assessment.result.title', lang)}</h2>
        <p className="text-[13.5px] mb-6" style={{ color: 'var(--text-muted)' }}>{defName}</p>
        <div className="rounded-xl p-6 mb-4 inline-block min-w-48" style={{ backgroundColor: 'var(--surface-alt)' }}>
          <p className="text-5xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{score}</p>
          <p className={`text-[11px] mb-3 ${lang === 'ar' ? '' : 'uppercase tracking-wide'}`} style={{ color: 'var(--text-muted)' }}>
            {t('assessment.result.score', lang)} · {completedOn}
          </p>
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${severityColor(bandEn)}`}>
            {displayBand}
          </span>
        </div>

        {highRisk && (
          <div className={`mt-4 alert-error ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
            <p className="text-sm font-semibold mb-1">⚠ {t('assessment.high_risk_note', lang)}</p>
            <p className="text-sm">{t('assessment.result.high_risk', lang)}</p>
          </div>
        )}

        {highRisk && <div className="mt-4"><CrisisBanner lang={lang} /></div>}

        {patientNames.en ? (
          <div className="mt-4 flex justify-center">
            <AssessmentPdfDownloadButton
              lang={lang as 'en' | 'ar'}
              patientName={(lang === 'ar' && patientNames.ar) ? patientNames.ar : patientNames.en}
              assessmentName={defName}
              assessmentCode={definition.code}
              completedOn={completedOn}
              score={score}
              band={displayBand}
              highRisk={highRisk}
              explanation={bandContent?.explanation ?? ''}
              whatThisMeans={bandContent?.whatThisMeans ?? []}
              recommendations={bandContent?.recommendations ?? []}
              labelDownload={t('assessment.result.download_pdf', lang)}
              labelGenerating={t('assessment.result.generating_pdf', lang)}
            />
          </div>
        ) : (
          <div className="mt-4 p-3 rounded-xl text-center" style={{ background: '#EAF2F9', border: '1px solid #C7DFF0' }}>
            <p className="text-[13px] mb-2" style={{ color: '#12273C' }}>{t('assessment.result.pdf_name_required', lang)}</p>
            <Link href="/profile" className="text-[13px] font-semibold" style={{ color: '#1D6296' }}>
              {t('assessment.result.add_name', lang)} →
            </Link>
          </div>
        )}
      </div>

      <AttemptCompareCard definitionId={definition.id} lang={lang} />

      <ScreeningDisclaimer lang={lang} />

      {strengths.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--vw-blue)' }} />
            <h3 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {lang === 'ar' ? 'نقاط قوة لتلاحظها' : 'Strengths to notice'}
            </h3>
          </div>
          <ul className="space-y-2">
            {strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#1B8A5A' }} />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-6">
        <h3 className="text-[14.5px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          {lang === 'ar' ? 'في حياتك اليومية' : 'In your daily life'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {lifeDomains.map(d => (
            <div key={d.label} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-alt)' }}>
              <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{d.label}</p>
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{d.hint}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 items-center">
          <SelfMapLink lang={lang} compact />
          {submissionId && (
            <Link
              href={`/journal?from=${submissionId}`}
              className="text-[13px] font-semibold"
              style={{ color: 'var(--vw-blue)' }}
            >
              {lang === 'ar' ? 'اكتب تأملاً قصيراً' : 'Write a short reflection'} →
            </Link>
          )}
        </div>
      </div>

      {definition.code === 'IPIP120' && domainScores && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4" style={{ color: 'var(--vw-blue)' }} />
            <h3 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{lang === 'ar' ? 'ملفك الشخصي' : 'Your Personality Profile'}</h3>
          </div>
          <div className="space-y-4">
            {Object.entries(IPIP_DOMAINS).map(([key, info]) => {
              const ds = domainScores[key] ?? 0
              const level = getIpipDomainLevel(ds)
              const pct = Math.round(((ds - 24) / 96) * 100)
              const desc = lang === 'ar' ? info[`${level}_ar`] : info[level]
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{lang === 'ar' ? info.label_ar : info.label}</span>
                    <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{ds}</span>
                  </div>
                  <div className="progress-track mb-1.5">
                    <div className="progress-fill transition-all" style={{ width: `${pct}%`, backgroundColor: 'var(--vw-blue)' }} />
                  </div>
                  <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {assessmentMeta && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4" style={{ color: 'var(--vw-blue)' }} />
            <h3 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('assessment.result.about', lang)}</h3>
          </div>
          <p className="text-[13.5px] leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>{assessmentMeta.overview}</p>
        </div>
      )}

      {bandContent && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical className="w-4 h-4" style={{ color: 'var(--vw-blue)' }} />
            <h3 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {t('assessment.result.what_means', lang)} —{' '}
              <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${severityColor(bandEn)}`}>{displayBand}</span>
            </h3>
          </div>
          <p className="text-[13.5px] leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>{bandContent.explanation}</p>
          {bandContent.whatThisMeans.length > 0 && (
            <ul className="space-y-2 mb-5">
              {bandContent.whatThisMeans.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2" style={{ backgroundColor: 'var(--vw-blue)' }} />
                  {point}
                </li>
              ))}
            </ul>
          )}
          {bandContent.recommendations.length > 0 && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#EAF2F9', border: '1px solid #C7DFF0' }}>
              <ul className="space-y-2">
                {bandContent.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13.5px]" style={{ color: '#12273C' }}>
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--vw-blue)' }} />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {relatedAssessments.length > 0 && (
        <NextStepAndPath
          lang={lang}
          currentCode={definition.code}
          relatedAssessments={relatedAssessments}
        />
      )}

      {showNavLinks && (
        <div className="flex flex-wrap gap-3 justify-center pb-8">
          <Link href={`/assessments/${definition.id}/history`} className="btn-secondary">
            {lang === 'ar' ? 'السجل والمقارنة' : 'History & compare'}
          </Link>
          <Link href="/insights#self-map" className="btn-secondary">
            {lang === 'ar' ? 'خريطتي الذاتية' : 'My Self Map'}
          </Link>
          <Link href="/assessments" className="btn-secondary">{t('nav.assessments', lang)}</Link>
          <Link href="/dashboard" className="btn-primary">{t('nav.dashboard', lang)}</Link>
        </div>
      )}
    </div>
  )
}
