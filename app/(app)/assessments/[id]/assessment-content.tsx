'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronLeft, ChevronRight, CheckCircle2, Loader2, CloudOff, Cloud, LogOut,
} from 'lucide-react'
import type { AssessmentDefinition, AssessmentItem, ResponseOption } from '@/lib/types'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'
import AssessmentResultView from '@/components/assessment-result-view'
import ScreeningDisclaimer from '@/components/screening-disclaimer'
import SafetyInterrupt from '@/components/safety-interrupt'
import LanguageToggle from '@/components/language-toggle'

interface Props {
  id: string
  userId: string
  /** Present when launched from a clinician assignment — marks it complete on submit. */
  assignmentId?: string
}

export default function AssessmentContent({ id, userId, assignmentId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const lang = useLang()
  const router = useRouter()

  const [definition, setDefinition] = useState<AssessmentDefinition | null>(null)
  const [items, setItems] = useState<AssessmentItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, { value: number; label_en: string; label_ar: string }>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ score: number; band_en: string; band_ar: string; high_risk: boolean } | null>(null)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [patientNames, setPatientNames] = useState<{ en: string; ar: string | null }>({ en: '', ar: null })
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [hasSavedProgress, setHasSavedProgress] = useState(false)
  const [pendingResume, setPendingResume] = useState<{ answers: Record<string, { value: number; label_en: string; label_ar: string }>; currentIndex: number } | null>(null)
  const [syncState, setSyncState] = useState<'idle' | 'saving' | 'saved' | 'offline' | 'error'>('idle')
  const [isOnline, setIsOnline] = useState(true)
  const [needsConsent, setNeedsConsent] = useState(false)
  const [safetyInterrupt, setSafetyInterrupt] = useState(false)
  const dismissedSafetyItems = useRef<Set<string>>(new Set())
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstAnswerEffect = useRef(true)

  const storageKey = `vw_assessment_${id}_${userId}`

  // Track network status so we can show an honest "Offline — saved locally"
  // state instead of silently failing the server sync.
  useEffect(() => {
    setIsOnline(navigator.onLine)
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // Local-first backup: write instantly on every change so a crashed tab or
  // closed browser never loses the most recent answer, even offline.
  useEffect(() => {
    if (Object.keys(answers).length === 0) return
    try {
      localStorage.setItem(storageKey, JSON.stringify({ answers, currentIndex }))
    } catch {}
  }, [answers, currentIndex, storageKey])

  // Cross-device backup: debounce a sync to Supabase so progress survives
  // clearing browser storage or switching devices, and reflect real state
  // (Saving.../Saved/Offline/Failed) instead of a silent write.
  useEffect(() => {
    if (Object.keys(answers).length === 0) return
    if (isFirstAnswerEffect.current) { isFirstAnswerEffect.current = false; return }

    if (!isOnline) {
      setSyncState('offline')
      return
    }

    if (syncTimer.current) clearTimeout(syncTimer.current)
    setSyncState('saving')
    syncTimer.current = setTimeout(async () => {
      const { error: syncError } = await supabase
        .from('assessment_drafts')
        .upsert(
          { patient_id: userId, definition_id: id, answers, current_index: currentIndex },
          { onConflict: 'patient_id,definition_id' }
        )
      setSyncState(syncError ? 'error' : 'saved')
    }, 800)

    return () => { if (syncTimer.current) clearTimeout(syncTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, currentIndex, isOnline])

  useEffect(() => {
    async function load() {
      const [defRes, itemsRes, draftRes, profileRes, consentRes] = await Promise.all([
        supabase.from('assessment_definitions').select('*').eq('id', id).single(),
        supabase.from('assessment_items').select('*').eq('definition_id', id).order('item_number'),
        supabase.from('assessment_drafts').select('answers, current_index, updated_at').eq('patient_id', userId).eq('definition_id', id).maybeSingle(),
        supabase.from('profiles').select('full_name_en, full_name_ar').eq('id', userId).single(),
        supabase.from('patient_profiles').select('consent_given_at').eq('id', userId).maybeSingle(),
      ])
      if (defRes.error || !defRes.data) { setLoadError(true); return }
      if (defRes.data) setDefinition(defRes.data as AssessmentDefinition)
      if (itemsRes.data) setItems(itemsRes.data as AssessmentItem[])
      if (profileRes.data) {
        setPatientNames({ en: profileRes.data.full_name_en, ar: profileRes.data.full_name_ar })
      }
      setNeedsConsent(!consentRes.data?.consent_given_at)

      // Prefer the server draft (survives cleared storage / other devices);
      // fall back to localStorage if the server has nothing or is unreachable.
      let resumable: { answers: Record<string, { value: number; label_en: string; label_ar: string }>; currentIndex: number } | null = null
      const serverAnswers = draftRes.data?.answers as Record<string, { value: number; label_en: string; label_ar: string }> | undefined
      if (serverAnswers && Object.keys(serverAnswers).length > 0) {
        resumable = { answers: serverAnswers, currentIndex: draftRes.data?.current_index ?? 0 }
      } else {
        try {
          const saved = localStorage.getItem(storageKey)
          if (saved) {
            const parsed = JSON.parse(saved)
            if (parsed.answers && Object.keys(parsed.answers).length > 0) {
              resumable = { answers: parsed.answers, currentIndex: parsed.currentIndex ?? 0 }
            }
          }
        } catch {}
      }
      if (resumable) {
        setPendingResume(resumable)
        setHasSavedProgress(true)
      }
    }
    load()
  }, [id, userId, storageKey, supabase])

  function resumeSavedProgress() {
    if (pendingResume) {
      setAnswers(pendingResume.answers)
      setCurrentIndex(pendingResume.currentIndex)
    }
    setHasSavedProgress(false)
  }

  async function discardSavedProgress() {
    try { localStorage.removeItem(storageKey) } catch {}
    await supabase.from('assessment_drafts').delete().eq('patient_id', userId).eq('definition_id', id)
    setHasSavedProgress(false)
    setPendingResume(null)
  }

  function selectAnswer(item: AssessmentItem, opt: ResponseOption) {
    setAnswers(prev => ({
      ...prev,
      [item.id]: { value: opt.value, label_en: opt.label_en, label_ar: opt.label_ar },
    }))
    // Soft safety interrupt for endorsed safety items (e.g. PHQ-9 Q9)
    if (item.is_safety_item && opt.value > 0 && !dismissedSafetyItems.current.has(item.id)) {
      setSafetyInterrupt(true)
    }
  }

  async function giveConsentAndContinue() {
    const { error: consentErr } = await supabase
      .from('patient_profiles')
      .upsert({ id: userId, consent_given_at: new Date().toISOString() })
    if (consentErr) {
      setError(lang === 'ar' ? 'تعذّر حفظ الموافقة. حاول مرة أخرى.' : 'Could not save consent. Please try again.')
      return
    }
    await supabase.from('audit_log').insert({
      actor_id: userId,
      action: 'consent_given',
      target_type: 'patient_profile',
      target_id: userId,
      reason: 'Informed consent before first saved assessment',
    })
    setNeedsConsent(false)
  }

  async function handleSubmit() {
    if (!definition) return
    if (needsConsent) {
      setError(lang === 'ar' ? 'يرجى الموافقة على شروط الاستخدام قبل الحفظ.' : 'Please give informed consent before saving results.')
      return
    }
    setSubmitting(true)
    setError(null)

    const responsePayload = items
      .filter(item => answers[item.id] !== undefined)
      .map(item => ({ item_id: item.id, value: answers[item.id].value }))

    const res = await fetch('/api/submit-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ definition_id: definition.id, responses: responsePayload, assignment_id: assignmentId }),
    })

    if (!res.ok) {
      const payload = await res.json().catch(() => null)
      if (res.status === 403 && payload?.code === 'consent_required') {
        setNeedsConsent(true)
        setError(lang === 'ar' ? 'الموافقة مطلوبة قبل حفظ النتائج.' : 'Consent is required before saving results.')
      } else {
        setError(t('assessment.save_error', lang))
      }
      setSubmitting(false)
      return
    }

    const data = await res.json()
    try { localStorage.removeItem(storageKey) } catch {}
    await supabase.from('assessment_drafts').delete().eq('patient_id', userId).eq('definition_id', definition.id)
    setResult({ score: data.score, band_en: data.band_en, band_ar: data.band_ar, high_risk: data.high_risk })
    setSubmissionId(data.submission_id ?? null)
    setSubmitted(true)
    setSubmitting(false)
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
    return (
      <>
        <p className="text-center text-[13.5px] text-green-600 flex items-center justify-center gap-1.5 pt-6">
          <CheckCircle2 className="w-4 h-4" /> {t('assessment.result.saved', lang)}
        </p>
        <AssessmentResultView
          lang={lang}
          definition={definition}
          score={result.score}
          bandEn={result.band_en}
          bandAr={result.band_ar}
          highRisk={result.high_risk}
          submittedAt={new Date().toISOString()}
          patientNames={patientNames}
          submissionId={submissionId ?? undefined}
        />
      </>
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
      {safetyInterrupt && (
        <SafetyInterrupt
          lang={lang}
          onContinue={() => {
            const item = items[currentIndex]
            if (item) dismissedSafetyItems.current.add(item.id)
            setSafetyInterrupt(false)
          }}
          onPause={() => {
            const item = items[currentIndex]
            if (item) dismissedSafetyItems.current.add(item.id)
            setSafetyInterrupt(false)
            router.push('/dashboard')
          }}
        />
      )}

      {needsConsent && (
        <div className="mb-4 card p-4 space-y-3" style={{ borderInlineStart: '4px solid #F3650A' }}>
          <p className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>
            {lang === 'ar' ? 'الموافقة المستنيرة مطلوبة' : 'Informed consent required'}
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {t('profile.consent.text', lang)}
          </p>
          <button type="button" onClick={giveConsentAndContinue} className="btn-primary">
            {lang === 'ar' ? 'أوافق وأكمل' : 'I agree & continue'}
          </button>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 gap-2">
          <h1 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{defName}</h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <LanguageToggle lang={lang} />
            <span className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{currentIndex + 1} {t('assessment.of', lang)} {items.length}</span>
          </div>
        </div>
        <div className="progress-track">
          <div className="progress-fill transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: 'var(--vw-blue)' }} />
        </div>
        {Object.keys(answers).length > 0 && (
          <p className="mt-1.5 text-[11.5px] flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }} role="status" aria-live="polite">
            {syncState === 'saving' && (<><Loader2 className="w-3 h-3 animate-spin" /> {lang === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'}</>)}
            {syncState === 'saved' && (<><Cloud className="w-3 h-3 text-green-600" /> {lang === 'ar' ? 'تم الحفظ' : 'Saved'}</>)}
            {syncState === 'offline' && (<><CloudOff className="w-3 h-3 text-orange-500" /> {lang === 'ar' ? 'غير متصل — تم الحفظ محلياً' : 'Offline — saved locally'}</>)}
            {syncState === 'error' && (<><CloudOff className="w-3 h-3 text-red-500" /> {lang === 'ar' ? 'تعذّر الحفظ عبر الإنترنت — محفوظ محلياً' : 'Couldn’t sync online — saved locally'}</>)}
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="ms-auto inline-flex items-center gap-1 text-[11.5px] font-semibold"
              style={{ color: 'var(--vw-blue)' }}
            >
              <LogOut className="w-3 h-3" />
              {lang === 'ar' ? 'حفظ والخروج' : 'Save & exit'}
            </button>
          </p>
        )}
      </div>

      <ScreeningDisclaimer lang={lang} className="mb-4" />

      {hasSavedProgress && (
        <div className="mb-4 p-3 rounded-xl border flex items-center justify-between gap-3" style={{ backgroundColor: '#EEF5FB', borderColor: '#1D6296' }}>
          <p className="text-sm font-medium" style={{ color: '#1D6296' }}>
            {lang === 'ar' ? 'لديك تقدم محفوظ في هذا التقييم.' : 'You have saved progress for this assessment.'}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={resumeSavedProgress} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90" style={{ backgroundColor: '#1D6296' }}>
              {lang === 'ar' ? 'استئناف' : 'Resume'}
            </button>
            <button onClick={discardSavedProgress} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
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
                onClick={() => selectAnswer(currentItem, opt)}
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

      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="btn-secondary gap-2 disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" /> {t('assessment.prev', lang)}
        </button>
        {currentIndex < items.length - 1 ? (
          <button
            onClick={() => setCurrentIndex(prev => prev + 1)}
            disabled={!currentAnswer}
            className="btn-primary gap-2 disabled:opacity-40"
          >
            {t('assessment.next', lang)} <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting || needsConsent}
            className="btn-primary gap-2 disabled:opacity-40"
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
