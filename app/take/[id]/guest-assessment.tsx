'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES } from '@/lib/countries'
import TurnstileWidget from '@/components/TurnstileWidget'
import BrandLogo from '@/components/brand-logo'
import DarkModeToggle from '@/components/dark-mode-toggle'
import LanguageToggle from '@/components/language-toggle'
import AssessmentResultView from '@/components/assessment-result-view'
import type { Lang } from '@/lib/i18n'
import type { AssessmentDefinition, AssessmentItem } from '@/lib/types'
import { GUEST_CLAIM_STORAGE_KEY } from '@/lib/guest-claim'
import { ChevronLeft, ChevronRight, Loader2, ShieldCheck, ArrowRight } from 'lucide-react'

type Answer = { value: number; label_en: string; label_ar: string }
type ResultShape = {
  submission_id: string
  score: number
  band_en: string | null
  band_ar: string | null
  high_risk: boolean
  claim_token?: string
}

// Enum values mirror app/api/submit-assessment-guest/route.ts exactly.
const GENDERS = ['male', 'female', 'non_binary', 'prefer_not_to_say'] as const
const MARITALS = ['single', 'married', 'divorced', 'widowed', 'separated', 'prefer_not_to_say'] as const
const EDUCATIONS = ['no_formal', 'primary', 'secondary', 'vocational', 'bachelors', 'masters', 'doctorate', 'prefer_not_to_say'] as const

const LABELS = {
  gender: {
    male: ['Male', 'ذكر'], female: ['Female', 'أنثى'], non_binary: ['Non-binary', 'غير ثنائي'],
    prefer_not_to_say: ['Prefer not to say', 'أفضّل عدم الإفصاح'],
  } as Record<string, [string, string]>,
  marital: {
    single: ['Single', 'أعزب'], married: ['Married', 'متزوج'], divorced: ['Divorced', 'مطلّق'],
    widowed: ['Widowed', 'أرمل'], separated: ['Separated', 'منفصل'], prefer_not_to_say: ['Prefer not to say', 'أفضّل عدم الإفصاح'],
  } as Record<string, [string, string]>,
  education: {
    no_formal: ['No formal education', 'بدون تعليم رسمي'], primary: ['Primary', 'ابتدائي'], secondary: ['Secondary', 'ثانوي'],
    vocational: ['Vocational', 'مهني'], bachelors: ['Bachelor’s', 'بكالوريوس'], masters: ['Master’s', 'ماجستير'],
    doctorate: ['Doctorate', 'دكتوراه'], prefer_not_to_say: ['Prefer not to say', 'أفضّل عدم الإفصاح'],
  } as Record<string, [string, string]>,
}

export default function GuestAssessment({ definitionId, lang }: { definitionId: string; lang: Lang }) {
  const isAr = lang === 'ar'
  const tr = (en: string, ar: string) => (isAr ? ar : en)
  const supabase = useMemo(() => createClient(), [])
  const storageKey = `vw_guest_${definitionId}`

  const [definition, setDefinition] = useState<AssessmentDefinition | null>(null)
  const [items, setItems] = useState<AssessmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [phase, setPhase] = useState<'questions' | 'demographics' | 'result'>('questions')
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})

  const [gender, setGender] = useState('')
  const [country, setCountry] = useState('')
  const [dob, setDob] = useState('')
  const [marital, setMarital] = useState('')
  const [education, setEducation] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResultShape | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [defRes, itemsRes] = await Promise.all([
        supabase.from('assessment_definitions').select('*').eq('id', definitionId).single(),
        supabase.from('assessment_items').select('*').eq('definition_id', definitionId).order('item_number'),
      ])
      if (cancelled) return
      if (defRes.error || !defRes.data || itemsRes.error) { setLoadError(true); setLoading(false); return }
      setDefinition(defRes.data as AssessmentDefinition)
      setItems((itemsRes.data ?? []) as AssessmentItem[])
      // Restore progress from a previous in-session attempt.
      try {
        const raw = localStorage.getItem(storageKey)
        if (raw) {
          const saved = JSON.parse(raw)
          if (saved?.answers) setAnswers(saved.answers)
          if (typeof saved?.index === 'number') setIndex(Math.min(saved.index, (itemsRes.data?.length ?? 1) - 1))
        }
      } catch {}
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [definitionId, storageKey, supabase])

  useEffect(() => {
    if (loading) return
    try { localStorage.setItem(storageKey, JSON.stringify({ answers, index })) } catch {}
  }, [answers, index, loading, storageKey])

  const total = items.length
  const answeredCount = Object.keys(answers).length
  const allAnswered = total > 0 && answeredCount >= total
  const currentItem = items[index]

  function selectOption(opt: { value: number; label_en: string; label_ar: string }) {
    if (!currentItem) return
    setAnswers(prev => ({ ...prev, [currentItem.id]: { value: opt.value, label_en: opt.label_en, label_ar: opt.label_ar } }))
    // Auto-advance to the next unanswered question for a smooth flow.
    setTimeout(() => setIndex(i => Math.min(i + 1, total - 1)), 150)
  }

  async function handleSubmit() {
    if (!definition) return
    setError(null)
    if (!gender) { setError(tr('Please select your gender.', 'يرجى اختيار الجنس.')); return }
    if (!country) { setError(tr('Please select your country.', 'يرجى اختيار الدولة.')); return }
    setSubmitting(true)
    try {
      const responses = items
        .filter(it => answers[it.id] !== undefined)
        .map(it => ({ item_id: it.id, value: answers[it.id].value }))
      const res = await fetch('/api/submit-assessment-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          definition_id: definition.id,
          responses,
          demographics: {
            gender,
            country,
            ...(dob ? { dob } : {}),
            ...(marital ? { marital } : {}),
            ...(education ? { education } : {}),
          },
          ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || tr('Could not submit your assessment. Please try again.', 'تعذّر إرسال التقييم. حاول مرة أخرى.'))
        setSubmitting(false)
        return
      }
      try { localStorage.removeItem(storageKey) } catch {}
      setResult(data as ResultShape)
      if (typeof data.claim_token === 'string') {
        try {
          const existing: string[] = JSON.parse(localStorage.getItem(GUEST_CLAIM_STORAGE_KEY) || '[]')
          const next = Array.from(new Set([...existing, data.claim_token])).slice(-10)
          localStorage.setItem(GUEST_CLAIM_STORAGE_KEY, JSON.stringify(next))
        } catch {}
      }
      setPhase('result')
    } catch {
      setError(tr('Network error. Please try again.', 'خطأ في الشبكة. حاول مرة أخرى.'))
      setSubmitting(false)
    }
  }

  const Header = (
    <header className="sticky top-0 z-40 safe-top safe-x" style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0 no-underline">
          <BrandLogo variant="icon" size={30} />
          <span className="text-base font-extrabold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>V Welfare</span>
        </Link>
        <div className="flex items-center gap-1.5 ms-auto">
          <DarkModeToggle />
          <LanguageToggle lang={lang} />
          <Link href="/register" className="hidden sm:inline-flex btn-accent">{tr('Create account', 'إنشاء حساب')}</Link>
        </div>
      </div>
    </header>
  )

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
        {Header}
        <div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--vw-blue)' }} /></div>
      </div>
    )
  }

  if (loadError || !definition) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
        {Header}
        <div className="max-w-md mx-auto text-center py-24 px-6">
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{tr('Assessment unavailable', 'التقييم غير متاح')}</p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{tr('This assessment could not be loaded.', 'تعذّر تحميل هذا التقييم.')}</p>
          <Link href="/" className="btn-accent">{tr('Back to home', 'العودة للرئيسية')}</Link>
        </div>
      </div>
    )
  }

  const defName = isAr && definition.name_ar ? definition.name_ar : definition.name_en

  if (phase === 'result' && result) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
        {Header}
        <div className="max-w-3xl mx-auto">
          <div className="mx-4 mt-6 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3" style={{ background: '#EAF2F9', border: '1px solid #C7DFF0' }}>
            <p className="text-[13.5px]" style={{ color: '#12273C' }}>
              {tr(
                'Create a free account to claim this result into your timeline and keep exploring yourself over time.',
                'أنشئ حساباً مجانياً لنقل هذه النتيجة إلى خطّك الزمني ومواصلة اكتشاف نفسك مع الوقت.'
              )}
            </p>
            <Link href="/register?next=/dashboard" className="btn-accent whitespace-nowrap gap-2">{tr('Create account', 'إنشاء حساب')}<ArrowRight className="w-4 h-4" /></Link>
          </div>
          <AssessmentResultView
            lang={lang}
            definition={definition}
            score={result.score}
            bandEn={result.band_en ?? ''}
            bandAr={result.band_ar ?? ''}
            highRisk={result.high_risk}
            submittedAt={new Date().toISOString()}
            patientNames={{ en: '', ar: null }}
            showNavLinks={false}
          />
        </div>
      </div>
    )
  }

  if (phase === 'demographics') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
        {Header}
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-10">
          <h1 className="text-2xl font-extrabold mb-1" style={{ color: 'var(--text-primary)' }}>{tr('A few details', 'بعض التفاصيل')}</h1>
          <p className="text-[14px] mb-6" style={{ color: 'var(--text-secondary)' }}>
            {tr('This helps contextualise your result. Your responses are anonymous.', 'يساعدنا هذا في فهم نتيجتك ضمن سياقها. إجاباتك مجهولة الهوية.')}
          </p>

          {error && <div className="alert-error mb-5 text-[14px]">{error}</div>}

          <div className="space-y-4">
            <div>
              <label className="label">{tr('Gender', 'الجنس')} *</label>
              <div className="field-wrapper"><select className="w-full bg-transparent outline-none" value={gender} onChange={e => setGender(e.target.value)}>
                <option value="">{tr('Select…', 'اختر…')}</option>
                {GENDERS.map(g => <option key={g} value={g}>{LABELS.gender[g][isAr ? 1 : 0]}</option>)}
              </select></div>
            </div>
            <div>
              <label className="label">{tr('Country', 'الدولة')} *</label>
              <div className="field-wrapper"><select className="w-full bg-transparent outline-none" value={country} onChange={e => setCountry(e.target.value)}>
                <option value="">{tr('Select…', 'اختر…')}</option>
                {COUNTRIES.map(c => <option key={c.value} value={c.value}>{isAr ? c.ar : c.en}</option>)}
              </select></div>
            </div>
            <div>
              <label className="label">{tr('Date of birth (optional)', 'تاريخ الميلاد (اختياري)')}</label>
              <div className="field-wrapper"><input type="date" className="w-full bg-transparent outline-none" value={dob} max={new Date().toISOString().slice(0, 10)} onChange={e => setDob(e.target.value)} /></div>
            </div>
            <div>
              <label className="label">{tr('Marital status (optional)', 'الحالة الاجتماعية (اختياري)')}</label>
              <div className="field-wrapper"><select className="w-full bg-transparent outline-none" value={marital} onChange={e => setMarital(e.target.value)}>
                <option value="">{tr('Select…', 'اختر…')}</option>
                {MARITALS.map(m => <option key={m} value={m}>{LABELS.marital[m][isAr ? 1 : 0]}</option>)}
              </select></div>
            </div>
            <div>
              <label className="label">{tr('Education (optional)', 'التعليم (اختياري)')}</label>
              <div className="field-wrapper"><select className="w-full bg-transparent outline-none" value={education} onChange={e => setEducation(e.target.value)}>
                <option value="">{tr('Select…', 'اختر…')}</option>
                {EDUCATIONS.map(ed => <option key={ed} value={ed}>{LABELS.education[ed][isAr ? 1 : 0]}</option>)}
              </select></div>
            </div>

            <div className="flex justify-center"><TurnstileWidget onToken={setTurnstileToken} onError={() => setTurnstileToken(null)} onExpire={() => setTurnstileToken(null)} language={isAr ? 'ar' : 'en'} /></div>

            <div className="flex items-center gap-3 pt-2">
              <button type="button" className="btn-ghost gap-1.5" onClick={() => setPhase('questions')} disabled={submitting}>
                <ChevronLeft className="w-4 h-4" />{tr('Back', 'رجوع')}
              </button>
              <button type="button" className="btn-accent flex-1 gap-2" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {submitting ? tr('Submitting…', 'جارٍ الإرسال…') : tr('See my result', 'عرض نتيجتي')}
              </button>
            </div>
            <p className="text-[11.5px] text-center pt-1" style={{ color: 'var(--text-muted)' }}>
              {tr('This is a screening tool, not a diagnosis.', 'هذه أداة فحص وليست تشخيصاً.')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // phase === 'questions'
  const progressPct = total > 0 ? Math.round((answeredCount / total) * 100) : 0
  const options = (currentItem?.response_options ?? []) as { value: number; label_en: string; label_ar: string }[]
  const selected = currentItem ? answers[currentItem.id] : undefined

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
      {Header}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <p className="text-[12px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--vw-blue)' }}>{defName}</p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{tr('Question', 'سؤال')} {Math.min(index + 1, total)} / {total}</span>
            <span className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{progressPct}%</span>
          </div>
          <div className="progress-track"><div className="progress-fill transition-all" style={{ width: `${progressPct}%`, backgroundColor: 'var(--vw-blue)' }} /></div>
        </div>

        {currentItem && (
          <div className="card p-6 sm:p-8">
            <p className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
              {isAr && currentItem.question_ar ? currentItem.question_ar : currentItem.question_en}
            </p>
            <div className="space-y-2.5">
              {options.map(opt => {
                const isSel = selected?.value === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => selectOption(opt)}
                    className="w-full text-start px-4 py-3 rounded-xl border-2 transition-colors"
                    style={isSel
                      ? { borderColor: 'var(--vw-blue)', backgroundColor: '#EAF2F9', color: '#12273C' }
                      : { borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    {isAr ? opt.label_ar : opt.label_en}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-6">
          <button type="button" className="btn-ghost gap-1.5" onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={index === 0}>
            <ChevronLeft className="w-4 h-4" />{tr('Previous', 'السابق')}
          </button>
          {index < total - 1 ? (
            <button type="button" className="btn-secondary gap-1.5" onClick={() => setIndex(i => Math.min(total - 1, i + 1))}>
              {tr('Next', 'التالي')}<ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" className="btn-accent gap-1.5" onClick={() => setPhase('demographics')} disabled={!allAnswered}>
              {tr('Continue', 'متابعة')}<ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        {!allAnswered && index === total - 1 && (
          <p className="text-[12.5px] text-center mt-3" style={{ color: 'var(--text-muted)' }}>
            {tr('Please answer all questions to continue.', 'يرجى الإجابة على جميع الأسئلة للمتابعة.')}
          </p>
        )}
      </div>
    </div>
  )
}
