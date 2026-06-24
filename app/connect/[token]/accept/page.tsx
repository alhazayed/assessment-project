'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, CheckSquare, Square, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'

type Lang = 'ar' | 'en'

const PERMISSION_LABELS: Record<string, { en: string; ar: string }> = {
  view_profile:            { en: 'Your profile information',         ar: 'معلومات ملفك الشخصي' },
  view_assessment_results: { en: 'Your assessment results',          ar: 'نتائج تقييماتك' },
  view_assessment_history: { en: 'Your full assessment history',     ar: 'سجل تقييماتك الكامل' },
  view_reports:            { en: 'Your clinical reports',            ar: 'تقاريرك السريرية' },
  view_progress_tracking:  { en: 'Your progress over time',          ar: 'تقدمك عبر الزمن' },
  view_mood_tracking:      { en: 'Your mood logs',                   ar: 'سجلات مزاجك' },
  export_reports:          { en: 'Export your reports',              ar: 'تصدير تقاريرك' },
  message_patient:         { en: 'Send you secure messages',         ar: 'إرسال رسائل آمنة إليك' },
  upload_documents:        { en: 'Upload documents to your profile', ar: 'رفع مستندات إلى ملفك' },
  generate_clinical_notes: { en: 'Create clinical notes',            ar: 'إنشاء ملاحظات سريرية' },
}

const T = {
  en: {
    title: 'Accept Invitation',
    subtitle: 'Review and confirm which permissions you grant to this clinician.',
    selectPerms: 'Select permissions to grant',
    accept: 'Accept Access',
    accepting: 'Accepting…',
    decline: 'Decline',
    notice: 'You can modify or revoke these permissions at any time from your Clinicians dashboard.',
    errExpired: 'This invitation has expired or is no longer valid.',
    errAuth: 'You must be signed in as a patient to accept this invitation.',
    errAlready: 'You already have a relationship with this clinician.',
    success: 'Invitation accepted. You can now manage this clinician from your dashboard.',
    signIn: 'Sign in to continue',
  },
  ar: {
    title: 'قبول الدعوة',
    subtitle: 'راجع وأكد الأذونات التي تمنحها لهذا الطبيب.',
    selectPerms: 'اختر الأذونات التي تمنحها',
    accept: 'قبول الوصول',
    accepting: 'جارٍ القبول…',
    decline: 'رفض',
    notice: 'يمكنك تعديل هذه الأذونات أو سحبها في أي وقت من لوحة الأطباء.',
    errExpired: 'انتهت صلاحية هذه الدعوة أو لم تعد صالحة.',
    errAuth: 'يجب تسجيل الدخول كمريض لقبول هذه الدعوة.',
    errAlready: 'لديك بالفعل علاقة مع هذا الطبيب.',
    success: 'تم قبول الدعوة. يمكنك الآن إدارة هذا الطبيب من لوحة التحكم.',
    signIn: 'سجّل الدخول للمتابعة',
  },
}

interface InvitationPreview {
  clinician_name: string | null
  specialty: string | null
  organization: string | null
  requested_permissions: string[]
  expires_at: string
}

export default function AcceptInvitationPage() {
  const params = useParams()
  const router = useRouter()
  const token = params?.token as string

  const [lang, setLang] = useState<Lang>('ar')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null)
  const [granted, setGranted] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [authed, setAuthed] = useState(false)

  const t = T[lang]

  useEffect(() => {
    const saved = localStorage.getItem('vw-lang')
    if (saved === 'en' || saved === 'ar') setLang(saved)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.replace(`/auth/login?redirect=/connect/${token}/accept`)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'patient') {
      setError(t.errAuth)
      setLoading(false)
      return
    }

    setAuthed(true)

    const res = await fetch(`/api/connect/${token}`)
    if (res.status === 404 || res.status === 410) {
      setError(t.errExpired)
      setLoading(false)
      return
    }
    if (!res.ok) {
      setError(t.errExpired)
      setLoading(false)
      return
    }

    const json = await res.json()
    const inv: InvitationPreview = json.invitation
    setInvitation(inv)
    setGranted(new Set(inv.requested_permissions))
    setLoading(false)
  }, [token, router, t.errAuth, t.errExpired])

  useEffect(() => { loadData() }, [loadData])

  function togglePermission(key: string) {
    setGranted(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleAccept() {
    if (!invitation) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/connect/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granted_permissions: Array.from(granted) }),
      })
      if (res.status === 409) {
        setError(t.errAlready)
        setSubmitting(false)
        return
      }
      if (res.status === 404 || res.status === 410) {
        setError(t.errExpired)
        setSubmitting(false)
        return
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'Something went wrong.')
        setSubmitting(false)
        return
      }
      setDone(true)
      setTimeout(() => router.push('/patient/clinicians'), 1500)
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700 dark:text-gray-300 mb-6">{error}</p>
          {!authed && (
            <a href={`/auth/login?redirect=/connect/${token}/accept`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors">
              {t.signIn} <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow p-8 text-center">
          <ShieldCheck className="w-14 h-14 text-teal-500 mx-auto mb-4" />
          <p className="text-gray-700 dark:text-gray-300">{t.success}</p>
        </div>
      </div>
    )
  }

  if (!invitation) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-lg w-full">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-teal-600 px-8 py-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-white" />
              <div>
                <h1 className="text-xl font-bold text-white">{t.title}</h1>
                <p className="text-teal-100 text-sm mt-0.5">{t.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {/* Clinician info */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-1">
              <p className="font-semibold text-gray-900 dark:text-white">
                {invitation.clinician_name ?? '—'}
              </p>
              {invitation.specialty && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{invitation.specialty}</p>
              )}
              {invitation.organization && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{invitation.organization}</p>
              )}
            </div>

            {/* Permissions */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t.selectPerms}</p>
              <div className="space-y-2">
                {invitation.requested_permissions.map(key => {
                  const label = PERMISSION_LABELS[key]
                  const isGranted = granted.has(key)
                  return (
                    <button
                      key={key}
                      onClick={() => togglePermission(key)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm text-left transition-colors
                        ${isGranted
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}
                    >
                      {isGranted
                        ? <CheckSquare className="w-4 h-4 flex-shrink-0 text-teal-500" />
                        : <Square className="w-4 h-4 flex-shrink-0 text-gray-400" />}
                      {label ? (lang === 'ar' ? label.ar : label.en) : key}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Notice */}
            <p className="text-xs text-gray-500 dark:text-gray-400">{t.notice}</p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                disabled={submitting || granted.size === 0}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" />{t.accepting}</>
                  : <>{t.accept} <ArrowRight className="w-4 h-4" /></>}
              </button>
              <button
                onClick={() => router.back()}
                className="px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {t.decline}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
