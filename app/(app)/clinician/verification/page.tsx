'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Shield,
  User,
  Briefcase,
  Hash,
  MapPin,
  Stethoscope,
  Building2,
  FileText,
  RefreshCw,
  Send,
} from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { COUNTRIES } from '@/lib/countries'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VerificationStatus =
  | 'not_submitted'
  | 'pending_verification'
  | 'verified'
  | 'rejected'
  | 'suspended'

interface VerificationRecord {
  clinician_id: string
  status: VerificationStatus
  full_name: string
  professional_title: string
  license_number: string
  country: string
  specialty: string
  organization: string
  document_urls?: string[]
  rejection_reason?: string | null
  reviewed_at?: string | null
  updated_at?: string | null
  created_at?: string | null
}

interface FormData {
  full_name: string
  professional_title: string
  license_number: string
  country: string
  specialty: string
  organization: string
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const SPECIALTIES: { value: string; en: string; ar: string }[] = [
  { value: 'Clinical Psychology', en: 'Clinical Psychology', ar: 'علم النفس الإكلينيكي' },
  { value: 'Psychiatry', en: 'Psychiatry', ar: 'الطب النفسي' },
  { value: 'Counseling', en: 'Counseling', ar: 'الإرشاد النفسي' },
  { value: 'Social Work', en: 'Social Work', ar: 'الخدمة الاجتماعية' },
  { value: 'Neuropsychology', en: 'Neuropsychology', ar: 'علم النفس العصبي' },
  { value: 'Other', en: 'Other', ar: 'أخرى' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string | null | undefined, isAr: boolean): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function countryLabel(code: string, isAr: boolean): string {
  const found = COUNTRIES.find((c) => c.value === code)
  if (!found) return code
  return isAr ? found.ar : found.en
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: '1px solid var(--divider)' }}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-medium uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
        <p className="text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          {value || '—'}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ClinicianVerificationPage() {
  const lang = useLang()
  const isAr = lang === 'ar'

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [record, setRecord] = useState<VerificationRecord | null>(null)
  const [status, setStatus] = useState<VerificationStatus>('not_submitted')

  const [form, setForm] = useState<FormData>({
    full_name: '',
    professional_title: '',
    license_number: '',
    country: '',
    specialty: '',
    organization: '',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  // -------------------------------------------------------------------------
  // Fetch current verification status on mount
  // -------------------------------------------------------------------------

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/clinician/verification')
      if (res.status === 401) {
        setFetchError(isAr ? 'يرجى تسجيل الدخول أولاً.' : 'Please log in first.')
        setLoading(false)
        return
      }
      const data: VerificationRecord & { status: VerificationStatus } = await res.json()
      if (data.status === 'not_submitted') {
        setStatus('not_submitted')
        setRecord(null)
      } else {
        setStatus(data.status)
        setRecord(data)
        // Pre-fill form with existing data so resubmission is easy
        setForm({
          full_name: data.full_name ?? '',
          professional_title: data.professional_title ?? '',
          license_number: data.license_number ?? '',
          country: data.country ?? '',
          specialty: data.specialty ?? '',
          organization: data.organization ?? '',
        })
      }
    } catch {
      setFetchError(
        isAr
          ? 'تعذّر تحميل بيانات التحقق. يرجى تحديث الصفحة.'
          : 'Failed to load verification data. Please refresh.'
      )
    } finally {
      setLoading(false)
    }
  }, [isAr])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // -------------------------------------------------------------------------
  // Form helpers
  // -------------------------------------------------------------------------

  function setField<K extends keyof FormData>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormData, string>> = {}
    const req = (key: keyof FormData, msgEn: string, msgAr: string) => {
      if (!form[key].trim()) next[key] = isAr ? msgAr : msgEn
    }
    req('full_name', 'Full name is required.', 'الاسم الكامل مطلوب.')
    req('professional_title', 'Professional title is required.', 'اللقب المهني مطلوب.')
    req('license_number', 'License number is required.', 'رقم الترخيص مطلوب.')
    req('country', 'Country is required.', 'الدولة مطلوبة.')
    req('specialty', 'Specialty is required.', 'التخصص مطلوب.')
    req('organization', 'Organization is required.', 'المؤسسة مطلوبة.')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!validate()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/clinician/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.status === 429) {
        setSubmitError(
          isAr
            ? 'تجاوزت الحد المسموح به من المحاولات. يرجى المحاولة لاحقاً.'
            : 'Too many requests. Please try again later.'
        )
        return
      }

      if (res.status === 403) {
        setSubmitError(
          isAr
            ? 'غير مصرح لك بتقديم هذا الطلب. تأكد من أن حسابك مسجّل كأخصائي.'
            : 'Forbidden. Make sure your account has the clinician role.'
        )
        return
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setSubmitError(
          body.error ||
            (isAr ? 'تعذّر إرسال الطلب. يرجى المحاولة مرة أخرى.' : 'Submission failed. Please try again.')
        )
        return
      }

      const data: VerificationRecord = await res.json()
      setRecord(data)
      setStatus('pending_verification')
      setSubmitted(true)
    } catch {
      setSubmitError(
        isAr
          ? 'حدث خطأ في الاتصال. يرجى التحقق من اتصالك بالإنترنت.'
          : 'A network error occurred. Check your connection and try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // -------------------------------------------------------------------------
  // Allow resubmission from rejected state
  // -------------------------------------------------------------------------

  function handleResubmit() {
    setStatus('not_submitted')
    setSubmitError(null)
    setSubmitted(false)
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const pageTitle = isAr ? 'التحقق من الحساب المهني' : 'Professional Account Verification'
  const pageSubtitle = isAr
    ? 'قدّم وثائقك للحصول على شارة الأخصائي المعتمد'
    : 'Submit your credentials to receive a verified clinician badge'

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-7 max-w-2xl">
        <div className="mb-7">
          <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {pageTitle}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>{pageSubtitle}</p>
        </div>
        <div className="card p-8 flex items-center justify-center gap-3" style={{ color: 'var(--text-muted)' }}>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-[13.5px]">{isAr ? 'جارٍ التحميل…' : 'Loading…'}</span>
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="p-4 sm:p-6 lg:p-7 max-w-2xl">
        <div className="mb-7">
          <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {pageTitle}
          </h1>
        </div>
        <div className="card p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#C02A2A' }} />
          <p className="text-[13.5px]" style={{ color: 'var(--text-primary)' }}>{fetchError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-2xl" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Page header */}
      <div className="mb-7">
        <h1
          className="text-3xl font-extrabold tracking-tight mb-1"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
        >
          {pageTitle}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>{pageSubtitle}</p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* VERIFIED                                                            */}
      {/* ------------------------------------------------------------------ */}
      {status === 'verified' && record && (
        <div className="space-y-5">
          {/* Green verified badge */}
          <div
            className="card p-6 flex items-start gap-4"
            style={{ border: '1.5px solid #1B8A5A', background: '#F0FAF5' }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#1B8A5A' }}
            >
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p
                className="text-[15px] font-bold mb-1"
                style={{ color: '#1B8A5A' }}
              >
                {isAr ? 'حسابك موثّق' : 'Your account is verified'}
              </p>
              <p className="text-[13px]" style={{ color: '#1B8A5A', opacity: 0.85 }}>
                {isAr
                  ? 'تم التحقق من هويتك المهنية بنجاح. يمكنك الآن الوصول إلى جميع ميزات الأخصائيين.'
                  : 'Your professional identity has been confirmed. You now have full access to clinician features.'}
              </p>
              {record.reviewed_at && (
                <p className="text-[12px] mt-2" style={{ color: '#1B8A5A', opacity: 0.7 }}>
                  {isAr ? 'تاريخ التوثيق: ' : 'Verified on: '}
                  {fmtDate(record.reviewed_at, isAr)}
                </p>
              )}
            </div>
          </div>

          {/* Verification details */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4" style={{ color: '#1D6296' }} />
              <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
                {isAr ? 'بيانات التحقق' : 'Verification Details'}
              </h2>
            </div>
            <div>
              <SectionRow icon={User} label={isAr ? 'الاسم الكامل' : 'Full Name'} value={record.full_name} />
              <SectionRow icon={Briefcase} label={isAr ? 'اللقب المهني' : 'Professional Title'} value={record.professional_title} />
              <SectionRow icon={Hash} label={isAr ? 'رقم الترخيص' : 'License Number'} value={record.license_number} />
              <SectionRow icon={MapPin} label={isAr ? 'الدولة' : 'Country'} value={countryLabel(record.country, isAr)} />
              <SectionRow
                icon={Stethoscope}
                label={isAr ? 'التخصص' : 'Specialty'}
                value={isAr ? (SPECIALTIES.find((s) => s.value === record.specialty)?.ar ?? record.specialty) : record.specialty}
              />
              <SectionRow icon={Building2} label={isAr ? 'المؤسسة' : 'Organization'} value={record.organization} />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* PENDING                                                             */}
      {/* ------------------------------------------------------------------ */}
      {status === 'pending_verification' && record && (
        <div className="space-y-5">
          {/* Pending banner */}
          <div
            className="card p-6 flex items-start gap-4"
            style={{ border: '1.5px solid #B07A12', background: '#FFFBF0' }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#F3C94A' }}
            >
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[15px] font-bold mb-1" style={{ color: '#B07A12' }}>
                {isAr ? 'طلبك قيد المراجعة' : 'Your verification is under review'}
              </p>
              <p className="text-[13px]" style={{ color: '#B07A12', opacity: 0.85 }}>
                {isAr
                  ? 'سيقوم فريقنا بمراجعة بياناتك المهنية والرد عليك في أقرب وقت ممكن.'
                  : 'Our team is reviewing your professional credentials and will respond as soon as possible.'}
              </p>
              {record.updated_at && (
                <p className="text-[12px] mt-2" style={{ color: '#B07A12', opacity: 0.7 }}>
                  {isAr ? 'تاريخ التقديم: ' : 'Submitted on: '}
                  {fmtDate(record.updated_at, isAr)}
                </p>
              )}
            </div>
          </div>

          {/* Submitted details */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4" style={{ color: '#1D6296' }} />
              <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
                {isAr ? 'البيانات المقدّمة' : 'Submitted Details'}
              </h2>
            </div>
            <div>
              <SectionRow icon={User} label={isAr ? 'الاسم الكامل' : 'Full Name'} value={record.full_name} />
              <SectionRow icon={Briefcase} label={isAr ? 'اللقب المهني' : 'Professional Title'} value={record.professional_title} />
              <SectionRow icon={Hash} label={isAr ? 'رقم الترخيص' : 'License Number'} value={record.license_number} />
              <SectionRow icon={MapPin} label={isAr ? 'الدولة' : 'Country'} value={countryLabel(record.country, isAr)} />
              <SectionRow
                icon={Stethoscope}
                label={isAr ? 'التخصص' : 'Specialty'}
                value={isAr ? (SPECIALTIES.find((s) => s.value === record.specialty)?.ar ?? record.specialty) : record.specialty}
              />
              <SectionRow icon={Building2} label={isAr ? 'المؤسسة' : 'Organization'} value={record.organization} />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SUSPENDED                                                           */}
      {/* ------------------------------------------------------------------ */}
      {status === 'suspended' && (
        <div
          className="card p-6 flex items-start gap-4"
          style={{ border: '1.5px solid #6B7280', background: '#F9FAFB' }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#6B7280' }}
          >
            <XCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-[15px] font-bold mb-1" style={{ color: '#374151' }}>
              {isAr ? 'تم تعليق حسابك' : 'Account suspended'}
            </p>
            <p className="text-[13px]" style={{ color: '#6B7280' }}>
              {isAr
                ? 'تم تعليق وصولك إلى المنصة. يرجى التواصل مع فريق الدعم للمزيد من المعلومات.'
                : 'Your access to the platform has been suspended. Please contact support for more information.'}
            </p>
            <a
              href="mailto:support@vwelfare.com"
              className="inline-block mt-3 text-[12.5px] font-semibold underline"
              style={{ color: '#1D6296' }}
            >
              support@vwelfare.com
            </a>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* REJECTED — show reason + allow resubmission                        */}
      {/* ------------------------------------------------------------------ */}
      {status === 'rejected' && record && (
        <div className="space-y-5">
          {/* Rejection notice */}
          <div
            className="card p-6 flex items-start gap-4"
            style={{ border: '1.5px solid #C02A2A', background: '#FFF5F5' }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#C02A2A' }}
            >
              <XCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold mb-1" style={{ color: '#C02A2A' }}>
                {isAr ? 'تم رفض طلب التحقق' : 'Verification request rejected'}
              </p>
              {record.rejection_reason ? (
                <div
                  className="mt-2 rounded-xl p-3 text-[13px] leading-relaxed"
                  style={{ background: '#FEECEC', color: '#C02A2A' }}
                >
                  <span className="font-semibold">{isAr ? 'السبب: ' : 'Reason: '}</span>
                  {record.rejection_reason}
                </div>
              ) : (
                <p className="text-[13px]" style={{ color: '#C02A2A', opacity: 0.85 }}>
                  {isAr
                    ? 'لم يتم توضيح سبب الرفض. يرجى التواصل مع الدعم.'
                    : 'No reason was provided. Please contact support.'}
                </p>
              )}
              <button
                type="button"
                onClick={handleResubmit}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-opacity hover:opacity-80"
                style={{ background: '#C02A2A', color: '#fff' }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {isAr ? 'إعادة التقديم' : 'Resubmit application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* NOT SUBMITTED — show form (also used after clicking "Resubmit")    */}
      {/* ------------------------------------------------------------------ */}
      {status === 'not_submitted' && (
        <>
          {/* Success banner shown immediately after a fresh submission */}
          {submitted && (
            <div
              className="mb-5 card p-4 flex items-center gap-3"
              style={{ border: '1.5px solid #1B8A5A', background: '#F0FAF5', color: '#1B8A5A' }}
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <p className="text-[13.5px] font-semibold">
                {isAr
                  ? 'تم إرسال طلبك بنجاح. سيتم مراجعته قريباً.'
                  : 'Your application was submitted successfully and is now under review.'}
              </p>
            </div>
          )}

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Shield className="w-4 h-4" style={{ color: '#1D6296' }} />
              <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
                {isAr ? 'نموذج طلب التحقق المهني' : 'Professional Verification Form'}
              </h2>
            </div>

            {/* Explainer */}
            <p className="text-[13px] mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {isAr
                ? 'يُرجى تعبئة جميع الحقول أدناه بدقة. سيقوم فريقنا بمراجعة بياناتك والرد عليك في غضون 2-3 أيام عمل.'
                : 'Please complete all fields accurately. Our team will review your credentials and respond within 2–3 business days.'}
            </p>

            {/* Global submit error */}
            {submitError && (
              <div
                className="mb-5 flex items-start gap-2 rounded-xl p-3 text-[13px]"
                style={{ background: '#FFF5F5', border: '1px solid #FECACA', color: '#C02A2A' }}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Full Name */}
              <div>
                <label htmlFor="vf-full-name" className="label">
                  {isAr ? 'الاسم الكامل' : 'Full Name'}
                  <span className="text-red-500 ms-1" aria-hidden="true">*</span>
                </label>
                <input
                  id="vf-full-name"
                  type="text"
                  className={`input mt-1 ${errors.full_name ? 'border-red-400' : ''}`}
                  value={form.full_name}
                  onChange={(e) => setField('full_name', e.target.value)}
                  placeholder={isAr ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                  autoComplete="name"
                  aria-required="true"
                  aria-describedby={errors.full_name ? 'err-full-name' : undefined}
                />
                {errors.full_name && (
                  <p id="err-full-name" className="mt-1 text-[12px]" style={{ color: '#C02A2A' }} role="alert">
                    {errors.full_name}
                  </p>
                )}
              </div>

              {/* Professional Title */}
              <div>
                <label htmlFor="vf-title" className="label">
                  {isAr ? 'اللقب المهني' : 'Professional Title'}
                  <span className="text-red-500 ms-1" aria-hidden="true">*</span>
                </label>
                <input
                  id="vf-title"
                  type="text"
                  className={`input mt-1 ${errors.professional_title ? 'border-red-400' : ''}`}
                  value={form.professional_title}
                  onChange={(e) => setField('professional_title', e.target.value)}
                  placeholder={isAr ? 'مثال: أخصائي نفسي إكلينيكي' : 'e.g. Clinical Psychologist'}
                  aria-required="true"
                  aria-describedby={errors.professional_title ? 'err-title' : undefined}
                />
                {errors.professional_title && (
                  <p id="err-title" className="mt-1 text-[12px]" style={{ color: '#C02A2A' }} role="alert">
                    {errors.professional_title}
                  </p>
                )}
              </div>

              {/* License Number */}
              <div>
                <label htmlFor="vf-license" className="label">
                  {isAr ? 'رقم الترخيص' : 'License Number'}
                  <span className="text-red-500 ms-1" aria-hidden="true">*</span>
                </label>
                <input
                  id="vf-license"
                  type="text"
                  className={`input mt-1 ${errors.license_number ? 'border-red-400' : ''}`}
                  value={form.license_number}
                  onChange={(e) => setField('license_number', e.target.value)}
                  placeholder={isAr ? 'رقم ترخيص مزاولة المهنة' : 'Your professional license number'}
                  aria-required="true"
                  aria-describedby={errors.license_number ? 'err-license' : undefined}
                />
                {errors.license_number && (
                  <p id="err-license" className="mt-1 text-[12px]" style={{ color: '#C02A2A' }} role="alert">
                    {errors.license_number}
                  </p>
                )}
              </div>

              {/* Country */}
              <div>
                <label htmlFor="vf-country" className="label">
                  {isAr ? 'الدولة' : 'Country'}
                  <span className="text-red-500 ms-1" aria-hidden="true">*</span>
                </label>
                <select
                  id="vf-country"
                  className={`input mt-1 ${errors.country ? 'border-red-400' : ''}`}
                  value={form.country}
                  onChange={(e) => setField('country', e.target.value)}
                  aria-required="true"
                  aria-describedby={errors.country ? 'err-country' : undefined}
                >
                  <option value="">
                    {isAr ? '-- اختر الدولة --' : '-- Select country --'}
                  </option>
                  {COUNTRIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {isAr ? c.ar : c.en}
                    </option>
                  ))}
                </select>
                {errors.country && (
                  <p id="err-country" className="mt-1 text-[12px]" style={{ color: '#C02A2A' }} role="alert">
                    {errors.country}
                  </p>
                )}
              </div>

              {/* Specialty */}
              <div>
                <label htmlFor="vf-specialty" className="label">
                  {isAr ? 'التخصص' : 'Specialty'}
                  <span className="text-red-500 ms-1" aria-hidden="true">*</span>
                </label>
                <select
                  id="vf-specialty"
                  className={`input mt-1 ${errors.specialty ? 'border-red-400' : ''}`}
                  value={form.specialty}
                  onChange={(e) => setField('specialty', e.target.value)}
                  aria-required="true"
                  aria-describedby={errors.specialty ? 'err-specialty' : undefined}
                >
                  <option value="">
                    {isAr ? '-- اختر التخصص --' : '-- Select specialty --'}
                  </option>
                  {SPECIALTIES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {isAr ? s.ar : s.en}
                    </option>
                  ))}
                </select>
                {errors.specialty && (
                  <p id="err-specialty" className="mt-1 text-[12px]" style={{ color: '#C02A2A' }} role="alert">
                    {errors.specialty}
                  </p>
                )}
              </div>

              {/* Organization */}
              <div>
                <label htmlFor="vf-organization" className="label">
                  {isAr ? 'المؤسسة' : 'Organization'}
                  <span className="text-red-500 ms-1" aria-hidden="true">*</span>
                </label>
                <input
                  id="vf-organization"
                  type="text"
                  className={`input mt-1 ${errors.organization ? 'border-red-400' : ''}`}
                  value={form.organization}
                  onChange={(e) => setField('organization', e.target.value)}
                  placeholder={isAr ? 'اسم المستشفى أو العيادة أو المؤسسة' : 'Hospital, clinic, or institution name'}
                  aria-required="true"
                  aria-describedby={errors.organization ? 'err-organization' : undefined}
                />
                {errors.organization && (
                  <p id="err-organization" className="mt-1 text-[12px]" style={{ color: '#C02A2A' }} role="alert">
                    {errors.organization}
                  </p>
                )}
              </div>

              {/* Document upload notice */}
              <div
                className="rounded-xl p-4 flex items-start gap-3 text-[13px] leading-relaxed"
                style={{ background: 'var(--surface-alt)', border: '1px solid var(--divider)' }}
              >
                <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-secondary)' }}>
                  {isAr
                    ? 'رفع المستندات قادم قريباً — سيُستخدم رقم الترخيص للتحقق الأولي من هويتك المهنية.'
                    : 'Document upload coming soon — your license number will be used for initial verification.'}
                </p>
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-accent gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {isAr ? 'جارٍ الإرسال…' : 'Submitting…'}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {isAr ? 'إرسال الطلب' : 'Submit Application'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
