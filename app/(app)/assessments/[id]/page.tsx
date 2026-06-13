'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle,
  LogIn, BookOpen, FlaskConical, ArrowRight, Brain,
  UserPlus, Lock, ChevronDown,
} from 'lucide-react'
import type { AssessmentDefinition, AssessmentItem, ResponseOption } from '@/lib/types'
import { getAssessmentContent, getBandContent, IPIP_DOMAINS, getIpipDomainLevel } from '@/lib/assessment-content'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'
import DemographicsCard from '@/components/demographics-card'
import { COUNTRIES } from '@/lib/countries'

function severityColor(band: string) {
  const b = band.toLowerCase()
  if (b.includes('minimal') || b.includes('none') || b.includes('normal') || b.includes('low') || b.includes('negative') || b.includes('below') || b.includes('no ')) return 'text-green-700 bg-green-50 border-green-200'
  if (b.includes('mild') || b.includes('subthreshold') || b.includes('moderate risk')) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
  if (b.includes('moderate') || b.includes('possible')) return 'text-orange-700 bg-orange-50 border-orange-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

const MARITAL_OPTIONS = [
  { value: 'single',   en: 'Single',   ar: 'أعزب / عزباء' },
  { value: 'married',  en: 'Married',  ar: 'متزوج / متزوجة' },
  { value: 'divorced', en: 'Divorced', ar: 'مطلق / مطلقة' },
  { value: 'widowed',  en: 'Widowed',  ar: 'أرمل / أرملة' },
]

const EDUCATION_OPTIONS = [
  { value: 'none',      en: 'No formal education',  ar: 'بدون تعليم رسمي' },
  { value: 'primary',   en: 'Primary school',        ar: 'المرحلة الابتدائية' },
  { value: 'secondary', en: 'Secondary school',      ar: 'المرحلة الثانوية' },
  { value: 'diploma',   en: 'Diploma / Certificate', ar: 'دبلوم / شهادة' },
  { value: 'bachelor',  en: "Bachelor's degree",     ar: 'بكالوريوس' },
  { value: 'master',    en: "Master's degree",       ar: 'ماجستير' },
  { value: 'phd',       en: 'PhD / Doctorate',       ar: 'دكتوراه' },
  { value: 'other',     en: 'Other',                 ar: 'أخرى' },
]

interface GuestDemographics {
  dob: string
  gender: string
  marital: string
  education: string
  country: string
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

export default function TakeAssessmentPage() {
  const { id } = useParams()
  const supabase = createClient()
  const lang = useLang()

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
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
  const [hasSavedProgress, setHasSavedProgress] = useState(false)
  const [guestDemographics, setGuestDemographics] = useState<GuestDemographics | null>(null)
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [guestDob, setGuestDob] = useState('')
  const [guestGender, setGuestGender] = useState('')
  const [guestMarital, setGuestMarital] = useState('')
  const [guestEducation, setGuestEducation] = useState('')
  const [guestCountry, setGuestCountry] = useState('')
  const [guestFormError, setGuestFormError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  // Include userId to prevent cross-user data leaks on shared devices
  const storageKey = `vw_assessment_${id}_${userId ?? 'guest'}`

  // Persist answers to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(answers).length === 0) return
    try {
      localStorage.setItem(storageKey, JSON.stringify({ answers, currentIndex }))
    } catch {}
  }, [answers, currentIndex, storageKey])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
      setUserId(user?.id ?? null)
      const [defRes, itemsRes] = await Promise.all([
        supabase.from('assessment_definitions').select('*').eq('id', id).single(),
        supabase.from('assessment_items').select('*').eq('definition_id', id).order('item_number'),
      ])
      if (defRes.data) setDefinition(defRes.data as AssessmentDefinition)
      if (itemsRes.data) setItems(itemsRes.data as AssessmentItem[])

      // Restore saved progress — key is scoped to user to prevent cross-user leaks
      try {
        const key = `vw_assessment_${id}_${user?.id ?? 'guest'}`
        const saved = localStorage.getItem(key)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.answers && Object.keys(parsed.answers).length > 0) {
            setHasSavedProgress(true)
          }
        }
      } catch {}
    }
    load()
  }, [id])

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

    // IPIP-120 domain breakdown is display-only — compute on client before submit
    if (definition.code === 'IPIP120') {
      const scores: Record<string, number> = { N: 0, E: 0, O: 0, A: 0, C: 0 }
      items.forEach(item => {
        const domain = item.subscale?.charAt(0)
        if (domain && domain in scores) scores[domain] += answers[item.id]?.value ?? 0
      })
      setDomainScores(scores)
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Server-side scoring: send raw item responses, let server validate + calculate
      const responsePayload = items
        .filter(item => answers[item.id] !== undefined)
        .map(item => ({ item_id: item.id, value: answers[item.id].value }))

      const res = await fetch('/api/submit-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ definition_id: definition.id, responses: responsePayload }),
      })

      if (!res.ok) {
        setError(t('assessment.save_error', lang))
        setSubmitting(false)
        return
      }

      const data = await res.json()

      // Notify admins if high-risk (fire-and-forget)
      if (data.high_risk) {
        fetch('/api/notify-high-risk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submission_id: data.submission_id,
            assessment_name: definition.name_en,
            assessment_name_ar: definition.name_ar,
          }),
        }).catch(() => {})
      }

      // Clear saved progress on successful submission
      try { localStorage.removeItem(storageKey) } catch {}

      setResult({
        score: data.score,
        band_en: data.band_en,
        band_ar: data.band_ar,
        high_risk: data.high_risk,
      })
      setSubmitted(true)
      setSubmitting(false)
      await loadRelated(definition.code)
      return
    }

    // Guest path — submit with demographics for anonymous statistical recording
    if (guestDemographics) {
      const responsePayload = items
        .filter(item => answers[item.id] !== undefined)
        .map(item => ({ item_id: item.id, value: answers[item.id].value }))

      const res = await fetch('/api/submit-assessment-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ definition_id: definition.id, responses: responsePayload, demographics: guestDemographics }),
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
  }

  if (!definition || items.length === 0 || isLoggedIn === null) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">{t('assessment.loading', lang)}</p>
        </div>
      </div>
    )
  }

  if (isLoggedIn === false && guestDemographics === null) {
    const defName = lang === 'ar' && definition.name_ar ? definition.name_ar : definition.name_en
    const defDesc = lang === 'ar' && definition.description_ar ? definition.description_ar : definition.description_en
    const returnUrl = `/assessments/${id}`
    const isAr = lang === 'ar'

    const handleGuestContinue = () => {
      if (!guestGender || !guestCountry) {
        setGuestFormError(isAr ? 'يرجى تعبئة الجنس والبلد على الأقل' : 'Please fill in at least gender and country')
        return
      }
      setGuestFormError('')
      setGuestDemographics({ dob: guestDob, gender: guestGender, marital: guestMarital, education: guestEducation, country: guestCountry })
    }

    return (
      <div className="py-8 px-4 max-w-lg mx-auto space-y-4">
        {/* Assessment intro */}
        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-brand-600" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-1">{defName}</h1>
          {defDesc && <p className="text-sm text-gray-500 mb-2 leading-relaxed">{defDesc}</p>}
          <p className="text-xs text-gray-400">{definition.total_questions} {t('assessments.questions', lang)}</p>
        </div>

        {/* Option A — Sign in / Register */}
        <div className="card p-5">
          <p className="text-sm font-semibold text-gray-800 mb-3">
            {isAr ? 'لديك حساب؟ سجّل الدخول لحفظ نتائجك ومتابعتها.' : 'Have an account? Sign in to save and track your results.'}
          </p>
          <div className="flex gap-3">
            <Link href={`/login?next=${encodeURIComponent(returnUrl)}`}
              className="flex-1 btn-primary gap-2 justify-center flex items-center text-sm">
              <LogIn className="w-4 h-4" />
              {t('auth.login.submit', lang)}
            </Link>
            <Link href={`/register?next=${encodeURIComponent(returnUrl)}`}
              className="flex-1 btn-secondary gap-2 justify-center flex items-center text-sm">
              <UserPlus className="w-4 h-4" />
              {isAr ? 'إنشاء حساب' : 'Register'}
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">{isAr ? 'أو' : 'OR'}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Option B — Guest with demographics */}
        <div className="card p-5">
          <button
            onClick={() => setShowGuestForm(v => !v)}
            className="w-full flex items-center justify-between text-sm font-semibold text-gray-800"
          >
            <span>{isAr ? 'المتابعة كزائر (مع إدخال بيانات مختصرة)' : 'Continue as guest (enter basic info)'}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showGuestForm ? 'rotate-180' : ''}`} />
          </button>
          <p className="text-xs text-gray-400 mt-1">
            {isAr
              ? 'تُستخدم بياناتك بشكل مجهول للأغراض الإحصائية فقط.'
              : 'Your data is used anonymously for statistical purposes only.'}
          </p>

          {showGuestForm && (
            <div className="mt-4 space-y-3">
              {guestFormError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{guestFormError}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t('profile.dob', lang)}</label>
                  <input type="date" className="input" value={guestDob} onChange={e => setGuestDob(e.target.value)}
                    max={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="label">{t('profile.gender', lang)} *</label>
                  <select className="input" value={guestGender} onChange={e => setGuestGender(e.target.value)}>
                    <option value="">{t('profile.gender.select', lang)}</option>
                    <option value="male">{t('profile.gender.male', lang)}</option>
                    <option value="female">{t('profile.gender.female', lang)}</option>
                  </select>
                </div>
                <div>
                  <label className="label">{t('profile.marital', lang)}</label>
                  <select className="input" value={guestMarital} onChange={e => setGuestMarital(e.target.value)}>
                    <option value="">{t('profile.marital.select', lang)}</option>
                    {MARITAL_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{isAr ? o.ar : o.en}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">{t('profile.education', lang)}</label>
                  <select className="input" value={guestEducation} onChange={e => setGuestEducation(e.target.value)}>
                    <option value="">{t('profile.education.select', lang)}</option>
                    {EDUCATION_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{isAr ? o.ar : o.en}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label">{t('profile.country', lang)} *</label>
                  <select className="input" value={guestCountry} onChange={e => setGuestCountry(e.target.value)}>
                    <option value="">{t('profile.country.ph', lang)}</option>
                    {COUNTRIES.map(c => (
                      <option key={c.value} value={c.value}>{isAr ? c.ar : c.en}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={handleGuestContinue} className="btn-primary w-full mt-1">
                {isAr ? 'ابدأ التقييم' : 'Start Assessment'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (submitted && result) {
    const isHighRisk = result.high_risk
    const assessmentContent = getAssessmentContent(definition.code)
    const bandContent = getBandContent(definition.code, result.band_en)
    const displayBand = lang === 'ar' ? result.band_ar : result.band_en
    const isPositive = result.band_en.toLowerCase().includes('minimal') || result.band_en.toLowerCase().includes('none') || result.band_en.toLowerCase().includes('normal') || result.band_en.toLowerCase().includes('low risk') || result.band_en.toLowerCase().includes('below') || result.band_en.toLowerCase().includes('no problem')
    const defName = lang === 'ar' && definition.name_ar ? definition.name_ar : definition.name_en

    return (
      <div className="py-8 px-4 max-w-3xl mx-auto space-y-6">

        {/* Score Card */}
        <div className="card p-8 text-center">
          {isHighRisk ? (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          ) : (
            <div className={`w-16 h-16 ${isPositive ? 'bg-green-100' : 'bg-orange-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <CheckCircle2 className={`w-8 h-8 ${isPositive ? 'text-green-600' : 'text-orange-500'}`} />
            </div>
          )}
          <h2 className="text-xl font-bold text-gray-900 mb-1">{t('assessment.result.score', lang)}</h2>
          <p className="text-sm text-gray-500 mb-6">{defName}</p>
          <div className="bg-gray-50 rounded-xl p-6 mb-4 inline-block min-w-48">
            <p className="text-5xl font-bold text-gray-900 mb-1">{result.score}</p>
            <p className={`text-xs text-gray-400 mb-3 ${lang === 'ar' ? '' : 'uppercase tracking-wide'}`}>{t('assessment.result.score', lang)}</p>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${severityColor(result.band_en)}`}>
              {displayBand}
            </span>
          </div>

          {isHighRisk && (
            <div className={`mt-4 p-4 bg-red-50 border border-red-200 rounded-xl ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
              <p className="text-sm font-semibold text-red-700 mb-1">⚠ {t('assessment.high_risk_note', lang)}</p>
              <p className="text-sm text-red-600">{t('assessment.result.high_risk', lang)}</p>
            </div>
          )}

          {isLoggedIn ? (
            <p className="mt-4 text-sm text-green-600 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> {t('assessment.result.saved', lang)}
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              <p className="text-xs text-gray-500">
                {lang === 'ar'
                  ? 'تم تسجيل نتيجتك بشكل مجهول. أنشئ حسابًا لتتبع نتائجك عبر الزمن.'
                  : 'Your result was recorded anonymously. Create an account to track your results over time.'}
              </p>
              <div className="flex gap-2 justify-center">
                <Link href={`/register?next=/assessments/${id}`} className="btn-primary text-xs px-3 py-2 gap-1.5 flex items-center">
                  <UserPlus className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'إنشاء حساب' : 'Create Account'}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Demographics collection */}
        <DemographicsCard isLoggedIn={!!isLoggedIn} lang={lang} />


        {/* IPIP-NEO Domain Scores */}
        {definition.code === 'IPIP120' && domainScores && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-brand-600" />
              <h3 className="text-base font-semibold text-gray-900">Your Personality Profile</h3>
            </div>
            <p className="text-xs text-gray-400 mb-5">Scores range 24–120 per domain. Low &lt;65 · Average 65–88 · High &gt;88</p>
            <div className="space-y-4">
              {Object.entries(IPIP_DOMAINS).map(([key, info]) => {
                const score = domainScores[key] ?? 0
                const level = getIpipDomainLevel(score)
                const pct = Math.round(((score - 24) / 96) * 100)
                const desc = lang === 'ar' ? info[`${level}_ar`] : info[level]
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{lang === 'ar' ? info.label_ar : info.label}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${info.color}`}>{level}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-700">{score}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mb-1.5">
                      <div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* About This Assessment */}
        {assessmentContent && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-brand-600" />
              <h3 className="text-base font-semibold text-gray-900">{t('assessment.result.about', lang)}</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">{assessmentContent.overview}</p>
            <p className="text-xs text-gray-400">
              <span className="font-medium">{t('assessment.result.measures', lang)}:</span> {assessmentContent.measuresDomain}
            </p>
          </div>
        )}

        {/* Scientific Explanation */}
        {bandContent && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <FlaskConical className="w-4 h-4 text-brand-600" />
              <h3 className="text-base font-semibold text-gray-900">
                {t('assessment.result.what_means', lang)} —{' '}
                <span className={`text-sm font-medium px-2 py-0.5 rounded-full border ${severityColor(result.band_en)}`}>{displayBand}</span>
              </h3>
            </div>

            <p className="text-sm text-gray-700 leading-relaxed mb-5">{bandContent.explanation}</p>

            {bandContent.whatThisMeans.length > 0 && (
              <div className="mb-5">
                <p className={`text-xs font-semibold text-gray-500 mb-2 ${lang === 'ar' ? '' : 'uppercase tracking-wide'}`}>{t('assessment.result.key_points', lang)}</p>
                <ul className="space-y-2">
                  {bandContent.whatThisMeans.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0 mt-2" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {bandContent.recommendations.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className={`text-xs font-semibold text-blue-700 mb-2 ${lang === 'ar' ? '' : 'uppercase tracking-wide'}`}>{t('assessment.result.recommendations', lang)}</p>
                <ul className="space-y-2">
                  {bandContent.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Related Disorders */}
        {bandContent && bandContent.relatedDisorders.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-brand-600" />
              <h3 className="text-base font-semibold text-gray-900">{t('assessment.result.related_conditions', lang)}</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">{t('assessment.result.clinician_note', lang)}</p>
            <div className="space-y-3">
              {bandContent.relatedDisorders.map((disorder, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="w-2 h-2 rounded-full bg-brand-400 flex-shrink-0 mt-1.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{disorder.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{disorder.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Assessments */}
        {relatedAssessments.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRight className="w-4 h-4 text-brand-600" />
              <h3 className="text-base font-semibold text-gray-900">{t('assessment.result.related_assessments', lang)}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {relatedAssessments.map((ra) => {
                const raName = lang === 'ar' && ra.name_ar ? ra.name_ar : ra.name_en
                const raDesc = lang === 'ar' && ra.description_ar ? ra.description_ar : ra.description_en
                return (
                  <Link
                    key={ra.id}
                    href={`/assessments/${ra.id}`}
                    className="p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-brand-600 uppercase tracking-wide">{ra.code}</span>
                      <span className="text-xs text-gray-400">{ra.total_questions}{t('assessments.questions', lang)}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-brand-800 leading-snug">{raName}</p>
                    {raDesc && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{raDesc}</p>
                    )}
                    <p className="text-xs text-brand-600 mt-2 font-medium">{t('assessment.result.take', lang)} →</p>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center pb-8">
          <Link href="/assessments" className="btn-secondary">{t('nav.assessments', lang)}</Link>
          {isLoggedIn && <Link href="/dashboard" className="btn-primary">{t('nav.dashboard', lang)}</Link>}
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
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{defName}</h1>
          </div>
          <span className="text-sm text-gray-400">{currentIndex + 1} {t('assessment.of', lang)} {items.length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-brand-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

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
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <div className="card p-8 mb-6">
        <p className={`text-gray-500 text-xs font-medium mb-3 ${lang === 'ar' ? '' : 'uppercase tracking-wide'}`}>
          {t('assessment.question', lang)} {currentIndex + 1}
        </p>
        <h2 className={`text-lg font-medium text-gray-900 mb-6 ${lang === 'ar' ? 'leading-loose text-right' : 'leading-relaxed'}`}>{question}</h2>
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
                className={`w-full p-4 rounded-lg border-2 transition-all ${lang === 'ar' ? 'text-right' : 'text-left'} ${
                  currentAnswer?.value === opt.value
                    ? 'border-brand-500 bg-brand-50 text-brand-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${lang === 'ar' ? 'ml-3' : 'mr-3'} ${
                  currentAnswer?.value === opt.value ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
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
            disabled={!allAnswered || submitting}
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
