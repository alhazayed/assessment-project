'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCw,
  Send,
  ShieldAlert,
  UserSearch,
} from 'lucide-react'
import { useLang } from '@/lib/use-lang'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VerificationStatus =
  | 'not_submitted'
  | 'pending_verification'
  | 'verified'
  | 'rejected'
  | 'suspended'

interface VerificationResponse {
  status: VerificationStatus
}

type Permission = {
  key: string
  en: string
  ar: string
}

interface Invitation {
  id: string
  token: string
  status: string
  message: string | null
  requested_permissions: string[]
  created_at: string
  expires_at: string
  accepted_at: string | null
  patient_id: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_PERMISSIONS: Permission[] = [
  { key: 'view_profile', en: 'View Profile', ar: 'عرض الملف الشخصي' },
  { key: 'view_assessment_results', en: 'View Assessment Results', ar: 'عرض نتائج التقييمات' },
  { key: 'view_assessment_history', en: 'View Assessment History', ar: 'عرض سجل التقييمات' },
  { key: 'view_reports', en: 'View Reports', ar: 'عرض التقارير' },
  { key: 'view_progress_tracking', en: 'View Progress Tracking', ar: 'عرض متابعة التقدم' },
  { key: 'view_mood_tracking', en: 'View Mood Tracking', ar: 'عرض متابعة المزاج' },
  { key: 'export_reports', en: 'Export Reports', ar: 'تصدير التقارير' },
  { key: 'message_patient', en: 'Message Patient', ar: 'مراسلة المريض' },
  { key: 'upload_documents', en: 'Upload Documents', ar: 'رفع المستندات' },
  { key: 'generate_clinical_notes', en: 'Generate Clinical Notes', ar: 'إنشاء الملاحظات السريرية' },
]

const DEFAULT_PERMISSIONS = new Set([
  'view_profile',
  'view_assessment_results',
  'message_patient',
])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDateTime(iso: string, isAr: boolean): string {
  return new Date(iso).toLocaleString(isAr ? 'ar-SA' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function inviteStatusBadge(status: string, isAr: boolean): { label: string; className: string } {
  switch (status) {
    case 'accepted':
      return {
        label: isAr ? 'مقبول' : 'Accepted',
        className: 'bg-green-50 text-green-700 border-green-200',
      }
    case 'expired':
      return {
        label: isAr ? 'منتهي الصلاحية' : 'Expired',
        className: 'bg-gray-100 text-gray-500 border-gray-200',
      }
    case 'revoked':
      return {
        label: isAr ? 'ملغي' : 'Revoked',
        className: 'bg-red-50 text-red-600 border-red-200',
      }
    default:
      return {
        label: isAr ? 'نشط' : 'Active',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      }
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PermissionList({
  selected,
  onChange,
  isAr,
  idPrefix,
}: {
  selected: Set<string>
  onChange: (key: string, checked: boolean) => void
  isAr: boolean
  idPrefix: string
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {ALL_PERMISSIONS.map((perm) => {
        const checked = selected.has(perm.key)
        const id = `${idPrefix}-perm-${perm.key}`
        return (
          <label
            key={perm.key}
            htmlFor={id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors select-none"
            style={{
              border: `1.5px solid ${checked ? '#1D6296' : 'var(--border)'}`,
              background: checked ? '#EAF2F9' : 'var(--surface)',
            }}
          >
            <input
              id={id}
              type="checkbox"
              className="w-4 h-4 rounded accent-[#1D6296] flex-shrink-0"
              checked={checked}
              onChange={(e) => onChange(perm.key, e.target.checked)}
            />
            <span className="text-[13px] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
              {isAr ? perm.ar : perm.en}
              <span className="block text-[11px] font-normal mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {isAr ? perm.en : perm.ar}
              </span>
            </span>
          </label>
        )
      })}
    </div>
  )
}

function CopyButton({ text, isAr }: { text: string; isAr: boolean }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback for browsers that don't support clipboard API
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all flex-shrink-0"
      style={{
        background: copied ? '#E6F4EC' : 'var(--surface-alt)',
        color: copied ? '#1B8A5A' : 'var(--text-secondary)',
        border: `1px solid ${copied ? '#A7D9BE' : 'var(--border)'}`,
      }}
      aria-label={isAr ? 'نسخ الرابط' : 'Copy link'}
    >
      {copied ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isAr ? 'تم النسخ' : 'Copied!'}
        </>
      ) : (
        <>
          <ClipboardCopy className="w-3.5 h-3.5" />
          {isAr ? 'نسخ' : 'Copy'}
        </>
      )}
    </button>
  )
}

function InviteUrlBox({
  url,
  expiresAt,
  isAr,
}: {
  url: string
  expiresAt?: string
  isAr: boolean
}) {
  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ background: '#EAF2F9', border: '1.5px solid #B8D4EA' }}
    >
      <div className="flex items-start gap-2 flex-wrap">
        <div
          className="flex-1 min-w-0 font-mono text-[13px] break-all rounded-lg px-3 py-2"
          style={{ background: 'white', color: '#1D6296', border: '1px solid #B8D4EA' }}
        >
          {url}
        </div>
        <CopyButton text={url} isAr={isAr} />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-opacity hover:opacity-80 flex-shrink-0"
          style={{ background: '#1D6296', color: 'white' }}
          aria-label={isAr ? 'فتح الرابط' : 'Open link'}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {isAr ? 'فتح' : 'Open'}
        </a>
      </div>
      {expiresAt && (
        <p className="text-[12px] font-medium flex items-center gap-1.5" style={{ color: '#1D6296' }}>
          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
          {isAr
            ? `ينتهي الرابط في: ${fmtDateTime(expiresAt, isAr)}`
            : `Link expires: ${fmtDateTime(expiresAt, isAr)}`}
          {' — '}
          {isAr ? 'صالح لمدة 7 أيام' : 'Valid for 7 days'}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ClinicianConnectPage() {
  const lang = useLang()
  const isAr = lang === 'ar'

  // ── Verification banner state ──────────────────────────────────────────────
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null)
  const [verificationLoading, setVerificationLoading] = useState(true)

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'code' | 'invite'>('code')

  // ── Tab 1: Connect by Patient Code ────────────────────────────────────────
  const [patientCode, setPatientCode] = useState('')
  const [codePermissions, setCodePermissions] = useState<Set<string>>(new Set(DEFAULT_PERMISSIONS))
  const [codeMessage, setCodeMessage] = useState('')
  const [codeSubmitting, setCodeSubmitting] = useState(false)
  const [codeSuccess, setCodeSuccess] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)

  // ── Tab 2: Send Invitation Link ───────────────────────────────────────────
  const [invitePermissions, setInvitePermissions] = useState<Set<string>>(new Set(DEFAULT_PERMISSIONS))
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviteGenerating, setInviteGenerating] = useState(false)
  const [newInviteUrl, setNewInviteUrl] = useState<string | null>(null)
  const [newInviteExpiresAt, setNewInviteExpiresAt] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [existingInvites, setExistingInvites] = useState<Invitation[]>([])
  const [invitesLoading, setInvitesLoading] = useState(false)
  const [invitesFetchError, setInvitesFetchError] = useState<string | null>(null)

  // ── Fetch verification status ──────────────────────────────────────────────

  useEffect(() => {
    async function fetchVerification() {
      setVerificationLoading(true)
      try {
        const res = await fetch('/api/clinician/verification')
        if (!res.ok) {
          setVerificationStatus('not_submitted')
          return
        }
        const data: VerificationResponse = await res.json()
        setVerificationStatus(data.status)
      } catch {
        setVerificationStatus('not_submitted')
      } finally {
        setVerificationLoading(false)
      }
    }
    fetchVerification()
  }, [])

  // ── Fetch existing invitations when on invite tab ─────────────────────────

  const fetchInvitations = useCallback(async () => {
    setInvitesLoading(true)
    setInvitesFetchError(null)
    try {
      const res = await fetch('/api/clinician/invite')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setInvitesFetchError(body.error || (isAr ? 'تعذّر تحميل الدعوات.' : 'Failed to load invitations.'))
        return
      }
      const data: { invitations: Invitation[] } = await res.json()
      // Only show active (non-expired, non-revoked) and recently accepted ones
      setExistingInvites(data.invitations ?? [])
    } catch {
      setInvitesFetchError(isAr ? 'خطأ في الاتصال.' : 'Network error.')
    } finally {
      setInvitesLoading(false)
    }
  }, [isAr])

  useEffect(() => {
    if (activeTab === 'invite') {
      fetchInvitations()
    }
  }, [activeTab, fetchInvitations])

  // ── Permission toggle helpers ──────────────────────────────────────────────

  function toggleCodePermission(key: string, checked: boolean) {
    setCodePermissions((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  function toggleInvitePermission(key: string, checked: boolean) {
    setInvitePermissions((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  // ── Tab 1: Submit access request ──────────────────────────────────────────

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCodeError(null)
    setCodeSuccess(false)

    const trimmedCode = patientCode.trim()
    if (!trimmedCode) {
      setCodeError(isAr ? 'يرجى إدخال رمز المريض.' : 'Please enter a patient code.')
      return
    }
    if (codePermissions.size === 0) {
      setCodeError(isAr ? 'يرجى تحديد صلاحية واحدة على الأقل.' : 'Please select at least one permission.')
      return
    }

    setCodeSubmitting(true)
    try {
      const res = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_code: trimmedCode,
          requested_permissions: Array.from(codePermissions),
          request_message: codeMessage.trim() || undefined,
        }),
      })

      const body = await res.json().catch(() => ({}))

      if (res.status === 409) {
        const raw: string = body.error ?? ''
        if (raw.toLowerCase().includes('pending')) {
          setCodeError(
            isAr
              ? 'طلب الوصول إلى هذا المريض قيد الانتظار بالفعل.'
              : 'An access request for this patient is already pending.'
          )
        } else {
          setCodeError(
            isAr
              ? 'أنت مرتبط بهذا المريض بالفعل.'
              : 'You are already connected with this patient.'
          )
        }
        return
      }

      if (res.status === 404) {
        setCodeError(isAr ? 'رمز المريض غير صالح أو غير نشط.' : 'Invalid or inactive patient code.')
        return
      }

      if (res.status === 403) {
        setCodeError(
          isAr
            ? 'يجب إكمال التحقق من حسابك أولاً قبل إرسال طلبات الوصول.'
            : 'Your account must be verified before sending access requests.'
        )
        return
      }

      if (res.status === 429) {
        setCodeError(
          isAr
            ? 'تجاوزت الحد المسموح به من الطلبات. يرجى المحاولة لاحقاً.'
            : 'Too many requests. Please try again later.'
        )
        return
      }

      if (!res.ok) {
        setCodeError(body.error || (isAr ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.'))
        return
      }

      setCodeSuccess(true)
      setPatientCode('')
      setCodeMessage('')
      setCodePermissions(new Set(DEFAULT_PERMISSIONS))
    } catch {
      setCodeError(isAr ? 'خطأ في الاتصال. تحقق من اتصالك بالإنترنت.' : 'Network error. Check your connection.')
    } finally {
      setCodeSubmitting(false)
    }
  }

  // ── Tab 2: Generate invitation link ───────────────────────────────────────

  async function handleGenerateInvite() {
    setInviteError(null)
    setNewInviteUrl(null)
    setNewInviteExpiresAt(null)

    if (invitePermissions.size === 0) {
      setInviteError(isAr ? 'يرجى تحديد صلاحية واحدة على الأقل.' : 'Please select at least one permission.')
      return
    }

    setInviteGenerating(true)
    try {
      const res = await fetch('/api/clinician/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requested_permissions: Array.from(invitePermissions),
          message: inviteMessage.trim() || undefined,
        }),
      })

      const body = await res.json().catch(() => ({}))

      if (res.status === 403) {
        setInviteError(
          isAr
            ? 'يجب إكمال التحقق من حسابك أولاً قبل إرسال الدعوات.'
            : 'Your account must be verified before sending invitations.'
        )
        return
      }

      if (res.status === 429) {
        setInviteError(
          isAr
            ? 'تجاوزت الحد اليومي للدعوات (20 دعوة في اليوم).'
            : 'Daily invitation limit reached (20 per day).'
        )
        return
      }

      if (!res.ok) {
        setInviteError(body.error || (isAr ? 'تعذّر إنشاء الرابط. يرجى المحاولة مرة أخرى.' : 'Failed to create invitation. Please try again.'))
        return
      }

      const data: { invite_url: string; invitation: Invitation } = body
      setNewInviteUrl(data.invite_url)
      setNewInviteExpiresAt(data.invitation.expires_at ?? null)
      setInviteMessage('')
      setInvitePermissions(new Set(DEFAULT_PERMISSIONS))

      // Refresh existing invitations list
      fetchInvitations()
    } catch {
      setInviteError(isAr ? 'خطأ في الاتصال. تحقق من اتصالك بالإنترنت.' : 'Network error. Check your connection.')
    } finally {
      setInviteGenerating(false)
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const isVerified = verificationStatus === 'verified'
  const showUnverifiedBanner =
    !verificationLoading && verificationStatus !== null && !isVerified

  const tabs = [
    {
      key: 'code' as const,
      label: isAr ? 'ربط عبر رمز المريض' : 'Connect by Patient Code',
      icon: UserSearch,
    },
    {
      key: 'invite' as const,
      label: isAr ? 'إرسال رابط دعوة' : 'Send Invitation Link',
      icon: Link2,
    },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-3xl" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Page header */}
      <div className="mb-7">
        <h1
          className="text-3xl font-extrabold tracking-tight mb-1"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
        >
          {isAr ? 'ربط بمريض' : 'Connect with a Patient'}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {isAr
            ? 'أرسل طلب وصول باستخدام رمز المريض أو أنشئ رابط دعوة.'
            : 'Send an access request using a patient code or generate an invitation link.'}
        </p>
      </div>

      {/* Unverified clinician banner */}
      {showUnverifiedBanner && (
        <div
          className="mb-6 rounded-2xl p-4 flex items-start gap-3"
          style={{ background: '#FFFBF0', border: '1.5px solid #B07A12' }}
          role="alert"
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#B07A12' }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold mb-1" style={{ color: '#B07A12' }}>
              {isAr ? 'الحساب غير موثّق' : 'Account not verified'}
            </p>
            <p className="text-[13px] mb-2" style={{ color: '#B07A12', opacity: 0.85 }}>
              {isAr
                ? 'يرجى إكمال التحقق من حسابك المهني قبل ربط المرضى.'
                : 'Please complete your account verification before connecting with patients.'}
            </p>
            <Link
              href="/clinician/verification"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
              style={{ color: '#B07A12' }}
            >
              {isAr ? 'اذهب إلى صفحة التحقق' : 'Go to verification page'}
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div
        className="flex mb-6 p-1 rounded-2xl gap-1"
        style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}
        role="tablist"
        aria-label={isAr ? 'طرق الربط' : 'Connection methods'}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${tab.key}`}
              id={`tab-${tab.key}`}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all"
              style={{
                background: active ? 'var(--surface)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: active ? '0 1px 4px rgba(18,39,60,0.10)' : 'none',
                border: active ? '1px solid var(--border)' : '1px solid transparent',
              }}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* TAB 1 — Connect by Patient Code                                     */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {activeTab === 'code' && (
        <div
          id="panel-code"
          role="tabpanel"
          aria-labelledby="tab-code"
        >
          {/* Success message */}
          {codeSuccess && (
            <div
              className="mb-5 rounded-2xl p-4 flex items-start gap-3"
              style={{ background: '#F0FAF5', border: '1.5px solid #1B8A5A' }}
              role="status"
            >
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#1B8A5A' }} />
              <div>
                <p className="text-[13.5px] font-semibold" style={{ color: '#1B8A5A' }}>
                  {isAr ? 'تم الإرسال' : 'Request sent successfully'}
                </p>
                <p className="text-[12.5px] mt-0.5" style={{ color: '#1B8A5A', opacity: 0.85 }}>
                  {isAr
                    ? 'تم إرسال طلب الوصول — سيتم إشعار المريض.'
                    : 'Access request sent — patient will be notified.'}
                </p>
              </div>
            </div>
          )}

          <div className="card p-6 space-y-6">
            <form onSubmit={handleCodeSubmit} noValidate className="space-y-6">
              {/* Patient code input */}
              <div>
                <label htmlFor="patient-code" className="label">
                  {isAr ? 'رمز المريض' : 'Patient Code'}
                  <span className="text-red-500 ms-1" aria-hidden="true">*</span>
                </label>
                <input
                  id="patient-code"
                  type="text"
                  className={`input mt-1 font-mono tracking-widest uppercase${codeError && !codeSuccess ? ' input-error' : ''}`}
                  placeholder="VX73921"
                  value={patientCode}
                  onChange={(e) => {
                    setPatientCode(e.target.value.toUpperCase())
                    setCodeError(null)
                    setCodeSuccess(false)
                  }}
                  aria-required="true"
                  aria-describedby={codeError ? 'code-error' : undefined}
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="mt-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {isAr
                    ? 'اطلب من المريض مشاركة رمزه الشخصي معك.'
                    : 'Ask the patient to share their personal code with you.'}
                </p>
              </div>

              {/* Permissions */}
              <div>
                <p className="label mb-3">
                  {isAr ? 'الصلاحيات المطلوبة' : 'Requested Permissions'}
                </p>
                <PermissionList
                  selected={codePermissions}
                  onChange={toggleCodePermission}
                  isAr={isAr}
                  idPrefix="code"
                />
              </div>

              {/* Optional message */}
              <div>
                <label htmlFor="code-message" className="label">
                  {isAr ? 'رسالة للمريض (اختياري)' : 'Message to patient (optional)'}
                </label>
                <textarea
                  id="code-message"
                  className="input mt-1 resize-none"
                  rows={3}
                  placeholder={
                    isAr
                      ? 'مثال: مرحباً، أود متابعة تقدمك...'
                      : 'e.g. Hi, I would like to follow your progress...'
                  }
                  value={codeMessage}
                  onChange={(e) => setCodeMessage(e.target.value)}
                  maxLength={500}
                />
                <p className="mt-1 text-end text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                  {codeMessage.length}/500
                </p>
              </div>

              {/* Error */}
              {codeError && (
                <div
                  id="code-error"
                  className="rounded-xl p-3 flex items-start gap-2 text-[13px]"
                  style={{ background: '#FFF5F5', border: '1px solid #FECACA', color: '#C02A2A' }}
                  role="alert"
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{codeError}</span>
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={codeSubmitting || !isVerified}
                  title={!isVerified ? (isAr ? 'يلزم توثيق الحساب أولاً' : 'Your account must be verified first') : undefined}
                  className="btn-accent gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {codeSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isAr ? 'جارٍ الإرسال…' : 'Sending…'}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {isAr ? 'إرسال طلب الوصول' : 'Send Access Request'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* TAB 2 — Send Invitation Link                                        */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {activeTab === 'invite' && (
        <div
          id="panel-invite"
          role="tabpanel"
          aria-labelledby="tab-invite"
          className="space-y-6"
        >
          {/* Generate new link form */}
          <div className="card p-6 space-y-6">
            <div>
              <p className="label mb-3">
                {isAr ? 'الصلاحيات المطلوبة' : 'Requested Permissions'}
              </p>
              <PermissionList
                selected={invitePermissions}
                onChange={toggleInvitePermission}
                isAr={isAr}
                idPrefix="invite"
              />
            </div>

            {/* Optional message */}
            <div>
              <label htmlFor="invite-message" className="label">
                {isAr ? 'رسالة للمريض (اختياري)' : 'Message to patient (optional)'}
              </label>
              <textarea
                id="invite-message"
                className="input mt-1 resize-none"
                rows={3}
                placeholder={
                  isAr
                    ? 'مثال: مرحباً، استخدم هذا الرابط للانضمام إلى جلستنا...'
                    : 'e.g. Hi, please use this link to connect with me...'
                }
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                maxLength={500}
              />
              <p className="mt-1 text-end text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                {inviteMessage.length}/500
              </p>
            </div>

            {/* Error */}
            {inviteError && (
              <div
                className="rounded-xl p-3 flex items-start gap-2 text-[13px]"
                style={{ background: '#FFF5F5', border: '1px solid #FECACA', color: '#C02A2A' }}
                role="alert"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{inviteError}</span>
              </div>
            )}

            {/* Generate button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleGenerateInvite}
                disabled={inviteGenerating || !isVerified}
                title={!isVerified ? (isAr ? 'يلزم توثيق الحساب أولاً' : 'Your account must be verified first') : undefined}
                className="btn-brand gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inviteGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isAr ? 'جارٍ الإنشاء…' : 'Generating…'}
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    {isAr ? 'إنشاء رابط' : 'Generate Link'}
                  </>
                )}
              </button>
            </div>

            {/* Newly generated invite URL */}
            {newInviteUrl && (
              <div className="space-y-2 pt-1">
                <p className="text-[13px] font-semibold" style={{ color: '#1B8A5A' }}>
                  {isAr ? 'تم إنشاء الرابط بنجاح' : 'Invitation link generated'}
                </p>
                <InviteUrlBox
                  url={newInviteUrl}
                  expiresAt={newInviteExpiresAt ?? undefined}
                  isAr={isAr}
                />
              </div>
            )}
          </div>

          {/* Existing active invitations */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
                {isAr ? 'الدعوات السابقة' : 'Existing Invitations'}
              </h2>
              <button
                type="button"
                onClick={fetchInvitations}
                disabled={invitesLoading}
                className="btn-icon"
                aria-label={isAr ? 'تحديث' : 'Refresh'}
              >
                <RefreshCw className={`w-4 h-4 ${invitesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {invitesLoading && (
              <div className="flex items-center justify-center py-10 gap-2" style={{ color: 'var(--text-muted)' }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[13px]">{isAr ? 'جارٍ التحميل…' : 'Loading…'}</span>
              </div>
            )}

            {!invitesLoading && invitesFetchError && (
              <div
                className="rounded-xl p-3 flex items-start gap-2 text-[13px]"
                style={{ background: '#FFF5F5', border: '1px solid #FECACA', color: '#C02A2A' }}
                role="alert"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{invitesFetchError}</span>
              </div>
            )}

            {!invitesLoading && !invitesFetchError && existingInvites.length === 0 && (
              <div className="text-center py-10">
                <div
                  className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'var(--surface-alt)' }}
                >
                  <Link2 className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
                  {isAr ? 'لا توجد دعوات بعد.' : 'No invitations yet.'}
                </p>
              </div>
            )}

            {!invitesLoading && !invitesFetchError && existingInvites.length > 0 && (
              <div className="space-y-4">
                {existingInvites.map((inv) => {
                  const siteUrl =
                    typeof window !== 'undefined' ? window.location.origin : ''
                  const inviteUrl = `${siteUrl}/connect/${inv.token}`
                  const badge = inviteStatusBadge(inv.status, isAr)
                  const isActive = inv.status === 'pending'

                  return (
                    <div
                      key={inv.id}
                      className="rounded-2xl p-4 space-y-3"
                      style={{
                        background: 'var(--surface-alt)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1">
                          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                            {isAr ? 'أُنشئ في: ' : 'Created: '}
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {fmtDateTime(inv.created_at, isAr)}
                            </span>
                          </p>
                          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                            {isAr ? 'ينتهي في: ' : 'Expires: '}
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {fmtDateTime(inv.expires_at, isAr)}
                            </span>
                          </p>
                          {inv.accepted_at && (
                            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                              {isAr ? 'قُبل في: ' : 'Accepted: '}
                              <span style={{ color: 'var(--text-secondary)' }}>
                                {fmtDateTime(inv.accepted_at, isAr)}
                              </span>
                            </p>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center text-[11.5px] font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      {/* Invite URL — only show for active/pending */}
                      {isActive && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <div
                            className="flex-1 min-w-0 font-mono text-[11.5px] truncate rounded-lg px-3 py-2"
                            style={{
                              background: 'var(--surface)',
                              color: '#1D6296',
                              border: '1px solid var(--border)',
                            }}
                            title={inviteUrl}
                          >
                            {inviteUrl}
                          </div>
                          <CopyButton text={inviteUrl} isAr={isAr} />
                        </div>
                      )}

                      {/* Permissions preview */}
                      {inv.requested_permissions && inv.requested_permissions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {inv.requested_permissions.map((pk) => {
                            const perm = ALL_PERMISSIONS.find((p) => p.key === pk)
                            return (
                              <span
                                key={pk}
                                className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full"
                                style={{
                                  background: 'var(--surface)',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border)',
                                }}
                              >
                                {perm ? (isAr ? perm.ar : perm.en) : pk}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
