'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle2, AlertTriangle, AlertCircle, BookOpen, FlaskConical, Brain, Loader2, Sparkles, ShieldCheck,
} from 'lucide-react'
import type { AssessmentDefinition } from '@/lib/types'
import { getAssessmentContent, getLocalizedBandContent, getLocalizedAssessmentMeta, IPIP_DOMAINS, getIpipDomainLevel } from '@/lib/assessment-content'
import { ASSESSMENT_CONTENT_AR } from '@/lib/assessment-content-ar'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import AttemptCompareCard from '@/components/attempt-compare-card'
import CrisisResources from '@/components/crisis-resources'
import { bandToSeverity, isConcerningBand, severityBadgeClass } from '@/lib/severity'
import ScreeningDisclaimer from '@/components/screening-disclaimer'
import SelfMapLink from '@/components/self-map-link'
import NextStepAndPath from '@/components/next-step-and-path'
import { deriveStrengths } from '@/lib/self-knowledge'
import { computeSubscaleScores, displayTotal, formatSubscaleValue, getScaleScoring, type SubscaleScore } from '@/lib/scale-scoring'

const AssessmentPdfDownloadButton = dynamic(
  () => import('@/app/(app)/assessments/[id]/pdf-download-button').then(m => m.AssessmentPdfDownloadButton),
  { ssr: false, loading: () => <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px]" style={{ color: 'var(--text-muted)' }}><Loader2 className="w-4 h-4 animate-spin" /></span> }
)

function severityColor(band: string) {
  return `${severityBadgeClass(band)} border`
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
  /** Localized "reviewed by" line, set once a clinician has confirmed the review. */
  reviewedBy?: string | null
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
  reviewedBy,
  showNavLinks = true,
}: AssessmentResultProps) {
  const supabase = useMemo(() => createClient(), [])
  const [relatedAssessments, setRelatedAssessments] = useState<RelatedAssessment[]>([])
  const [breakdown, setBreakdown] = useState<{ subscales: SubscaleScore[]; domains: SubscaleScore[] } | null>(null)
  const scaleScoring = getScaleScoring(definition.code)
  const shownScore = displayTotal(definition.code, score, definition.total_questions)

  const displayBand = lang === 'ar' ? bandAr : bandEn
  const severityLevel = bandToSeverity(bandEn)
  const isPositive = severityLevel === 'minimal'
  const isConcerning = isConcerningBand(bandEn)
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
    if (!getScaleScoring(definition.code) || !submissionId) return
    async function loadBreakdown() {
      const [{ data: items }, { data: responses }] = await Promise.all([
        supabase.from('assessment_items').select('id, subscale').eq('definition_id', definition.id),
        supabase.from('assessment_responses').select('item_id, response_value').eq('submission_id', submissionId),
      ])
      if (!items || !responses) return
      const answers = Object.fromEntries(responses.map(r => [r.item_id, r.response_value as number]))
      setBreakdown(computeSubscaleScores(definition.code, items, answers))
    }
    loadBreakdown()
  }, [definition.code, definition.id, submissionId, supabase])

  return (
    <div className="py-8 px-4 max-w-3xl mx-auto space-y-6">
      <div className="card p-8 text-center">
        {highRisk ? (
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        ) : isConcerning ? (
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${severityLevel === 'severe' ? 'bg-red-100' : 'bg-orange-100'}`}>
            <AlertCircle className={`w-8 h-8 ${severityLevel === 'severe' ? 'text-red-600' : 'text-orange-500'}`} aria-hidden="true" />
          </div>
        ) : (
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isPositive ? 'bg-green-100' : 'bg-brand-50'}`}>
            <CheckCircle2 className={`w-8 h-8 ${isPositive ? 'text-green-600' : 'text-brand-500'}`} aria-hidden="true" />
          </div>
        )}
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{t('assessment.result.title', lang)}</h2>
        <p className="text-[13.5px] mb-6" style={{ color: 'var(--text-muted)' }}>{defName}</p>
        <div className="rounded-xl p-6 mb-4 inline-block min-w-48" style={{ backgroundColor: 'var(--surface-alt)' }}>
          <p className="text-5xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{shownScore}</p>
          <p className={`text-[11px] mb-3 ${lang === 'ar' ? '' : 'uppercase tracking-wide'}`} style={{ color: 'var(--text-muted)' }}>
            {t('assessment.result.score', lang)} · {completedOn}
          </p>
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${severityColor(bandEn)}`}>
            {displayBand}
          </span>
          {reviewedBy && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" aria-hidden="true" />
              {reviewedBy}
            </p>
          )}
        </div>

        {highRisk && (
          <div className={`mt-4 alert-error ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
            <p className="text-sm font-semibold mb-1">⚠ {t('assessment.high_risk_note', lang)}</p>
            <p className="text-sm">{t('assessment.result.high_risk', lang)}</p>
          </div>
        )}

        {highRisk && (
          <div className="mt-4 text-start">
            <CrisisResources lang={lang} />
          </div>
        )}

        {patientNames.en ? (
          <div className="mt-4 flex justify-center">
            <AssessmentPdfDownloadButton
              lang={lang as 'en' | 'ar'}
              patientName={(lang === 'ar' && patientNames.ar) ? patientNames.ar : patientNames.en}
              assessmentName={defName}
              assessmentCode={definition.code}
              completedOn={completedOn}
              score={shownScore}
              band={displayBand}
              highRisk={highRisk}
              reviewedBy={reviewedBy ?? null}
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

      <ScreeningDisclaimer lang={lang} code={definition.code} />

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

      {scaleScoring && breakdown && breakdown.subscales.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4" style={{ color: 'var(--vw-blue)' }} />
            <h3 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {breakdown.domains.length > 0
                ? (lang === 'ar' ? 'ملفك الشخصي' : 'Your Personality Profile')
                : (lang === 'ar' ? 'النتائج حسب المقياس الفرعي' : 'Results by subscale')}
            </h3>
          </div>
          <div className="space-y-4">
            {(breakdown.domains.length > 0 ? breakdown.domains : breakdown.subscales).map(row => {
              const pct = row.max > row.min ? Math.round(((row.value - row.min) / (row.max - row.min)) * 100) : 0
              const domainInfo = breakdown.domains.length > 0 ? IPIP_DOMAINS[row.key] : undefined
              const level = domainInfo ? getIpipDomainLevel(row.value) : null
              const desc = domainInfo && level ? (lang === 'ar' ? domainInfo[`${level}_ar`] : domainInfo[level]) : null
              const facets = domainInfo ? breakdown.subscales.filter(f => f.key.split('-')[0] === row.key) : []
              return (
                <div key={row.key}>
                  <div className="flex items-center justify-between mb-1.5 gap-3">
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{lang === 'ar' ? row.labelAr : row.labelEn}</span>
                    <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--text-primary)' }} dir="ltr">
                      {formatSubscaleValue(definition.code, row.value)}
                    </span>
                  </div>
                  <div className="progress-track mb-1.5" role="presentation">
                    <div className="progress-fill transition-all" style={{ width: `${pct}%`, backgroundColor: 'var(--vw-blue)' }} />
                  </div>
                  {desc && <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>}
                  {facets.length > 0 && (
                    <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                      {facets.map(f => (
                        <li key={f.key} className="flex items-center justify-between text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                          <span>{lang === 'ar' ? f.labelAr : f.labelEn}</span>
                          <span className="tabular-nums font-medium" dir="ltr">{f.value} / {f.max}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {lang === 'ar' ? scaleScoring.noteAr : scaleScoring.noteEn}
          </p>
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
