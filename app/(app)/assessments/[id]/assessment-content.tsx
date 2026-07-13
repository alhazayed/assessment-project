'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle,
  BookOpen, FlaskConical, ArrowRight, Brain,
} from 'lucide-react'
import type { AssessmentDefinition, AssessmentItem, ResponseOption } from '@/lib/types'
import { getAssessmentContent, getLocalizedBandContent, getLocalizedAssessmentMeta, IPIP_DOMAINS, getIpipDomainLevel } from '@/lib/assessment-content'
import { ASSESSMENT_CONTENT_AR } from '@/lib/assessment-content-ar'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'
import CrisisResources from '@/components/crisis-resources'

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

interface Props {
  id: string
  userId: string
  /** Present when launched from a clinician assignment — marks it complete on submit. */
  assignmentId?: string
}

export default function AssessmentContent({ id, userId, assignmentId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const lang = useLang()

  const [definition, setDefinition] = useState<AssessmentDefinition | null>(null)
  const [items, setItems] = useState<AssessmentItem[]>([])
  const [relatedAssessments, setRelatedAssessments] = useState<RelatedAssessment[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, { value: number; label_en: string; label_ar: string }>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ score: number; band_en: string; band_ar: string; high_risk: boolean } | null>(null)
  const [domainScores, setDomainScores] = useState<Record<string, number> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [hasSavedProgress, setHasSavedProgress] = useState(false)

  const storageKey = `vw_assessment_${id}_${userId}`

  useEffect(() => {
    if (Object.keys(answers).length === 0) return
    try {
      localStorage.setItem(storageKey, JSON.stringify({ answers, currentIndex }))
    } catch {}
  }, [answers, currentIndex, storageKey])

  useEffect(() => {
    async function load() {
      const [defRes, itemsRes] = await Promise.all([
        supabase.from('assessment_definitions').select('*').eq('id', id).single(),
        supabase.from('assessment_items').select('*').eq('definition_id', id).order('item_number'),
      ])
      if (defRes.error || !defRes.data) { setLoadError(true); return }
      if (defRes.data) setDefinition(defRes.data as AssessmentDefinition)
      if (itemsRes.data) setItems(itemsRes.data as AssessmentItem[])

      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.answers && Object.keys(parsed.answers).length > 0) {
            setHasSavedProgress(true)
          }
        }
      } catch {}
    }
    load()
  }, [id, storageKey, supabase])

  function resumeSavedProgress() {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        setAnswers(parsed.answers ?? {})
        setCurrentIndex(parsed.currentIndex ?? 0)
      }
    } catch {}
    setHasSavedProgress(false)
  }

  function discardSavedProgress() {
    try { localStorage.removeItem(storageKey) } catch {}
    setHasSavedProgress(false)
  }

  async function loadRelated(code: string) {
    const content = getAssessmentContent(code)
    if (!content || content.relatedCodes.length === 0) return
    const { data } = await supabase
      .from('assessment_definitions')
      .select('id, code, name_en, name_ar, description_en, description_ar, total_questions')
      .in('code', content.relatedCodes)
      .eq('is_active', true)
    if (data) setRelatedAssessments(data as RelatedAssessment[])
  }

  async function handleSubmit() {
    if (!definition) return
    setSubmitting(true)
    setError(null)

    if (definition.code === 'IPIP120') {
      const scores: Record<string, number> = { N: 0, E: 0, O: 0, A: 0, C: 0 }
      items.forEach(item => {
        const domain = item.subscale?.charAt(0)
        if (domain && domain in scores) scores[domain] += answers[item.id]?.value ?? 0
      })
      setDomainScores(scores)
    }

    const responsePayload = items
      .filter(item => answers[item.id] !== undefined)
      .map(item => ({ item_id: item.id, value: answers[item.id].value }))

    const res = await fetch('/api/submit-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ definition_id: definition.id, responses: responsePayload, assignment_id: assignmentId }),
    })

    if (!res.ok) {
      setError(t('assessment.save_error', lang))
      setSubmitting(false)
      return
    }

    const data = await res.json()
    try { localStorage.removeItem(storageKey) } catch {}
    setResult({ score: data.score, band_en: data.band_en, band_ar: data.band_ar, high_risk: data.high_risk })
    setSubmitted(true)
    setSubmitting(false)
    await loadRelated(definition.code)
  }

  if (loadError) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-center max-w-sm">
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            {lang === 'ar' ? 'تعذّر تحميل التقييم' : 'Assessment not found'}
          </p>
          <p className="text-[13.5px] mb-4" style={{ color: 'var(--text-muted)' }}>
            {lang === 'ar' ? 'يرجى العودة وتحديد تقييم من القائمة.' : 'Please go back and select an assessment from the list.'}
          </p>
          <a href="/assessments" className="text-[13px] font-semibold underline" style={{ color: 'var(--vw-blue)' }}>
            {lang === 'ar' ? '← العودة إلى التقييمات' : '← Back to Assessments'}
          </a>
        </div>
      </div>
    )
  }

  if (!definition || items.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--vw-blue)', borderTopColor: 'transparent' }} />
          <p className="text-[13.5px]" style={{ color: 'var(--text-muted)' }}>{t('assessment.loading', lang)}</p>
        </div>
      </div>
    )
  }

  if (submitted && result) {
    const isHighRisk = result.high_risk
    const assessmentMeta = getLocalizedAssessmentMeta(definition.code, lang, ASSESSMENT_CONTENT_AR)
    const bandContent = getLocalizedBandContent(definition.code, result.band_en, lang, ASSESSMENT_CONTENT_AR)
    const displayBand = lang === 'ar' ? result.band_ar : result.band_en
    const isPositive = result.band_en.toLowerCase().includes('minimal') || result.band_en.toLowerCase().includes('none') || result.band_en.toLowerCase().includes('normal') || result.band_en.toLowerCase().includes('low risk') || result.band_en.toLowerCase().includes('below') || result.band_en.toLowerCase().includes('no problem')
    const defName = lang === 'ar' && definition.name_ar ? definition.name_ar : definition.name_en

    return (
      <div className="py-8 px-4 max-w-3xl mx-auto space-y-6">

        <div className="card p-8 text-center">
          {isHighRisk ? (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          ) : (
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isPositive ? 'bg-green-100' : 'bg-orange-100'}`}>
              <CheckCircle2 className={`w-8 h-8 ${isPositive ? 'text-green-600' : 'text-orange-500'}`} />
            </div>
          )}
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{t('assessment.result.score', lang)}</h2>
          <p className="text-[13.5px] mb-6" style={{ color: 'var(--text-muted)' }}>{defName}</p>
          <div className="rounded-xl p-6 mb-4 inline-block min-w-48" style={{ backgroundColor: 'var(--surface-alt)' }}>
            <p className="text-5xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{result.score}</p>
            <p className={`text-[11px] mb-3 ${lang === 'ar' ? '' : 'uppercase tracking-wide'}`} style={{ color: 'var(--text-muted)' }}>{t('assessment.result.score', lang)}</p>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${severityColor(result.band_en)}`}>
              {displayBand}
            </span>
          </div>

          {isHighRisk && (
            <div className={`mt-4 alert-error ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
              <p className="text-sm font-semibold mb-1">⚠ {t('assessment.high_risk_note', lang)}</p>
              <p className="text-sm mb-2">{t('assessment.result.high_risk', lang)}</p>
              <CrisisResources lang={lang} compact showEmergencyLink />
            </div>
          )}

          <p className="mt-4 text-[13.5px] text-green-600 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> {t('assessment.result.saved', lang)}
          </p>
        </div>

        {definition.code === 'IPIP120' && domainScores && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4" style={{ color: 'var(--vw-blue)' }} />
              <h3 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{lang === 'ar' ? 'ملفك الشخصي' : 'Your Personality Profile'}</h3>
            </div>
            <p className="text-[11.5px] mb-5" style={{ color: 'var(--text-muted)' }}>{lang === 'ar' ? 'النتائج تتراوح 24–120 لكل بُعد. منخفض <65 · متوسط 65–88 · مرتفع >88' : 'Scores range 24–120 per domain. Low <65 · Average 65–88 · High >88'}</p>
            <div className="space-y-4">
              {Object.entries(IPIP_DOMAINS).map(([key, info]) => {
                const score = domainScores[key] ?? 0
                const level = getIpipDomainLevel(score)
                const pct = Math.round(((score - 24) / 96) * 100)
                const desc = lang === 'ar' ? info[`${level}_ar`] : info[level]
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{lang === 'ar' ? info.label_ar : info.label}</span>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${info.color}`}>{level}</span>
                      </div>
                      <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{score}</span>
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
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              <span className="font-medium">{t('assessment.result.measures', lang)}:</span> {assessmentMeta.measuresDomain}
            </p>
          </div>
        )}

        {bandContent && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <FlaskConical className="w-4 h-4" style={{ color: 'var(--vw-blue)' }} />
              <h3 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
                {t('assessment.result.what_means', lang)} —{' '}
                <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${severityColor(result.band_en)}`}>{displayBand}</span>
              </h3>
            </div>

            <p className="text-[13.5px] leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>{bandContent.explanation}</p>

            {bandContent.whatThisMeans.length > 0 && (
              <div className="mb-5">
                <p className={`text-[11px] font-semibold mb-2 ${lang === 'ar' ? '' : 'uppercase tracking-wide'}`} style={{ color: 'var(--text-muted)' }}>{t('assessment.result.key_points', lang)}</p>
                <ul className="space-y-2">
                  {bandContent.whatThisMeans.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2" style={{ backgroundColor: 'var(--vw-blue)' }} />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {bandContent.recommendations.length > 0 && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#EAF2F9', border: '1px solid #C7DFF0' }}>
                <p className={`text-[11px] font-semibold mb-2 ${lang === 'ar' ? '' : 'uppercase tracking-wide'}`} style={{ color: 'var(--vw-blue)' }}>{t('assessment.result.recommendations', lang)}</p>
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

        {bandContent && bandContent.relatedDisorders.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4" style={{ color: 'var(--vw-blue)' }} />
              <h3 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('assessment.result.related_conditions', lang)}</h3>
            </div>
            <p className="text-[11.5px] mb-4" style={{ color: 'var(--text-muted)' }}>{t('assessment.result.clinician_note', lang)}</p>
            <div className="space-y-3">
              {bandContent.relatedDisorders.map((disorder, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-[10px]" style={{ backgroundColor: 'var(--surface-alt)', border: '1px solid var(--border-subtle)' }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: 'var(--vw-blue)' }} />
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{disorder.name}</p>
                    <p className="text-[11.5px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{disorder.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {relatedAssessments.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRight className="w-4 h-4" style={{ color: 'var(--vw-blue)' }} />
              <h3 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('assessment.result.related_assessments', lang)}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {relatedAssessments.map((ra) => {
                const raName = lang === 'ar' && ra.name_ar ? ra.name_ar : ra.name_en
                const raDesc = lang === 'ar' && ra.description_ar ? ra.description_ar : ra.description_en
                return (
                  <Link
                    key={ra.id}
                    href={`/assessments/${ra.id}`}
                    className="card-hover p-4 group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--vw-blue)' }}>{ra.code}</span>
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{ra.total_questions}{t('assessments.questions', lang)}</span>
                    </div>
                    <p className="text-[13.5px] font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>{raName}</p>
                    {raDesc && (
                      <p className="text-[11.5px] mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{raDesc}</p>
                    )}
                    <p className="text-[12px] mt-2 font-medium" style={{ color: 'var(--vw-blue)' }}>{t('assessment.result.take', lang)} →</p>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center pb-8">
          <Link href="/assessments" className="btn-secondary">{t('nav.assessments', lang)}</Link>
          <Link href="/dashboard" className="btn-primary">{t('nav.dashboard', lang)}</Link>
        </div>
      </div>
    )
  }

  const currentItem = items[currentIndex]
  const progress = ((currentIndex + 1) / items.length) * 100
  const currentAnswer = answers[currentItem.id]
  const allAnswered = Object.keys(answers).length >= items.length
  const question = lang === 'ar' && currentItem.question_ar ? currentItem.question_ar : currentItem.question_en
  const defName = lang === 'ar' && definition.name_ar ? definition.name_ar : definition.name_en

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{defName}</h1>
          <span className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{currentIndex + 1} {t('assessment.of', lang)} {items.length}</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: 'var(--vw-blue)' }} />
        </div>
      </div>

      {hasSavedProgress && (
        <div className="mb-4 p-3 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ backgroundColor: '#EEF5FB', borderColor: '#1D6296' }}>
          <p className="text-sm font-medium" style={{ color: '#1D6296' }}>
            {lang === 'ar' ? 'لديك تقدم محفوظ في هذا التقييم.' : 'You have saved progress for this assessment.'}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
            <button onClick={resumeSavedProgress} className="flex-1 sm:flex-none text-xs font-semibold px-3 py-2.5 min-h-[44px] rounded-lg text-white transition-opacity hover:opacity-90" style={{ backgroundColor: '#1D6296' }}>
              {lang === 'ar' ? 'استئناف' : 'Resume'}
            </button>
            <button onClick={discardSavedProgress} className="flex-1 sm:flex-none text-xs text-gray-500 hover:text-gray-700 transition-colors px-3 py-2.5 min-h-[44px]">
              {lang === 'ar' ? 'بدء من جديد' : 'Start over'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 alert-error">{error}</div>
      )}

      <div className="card p-7 mb-6">
        <p className={`text-[11px] font-semibold mb-3 ${lang === 'ar' ? '' : 'uppercase tracking-wide'}`} style={{ color: 'var(--text-muted)' }}>
          {t('assessment.question', lang)} {currentIndex + 1}
        </p>
        <h2 className={`text-[16.5px] font-medium mb-6 ${lang === 'ar' ? 'leading-loose text-right' : 'leading-relaxed'}`} style={{ color: 'var(--text-primary)' }}>{question}</h2>
        <div className="space-y-3">
          {(currentItem.response_options as ResponseOption[]).map((opt) => {
            const optLabel = lang === 'ar' && opt.label_ar ? opt.label_ar : opt.label_en
            return (
              <button
                key={opt.value}
                onClick={() => setAnswers(prev => ({
                  ...prev,
                  [currentItem.id]: { value: opt.value, label_en: opt.label_en, label_ar: opt.label_ar }
                }))}
                className={`w-full p-4 rounded-[12px] border-2 transition-all text-[13.5px] ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                style={currentAnswer?.value === opt.value
                  ? { borderColor: 'var(--vw-blue)', backgroundColor: '#EAF2F9', color: '#12273C' }
                  : { borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }
                }
              >
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${lang === 'ar' ? 'ms-3' : 'me-3'}`}
                  style={currentAnswer?.value === opt.value
                    ? { backgroundColor: 'var(--vw-blue)', color: 'white' }
                    : { backgroundColor: 'var(--surface-alt)', color: 'var(--text-muted)' }
                  }>
                  {opt.value}
                </span>
                {optLabel}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="btn-secondary gap-2 disabled:opacity-40 w-full sm:w-auto justify-center"
        >
          <ChevronLeft className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} /> {t('assessment.prev', lang)}
        </button>
        {currentIndex < items.length - 1 ? (
          <button
            onClick={() => setCurrentIndex(prev => prev + 1)}
            disabled={!currentAnswer}
            className="btn-primary gap-2 disabled:opacity-40 w-full sm:w-auto justify-center"
          >
            {t('assessment.next', lang)} <ChevronRight className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="btn-primary gap-2 disabled:opacity-40 w-full sm:w-auto justify-center"
          >
            {submitting ? t('assessment.submitting', lang) : t('assessment.submit', lang)} <CheckCircle2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {!allAnswered && currentIndex === items.length - 1 && (
        <p className="text-center text-xs text-orange-600 mt-3">
          {items.length - Object.keys(answers).length} {t('assessment.unanswered', lang)}
        </p>
      )}
    </div>
  )
}
