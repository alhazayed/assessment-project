'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  UserCheck,
  UserX,
  ShieldOff,
  Copy,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Stethoscope,
  Building2,
  Key,
  Settings,
  Clock,
  ShieldCheck,
  Loader2,
} from 'lucide-react'
import { ALL_PERMISSION_KEYS, type PermissionKey } from '@/lib/types'
import { PERMISSION_LABELS, isPermissionKey } from '@/lib/permissions'

// ─── Types ───────────────────────────────────────────────────────────────────
// Permission keys, labels, and the canonical list all come from the shared
// permission model (lib/types + lib/permissions) — the same source the backend
// validates against — so this page can never drift to keys the API rejects.

type PermissionRow = {
  permission_key: PermissionKey
  granted: boolean
  granted_at: string | null
  revoked_at: string | null
}

type Clinician = {
  id: string
  full_name_en: string | null
  full_name_ar: string | null
  avatar_url: string | null
  specialty: string | null
  organization: string | null
  professional_title: string | null
}

type Relationship = {
  id: string
  status: 'pending' | 'active' | 'rejected' | 'revoked'
  initiated_by: string
  requested_at: string
  responded_at: string | null
  revoked_at: string | null
  last_access_at: string | null
  clinician: Clinician
  permissions: PermissionRow[]
  // Convenience field parsed from the API data for pending cards
  requested_permissions?: PermissionKey[]
}

type AccessCode = {
  code: string
  created_at: string
  last_used_at: string | null
}

// ─── Lang / i18n ─────────────────────────────────────────────────────────────

type Lang = 'ar' | 'en'

function getLang(): Lang {
  // Read the app-wide `lang` cookie (single source of truth, defaults to English)
  // — the same source components/language-toggle and lib/use-lang use. Previously
  // this read localStorage['vw-lang'] defaulting to 'ar', so the page rendered in
  // Arabic regardless of the user's actual language selection.
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(/(?:^|;\s*)lang=([^;]*)/)
  return match?.[1] === 'ar' ? 'ar' : 'en'
}

const labels = {
  ar: {
    pageTitle: 'أطبائي',
    pendingSection: 'طلبات معلقة',
    activeSection: 'الأطباء النشطون',
    pastSection: 'السابقون والمرفوضون',
    accessCodeSection: 'رمز الوصول الخاص بي',
    accessCodeHint: 'شارك هذا الرمز مع طبيبك ليتمكن من إرسال طلب الوصول إليك.',
    copy: 'نسخ',
    copied: 'تم النسخ',
    regenerate: 'إعادة توليد',
    regenerateWarningTitle: 'تحذير: إعادة توليد الرمز',
    regenerateWarningBody:
      'سيتم إلغاء الرمز الحالي فوراً. سيحتاج أي طبيب يستخدم هذا الرمز إلى الرمز الجديد. هل تريد المتابعة؟',
    confirmRegenerate: 'نعم، إعادة التوليد',
    cancelRegenerate: 'إلغاء',
    approve: 'الموافقة',
    reject: 'رفض',
    revokeAccess: 'سحب الوصول',
    modifyPermissions: 'تعديل الصلاحيات',
    approveModalTitle: 'اختر الصلاحيات الممنوحة',
    approveModalHint:
      'حدد الصلاحيات التي تسمح للطبيب بالوصول إليها. يمكنك تعديلها لاحقاً.',
    grantAll: 'منح الكل',
    grantNone: 'إلغاء الكل',
    confirmApprove: 'الموافقة والمنح',
    cancelApprove: 'إلغاء',
    confirmRejectTitle: 'تأكيد الرفض',
    confirmRejectBody: 'هل تريد رفض طلب الوصول من هذا الطبيب؟',
    confirmReject: 'نعم، رفض',
    cancelReject: 'إلغاء',
    confirmRevokeTitle: 'تأكيد سحب الوصول',
    confirmRevokeBody: 'سيفقد الطبيب وصوله إلى بياناتك فوراً. هل تريد المتابعة؟',
    confirmRevoke: 'نعم، سحب الوصول',
    cancelRevoke: 'إلغاء',
    noPending: 'لا توجد طلبات معلقة',
    noActive: 'لا يوجد أطباء نشطون حالياً',
    noPast: 'لا توجد علاقات سابقة',
    loading: 'جارٍ التحميل...',
    requestedOn: 'طُلب في',
    revokedOn: 'سُحب في',
    respondedOn: 'استجيب في',
    lastAccess: 'آخر وصول',
    requestedPerms: 'الصلاحيات المطلوبة',
    grantedPerms: 'الصلاحيات الممنوحة',
    status: {
      rejected: 'مرفوض',
      revoked: 'مسحوب',
    },
    errorLoad: 'فشل في تحميل البيانات. يرجى المحاولة مجدداً.',
    errorAction: 'حدث خطأ. يرجى المحاولة مجدداً.',
    showPast: 'إظهار السجل السابق',
    hidePast: 'إخفاء السجل السابق',
  },
  en: {
    pageTitle: 'My Clinicians',
    pendingSection: 'Pending Requests',
    activeSection: 'Active Clinicians',
    pastSection: 'Past / Revoked',
    accessCodeSection: 'My Access Code',
    accessCodeHint:
      'Share this code with your clinician so they can send you an access request.',
    copy: 'Copy',
    copied: 'Copied',
    regenerate: 'Regenerate',
    regenerateWarningTitle: 'Warning: Regenerate Code',
    regenerateWarningBody:
      'Your current code will be immediately invalidated. Any clinician using this code will need the new one. Do you want to proceed?',
    confirmRegenerate: 'Yes, Regenerate',
    cancelRegenerate: 'Cancel',
    approve: 'Approve',
    reject: 'Reject',
    revokeAccess: 'Revoke Access',
    modifyPermissions: 'Modify Permissions',
    approveModalTitle: 'Select Permissions to Grant',
    approveModalHint:
      'Choose which permissions to allow this clinician to access. You can modify them later.',
    grantAll: 'Grant All',
    grantNone: 'Clear All',
    confirmApprove: 'Approve & Grant',
    cancelApprove: 'Cancel',
    confirmRejectTitle: 'Confirm Rejection',
    confirmRejectBody:
      'Do you want to reject the access request from this clinician?',
    confirmReject: 'Yes, Reject',
    cancelReject: 'Cancel',
    confirmRevokeTitle: 'Confirm Revoke Access',
    confirmRevokeBody:
      'The clinician will immediately lose access to your data. Do you want to proceed?',
    confirmRevoke: 'Yes, Revoke Access',
    cancelRevoke: 'Cancel',
    noPending: 'No pending requests',
    noActive: 'No active clinicians',
    noPast: 'No past relationships',
    loading: 'Loading...',
    requestedOn: 'Requested on',
    revokedOn: 'Revoked on',
    respondedOn: 'Responded on',
    lastAccess: 'Last access',
    requestedPerms: 'Requested Permissions',
    grantedPerms: 'Granted Permissions',
    status: {
      rejected: 'Rejected',
      revoked: 'Revoked',
    },
    errorLoad: 'Failed to load data. Please try again.',
    errorAction: 'An error occurred. Please try again.',
    showPast: 'Show Past History',
    hidePast: 'Hide Past History',
  },
} as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clinicianName(c: Clinician, lang: Lang): string {
  if (lang === 'ar' && c.full_name_ar) return c.full_name_ar
  return c.full_name_en ?? '—'
}

function formatDate(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ModalProps {
  onClose: () => void
  children: React.ReactNode
  title: string
}

function Modal({ onClose, children, title }: ModalProps) {
  // Close on backdrop click
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(10,16,25,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--divider)' }}
        >
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-opacity-10 hover:bg-gray-500"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

interface PermissionBadgeProps {
  permKey: PermissionKey
  granted: boolean
  lang: Lang
}

function PermissionBadge({ permKey, granted, lang }: PermissionBadgeProps) {
  const label = PERMISSION_LABELS[permKey][lang]
  return (
    <span
      className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1 rounded-full"
      style={
        granted
          ? { color: '#1B8A5A', backgroundColor: '#E6F4EC', border: '1px solid #C9E6D6' }
          : { color: 'var(--text-muted)', backgroundColor: 'var(--surface-alt)', border: '1px solid var(--border)' }
      }
    >
      {granted ? (
        <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
      ) : (
        <X className="w-3 h-3 flex-shrink-0" />
      )}
      {label}
    </span>
  )
}

interface AvatarProps {
  name: string
  size?: number
}

function Avatar({ name, size = 40 }: AvatarProps) {
  const text = initials(name)
  return (
    <div
      className="flex items-center justify-center rounded-full flex-shrink-0 font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        backgroundColor: '#EAF2F9',
        color: '#1D6296',
      }}
    >
      {text || <Stethoscope style={{ width: size * 0.45, height: size * 0.45 }} />}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PatientCliniciansPage() {
  const [lang, setLang] = useState<Lang>(getLang)
  const L = labels[lang]
  const isRtl = lang === 'ar'

  // ── Data state ──
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loadingRels, setLoadingRels] = useState(true)
  const [relsError, setRelsError] = useState<string | null>(null)

  const [accessCode, setAccessCode] = useState<AccessCode | null>(null)
  const [loadingCode, setLoadingCode] = useState(true)
  const [codeError, setCodeError] = useState<string | null>(null)

  // ── UI state ──
  const [copiedCode, setCopiedCode] = useState(false)
  const [showPast, setShowPast] = useState(false)

  // Modals
  const [approveTarget, setApproveTarget] = useState<Relationship | null>(null)
  const [approvePerms, setApprovePerms] = useState<Set<PermissionKey>>(new Set())
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const [rejectTarget, setRejectTarget] = useState<Relationship | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  const [revokeTarget, setRevokeTarget] = useState<Relationship | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const [showRegenWarning, setShowRegenWarning] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  // ── Init lang from localStorage ──
  useEffect(() => {
    setLang(getLang())
  }, [])

  // ── Fetch relationships ──
  const fetchRelationships = useCallback(async () => {
    setLoadingRels(true)
    setRelsError(null)
    try {
      const res = await fetch('/api/patient/relationships')
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json()
      // Derive requested_permissions from the permissions array for pending items
      const shaped: Relationship[] = (json.relationships ?? []).map((r: Relationship) => ({
        ...r,
        requested_permissions:
          r.status === 'pending'
            ? r.permissions.filter((p) => p.granted).map((p) => p.permission_key)
            : undefined,
      }))
      setRelationships(shaped)
    } catch {
      setRelsError(L.errorLoad)
    } finally {
      setLoadingRels(false)
    }
  }, [L.errorLoad])

  // ── Fetch access code ──
  const fetchAccessCode = useCallback(async () => {
    setLoadingCode(true)
    setCodeError(null)
    try {
      const res = await fetch('/api/patient/code')
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json()
      setAccessCode(json)
    } catch {
      setCodeError(L.errorLoad)
    } finally {
      setLoadingCode(false)
    }
  }, [L.errorLoad])

  useEffect(() => {
    fetchRelationships()
    fetchAccessCode()
  }, [fetchRelationships, fetchAccessCode])

  // ── Copy code ──
  async function handleCopyCode() {
    if (!accessCode?.code) return
    try {
      await navigator.clipboard.writeText(accessCode.code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      // Fallback for older browsers / non-secure contexts
      const el = document.createElement('textarea')
      el.value = accessCode.code
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  // ── Regenerate code ──
  async function handleRegenerate() {
    setRegenerating(true)
    setShowRegenWarning(false)
    setCodeError(null)
    try {
      const res = await fetch('/api/patient/code', { method: 'POST' })
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json()
      setAccessCode({ ...json, last_used_at: null })
    } catch {
      setCodeError(L.errorAction)
    } finally {
      setRegenerating(false)
    }
  }

  // ── Open approve modal ──
  function openApproveModal(rel: Relationship) {
    // Pre-check the permissions the clinician originally requested
    const preChecked = new Set<PermissionKey>(
      (rel.requested_permissions ?? []).filter(isPermissionKey)
    )
    // For modify flow (active), pre-check all currently granted ones
    if (rel.status === 'active') {
      rel.permissions.forEach((p) => {
        if (p.granted) preChecked.add(p.permission_key)
      })
    }
    setApprovePerms(preChecked)
    setApproveTarget(rel)
  }

  function togglePerm(key: PermissionKey) {
    setApprovePerms((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // ── Submit approve / modify ──
  async function handleApprove() {
    if (!approveTarget) return
    setApprovingId(approveTarget.id)
    try {
      const res = await fetch(`/api/access-requests/${approveTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          granted_permissions: Array.from(approvePerms),
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setApproveTarget(null)
      await fetchRelationships()
    } catch {
      // Surface error inline; don't close the modal so the user can retry
      setRelsError(L.errorAction)
    } finally {
      setApprovingId(null)
    }
  }

  // ── Reject ──
  async function handleReject() {
    if (!rejectTarget) return
    setRejectingId(rejectTarget.id)
    try {
      const res = await fetch(`/api/access-requests/${rejectTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setRejectTarget(null)
      await fetchRelationships()
    } catch {
      setRelsError(L.errorAction)
    } finally {
      setRejectingId(null)
    }
  }

  // ── Revoke ──
  async function handleRevoke() {
    if (!revokeTarget) return
    setRevokingId(revokeTarget.id)
    try {
      const res = await fetch(`/api/access-requests/${revokeTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke' }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setRevokeTarget(null)
      await fetchRelationships()
    } catch {
      setRelsError(L.errorAction)
    } finally {
      setRevokingId(null)
    }
  }

  // ── Partitioned data ──
  const pending = relationships.filter((r) => r.status === 'pending')
  const active = relationships.filter((r) => r.status === 'active')
  const past = relationships.filter((r) => r.status === 'rejected' || r.status === 'revoked')

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-4xl"
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{ color: 'var(--text-primary)' }}
    >
      {/* ── Page header ── */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-extrabold tracking-tight mb-1"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
          >
            {L.pageTitle}
          </h1>
          <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
            {lang === 'ar'
              ? 'إدارة صلاحيات الوصول الخاصة بأطبائك ومختصيك النفسيين'
              : 'Manage access permissions for your healthcare clinicians'}
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#EAF2F9' }}
        >
          <ShieldCheck className="w-5 h-5" style={{ color: '#1D6296' }} />
        </div>
      </div>

      {/* ── Global error banner ── */}
      {relsError && (
        <div
          className="mb-5 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium"
          style={{ backgroundColor: '#FDE8E8', color: '#C02A2A', border: '1px solid #F8C8C8' }}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{relsError}</span>
          <button
            onClick={() => setRelsError(null)}
            className="ms-auto"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 1 — ACCESS CODE
          ══════════════════════════════════════════════════════ */}
      <section className="card p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#EAF2F9' }}
          >
            <Key className="w-4 h-4" style={{ color: '#1D6296' }} />
          </div>
          <div>
            <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {L.accessCodeSection}
            </h2>
            <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {L.accessCodeHint}
            </p>
          </div>
        </div>

        {loadingCode ? (
          <div className="flex items-center gap-2 py-4" style={{ color: 'var(--text-muted)' }}>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">{L.loading}</span>
          </div>
        ) : codeError ? (
          <div className="text-sm py-3" style={{ color: '#C02A2A' }}>
            {codeError}
          </div>
        ) : accessCode ? (
          <div className="space-y-4">
            {/* Code display */}
            <div
              className="flex items-center gap-3 rounded-xl px-5 py-4"
              style={{ backgroundColor: 'var(--surface-alt)', border: '1.5px dashed var(--border)' }}
            >
              <span
                className="flex-1 font-mono text-2xl font-bold tracking-[0.25em] select-all"
                style={{ color: 'var(--text-primary)', letterSpacing: '0.22em' }}
                aria-label="Access code"
              >
                {accessCode.code}
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-lg transition-all"
                style={
                  copiedCode
                    ? { backgroundColor: '#E6F4EC', color: '#1B8A5A', border: '1px solid #C9E6D6' }
                    : { backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                }
                aria-label={L.copy}
              >
                {copiedCode ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copiedCode ? L.copied : L.copy}
              </button>
            </div>

            {/* Metadata + Regenerate */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-[11.5px] space-y-0.5" style={{ color: 'var(--text-muted)' }}>
                {accessCode.created_at && (
                  <p>
                    {lang === 'ar' ? 'تاريخ الإنشاء: ' : 'Created: '}
                    {formatDate(accessCode.created_at, lang)}
                  </p>
                )}
                {accessCode.last_used_at && (
                  <p>
                    {L.lastAccess}: {formatDate(accessCode.last_used_at, lang)}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowRegenWarning(true)}
                disabled={regenerating}
                className="flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-lg disabled:opacity-50 transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#FDE8E8', color: '#C02A2A', border: '1px solid #F8C8C8' }}
              >
                {regenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {L.regenerate}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — PENDING REQUESTS
          ══════════════════════════════════════════════════════ */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: '#F3650A' }}
          />
          <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
            {L.pendingSection}
          </h2>
          {pending.length > 0 && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#FEF2EC', color: '#F3650A', border: '1px solid #FBC29D' }}
            >
              {pending.length}
            </span>
          )}
        </div>

        {loadingRels ? (
          <LoadingSkeleton />
        ) : pending.length === 0 ? (
          <EmptyState icon={<Clock className="w-8 h-8" />} message={L.noPending} />
        ) : (
          <div className="space-y-3">
            {pending.map((rel) => (
              <PendingCard
                key={rel.id}
                rel={rel}
                lang={lang}
                L={L}
                onApprove={() => openApproveModal(rel)}
                onReject={() => setRejectTarget(rel)}
                rejectingId={rejectingId}
              />
            ))}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 3 — ACTIVE CLINICIANS
          ══════════════════════════════════════════════════════ */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: '#1B8A5A' }}
          />
          <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
            {L.activeSection}
          </h2>
          {active.length > 0 && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#E6F4EC', color: '#1B8A5A', border: '1px solid #C9E6D6' }}
            >
              {active.length}
            </span>
          )}
        </div>

        {loadingRels ? (
          <LoadingSkeleton />
        ) : active.length === 0 ? (
          <EmptyState icon={<UserCheck className="w-8 h-8" />} message={L.noActive} />
        ) : (
          <div className="space-y-3">
            {active.map((rel) => (
              <ActiveCard
                key={rel.id}
                rel={rel}
                lang={lang}
                L={L}
                onRevoke={() => setRevokeTarget(rel)}
                onModify={() => openApproveModal(rel)}
                revokingId={revokingId}
              />
            ))}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 4 — PAST / REVOKED (collapsible)
          ══════════════════════════════════════════════════════ */}
      <section className="mb-6">
        <button
          onClick={() => setShowPast((v) => !v)}
          className="flex items-center gap-2 mb-3 w-full text-start group"
          aria-expanded={showPast}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: 'var(--text-muted)' }}
          />
          <h2
            className="text-[14.5px] font-bold group-hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
          >
            {L.pastSection}
          </h2>
          {past.length > 0 && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              {past.length}
            </span>
          )}
          <span className="ms-auto" style={{ color: 'var(--text-muted)' }}>
            {showPast ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        </button>

        {showPast && (
          loadingRels ? (
            <LoadingSkeleton />
          ) : past.length === 0 ? (
            <EmptyState icon={<UserX className="w-8 h-8" />} message={L.noPast} />
          ) : (
            <div className="space-y-3">
              {past.map((rel) => (
                <PastCard key={rel.id} rel={rel} lang={lang} L={L} />
              ))}
            </div>
          )
        )}
      </section>

      {/* ══════════════════════════════════════════════════════
          MODALS
          ══════════════════════════════════════════════════════ */}

      {/* Approve / Modify Permissions Modal */}
      {approveTarget && (
        <Modal title={L.approveModalTitle} onClose={() => setApproveTarget(null)}>
          <div dir={isRtl ? 'rtl' : 'ltr'}>
            {/* Clinician summary */}
            <div
              className="flex items-center gap-3 p-3 rounded-xl mb-4"
              style={{ backgroundColor: 'var(--surface-alt)', border: '1px solid var(--border)' }}
            >
              <Avatar name={clinicianName(approveTarget.clinician, lang)} size={36} />
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {clinicianName(approveTarget.clinician, lang)}
                </p>
                {approveTarget.clinician.specialty && (
                  <p className="text-[11.5px] truncate" style={{ color: 'var(--text-muted)' }}>
                    {approveTarget.clinician.specialty}
                  </p>
                )}
              </div>
            </div>

            <p className="text-[12.5px] mb-4" style={{ color: 'var(--text-secondary)' }}>
              {L.approveModalHint}
            </p>

            {/* Grant all / none shortcuts */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setApprovePerms(new Set(ALL_PERMISSION_KEYS))}
                className="text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: '#E6F4EC', color: '#1B8A5A', border: '1px solid #C9E6D6' }}
              >
                {L.grantAll}
              </button>
              <button
                onClick={() => setApprovePerms(new Set())}
                className="text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                {L.grantNone}
              </button>
            </div>

            {/* Permission checkboxes */}
            <div className="space-y-2 mb-5">
              {ALL_PERMISSION_KEYS.map((key) => {
                const checked = approvePerms.has(key)
                return (
                  <label
                    key={key}
                    className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors hover:bg-opacity-50"
                    style={{
                      backgroundColor: checked ? '#EAF2F9' : 'var(--surface-alt)',
                      border: `1px solid ${checked ? '#A9CFE7' : 'var(--border)'}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePerm(key)}
                      className="w-4 h-4 rounded accent-[#1D6296] flex-shrink-0"
                    />
                    <span
                      className="text-[13px] font-medium"
                      style={{ color: checked ? '#1D6296' : 'var(--text-secondary)' }}
                    >
                      {PERMISSION_LABELS[key][lang]}
                    </span>
                  </label>
                )
              })}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={!!approvingId}
                className="flex-1 flex items-center justify-center gap-2 text-[13.5px] font-semibold py-2.5 rounded-xl text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#1D6296' }}
              >
                {approvingId === approveTarget.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {L.confirmApprove}
              </button>
              <button
                onClick={() => setApproveTarget(null)}
                className="btn-ghost text-[13.5px]"
              >
                {L.cancelApprove}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Confirmation Modal */}
      {rejectTarget && (
        <Modal title={L.confirmRejectTitle} onClose={() => setRejectTarget(null)}>
          <div dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex items-start gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#FDE8E8' }}
              >
                <AlertTriangle className="w-5 h-5" style={{ color: '#C02A2A' }} />
              </div>
              <div>
                <p className="text-[14px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {clinicianName(rejectTarget.clinician, lang)}
                </p>
                <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  {L.confirmRejectBody}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={!!rejectingId}
                className="flex-1 flex items-center justify-center gap-2 text-[13.5px] font-semibold py-2.5 rounded-xl text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#C02A2A' }}
              >
                {rejectingId === rejectTarget.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserX className="w-4 h-4" />
                )}
                {L.confirmReject}
              </button>
              <button
                onClick={() => setRejectTarget(null)}
                className="btn-ghost text-[13.5px]"
              >
                {L.cancelReject}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Revoke Confirmation Modal */}
      {revokeTarget && (
        <Modal title={L.confirmRevokeTitle} onClose={() => setRevokeTarget(null)}>
          <div dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex items-start gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#FDE8E8' }}
              >
                <ShieldOff className="w-5 h-5" style={{ color: '#C02A2A' }} />
              </div>
              <div>
                <p className="text-[14px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {clinicianName(revokeTarget.clinician, lang)}
                </p>
                <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  {L.confirmRevokeBody}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRevoke}
                disabled={!!revokingId}
                className="flex-1 flex items-center justify-center gap-2 text-[13.5px] font-semibold py-2.5 rounded-xl text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#C02A2A' }}
              >
                {revokingId === revokeTarget.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldOff className="w-4 h-4" />
                )}
                {L.confirmRevoke}
              </button>
              <button
                onClick={() => setRevokeTarget(null)}
                className="btn-ghost text-[13.5px]"
              >
                {L.cancelRevoke}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Regenerate Warning Modal */}
      {showRegenWarning && (
        <Modal title={L.regenerateWarningTitle} onClose={() => setShowRegenWarning(false)}>
          <div dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex items-start gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#FBF1DC' }}
              >
                <AlertTriangle className="w-5 h-5" style={{ color: '#B07A12' }} />
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {L.regenerateWarningBody}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRegenerate}
                className="flex-1 flex items-center justify-center gap-2 text-[13.5px] font-semibold py-2.5 rounded-xl text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#B07A12' }}
              >
                <RefreshCw className="w-4 h-4" />
                {L.confirmRegenerate}
              </button>
              <button
                onClick={() => setShowRegenWarning(false)}
                className="btn-ghost text-[13.5px]"
              >
                {L.cancelRegenerate}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Card components ──────────────────────────────────────────────────────────

interface CardLabels {
  approve: string
  reject: string
  revokeAccess: string
  modifyPermissions: string
  requestedPerms: string
  grantedPerms: string
  requestedOn: string
  revokedOn: string
  respondedOn: string
  lastAccess: string
  status: { rejected: string; revoked: string }
}

function PendingCard({
  rel,
  lang,
  L,
  onApprove,
  onReject,
  rejectingId,
}: {
  rel: Relationship
  lang: Lang
  L: CardLabels
  onApprove: () => void
  onReject: () => void
  rejectingId: string | null
}) {
  const name = clinicianName(rel.clinician, lang)
  const requestedPerms = ALL_PERMISSION_KEYS.filter((k) =>
    rel.permissions.some((p) => p.permission_key === k && p.granted)
  )

  return (
    <div
      className="card p-5"
      style={{ borderLeft: '3px solid #F3650A' }}
    >
      <div className="flex items-start gap-3 mb-4">
        <Avatar name={name} size={44} />
        <div className="flex-1 min-w-0">
          <p className="text-[14.5px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
            {name}
          </p>
          {rel.clinician.professional_title && (
            <p className="text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>
              {rel.clinician.professional_title}
            </p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {rel.clinician.specialty && (
              <span className="flex items-center gap-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                <Stethoscope className="w-3 h-3 flex-shrink-0" />
                {rel.clinician.specialty}
              </span>
            )}
            {rel.clinician.organization && (
              <span className="flex items-center gap-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                <Building2 className="w-3 h-3 flex-shrink-0" />
                {rel.clinician.organization}
              </span>
            )}
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
            {L.requestedOn}: {formatDate(rel.requested_at, lang)}
          </p>
        </div>
      </div>

      {/* Requested permissions */}
      {requestedPerms.length > 0 && (
        <div className="mb-4">
          <p className="text-[11.5px] font-semibold mb-2" style={{ color: 'var(--text-label)' }}>
            {L.requestedPerms}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {requestedPerms.map((k) => (
              <span
                key={k}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                style={{ backgroundColor: '#FEF2EC', color: '#C2560A', border: '1px solid #F8D8C2' }}
              >
                {PERMISSION_LABELS[k][lang]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={onApprove}
          className="flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1D6296' }}
        >
          <UserCheck className="w-3.5 h-3.5" />
          {L.approve}
        </button>
        <button
          onClick={onReject}
          disabled={rejectingId === rel.id}
          className="flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-xl disabled:opacity-50 transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#FDE8E8', color: '#C02A2A', border: '1px solid #F8C8C8' }}
        >
          {rejectingId === rel.id ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <UserX className="w-3.5 h-3.5" />
          )}
          {L.reject}
        </button>
      </div>
    </div>
  )
}

function ActiveCard({
  rel,
  lang,
  L,
  onRevoke,
  onModify,
  revokingId,
}: {
  rel: Relationship
  lang: Lang
  L: CardLabels
  onRevoke: () => void
  onModify: () => void
  revokingId: string | null
}) {
  const name = clinicianName(rel.clinician, lang)
  const [expanded, setExpanded] = useState(false)
  const grantedPerms = rel.permissions.filter((p) => p.granted).map((p) => p.permission_key)
  const deniedPerms = ALL_PERMISSION_KEYS.filter(
    (k) => !rel.permissions.some((p) => p.permission_key === k && p.granted)
  )

  return (
    <div
      className="card p-5"
      style={{ borderLeft: '3px solid #1B8A5A' }}
    >
      <div className="flex items-start gap-3 mb-3">
        <Avatar name={name} size={44} />
        <div className="flex-1 min-w-0">
          <p className="text-[14.5px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
            {name}
          </p>
          {rel.clinician.professional_title && (
            <p className="text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>
              {rel.clinician.professional_title}
            </p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {rel.clinician.specialty && (
              <span className="flex items-center gap-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                <Stethoscope className="w-3 h-3 flex-shrink-0" />
                {rel.clinician.specialty}
              </span>
            )}
            {rel.clinician.organization && (
              <span className="flex items-center gap-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                <Building2 className="w-3 h-3 flex-shrink-0" />
                {rel.clinician.organization}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0 mt-1">
            {rel.responded_at && (
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {L.respondedOn}: {formatDate(rel.responded_at, lang)}
              </p>
            )}
            {rel.last_access_at && (
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {L.lastAccess}: {formatDate(rel.last_access_at, lang)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Permission badges summary */}
      <div className="mb-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-[12px] font-semibold mb-2 hover:opacity-80 transition-opacity"
          style={{ color: 'var(--text-label)' }}
        >
          {L.grantedPerms} ({grantedPerms.length}/{ALL_PERMISSION_KEYS.length})
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {expanded ? (
          <div className="flex flex-wrap gap-1.5">
            {ALL_PERMISSION_KEYS.map((k) => (
              <PermissionBadge
                key={k}
                permKey={k}
                granted={grantedPerms.includes(k)}
                lang={lang}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {grantedPerms.slice(0, 4).map((k) => (
              <PermissionBadge key={k} permKey={k} granted lang={lang} />
            ))}
            {grantedPerms.length > 4 && (
              <span
                className="text-[11.5px] font-medium px-2.5 py-1 rounded-full cursor-pointer hover:opacity-80"
                style={{ backgroundColor: '#EAF2F9', color: '#1D6296', border: '1px solid #A9CFE7' }}
                onClick={() => setExpanded(true)}
              >
                +{grantedPerms.length - 4}
              </span>
            )}
            {grantedPerms.length === 0 && (
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>—</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap border-t pt-3" style={{ borderColor: 'var(--divider)' }}>
        <button
          onClick={onModify}
          className="flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-xl transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#EAF2F9', color: '#1D6296', border: '1px solid #A9CFE7' }}
        >
          <Settings className="w-3.5 h-3.5" />
          {L.modifyPermissions}
        </button>
        <button
          onClick={onRevoke}
          disabled={revokingId === rel.id}
          className="flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-xl disabled:opacity-50 transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#FDE8E8', color: '#C02A2A', border: '1px solid #F8C8C8' }}
        >
          {revokingId === rel.id ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ShieldOff className="w-3.5 h-3.5" />
          )}
          {L.revokeAccess}
        </button>
      </div>
    </div>
  )
}

function PastCard({
  rel,
  lang,
  L,
}: {
  rel: Relationship
  lang: Lang
  L: CardLabels
}) {
  const name = clinicianName(rel.clinician, lang)
  const isRejected = rel.status === 'rejected'

  return (
    <div
      className="card p-5 opacity-75"
      style={{ borderLeft: '3px solid var(--border)' }}
    >
      <div className="flex items-start gap-3">
        <Avatar name={name} size={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-[14px] font-bold truncate" style={{ color: 'var(--text-secondary)' }}>
              {name}
            </p>
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: isRejected ? '#FDE8E8' : 'var(--surface-alt)',
                color: isRejected ? '#C02A2A' : 'var(--text-muted)',
                border: `1px solid ${isRejected ? '#F8C8C8' : 'var(--border)'}`,
              }}
            >
              {isRejected ? L.status.rejected : L.status.revoked}
            </span>
          </div>
          {rel.clinician.specialty && (
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {rel.clinician.specialty}
              {rel.clinician.organization ? ` · ${rel.clinician.organization}` : ''}
            </p>
          )}
          <div className="mt-1 space-y-0.5">
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {L.requestedOn}: {formatDate(rel.requested_at, lang)}
            </p>
            {rel.revoked_at && (
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {L.revokedOn}: {formatDate(rel.revoked_at, lang)}
              </p>
            )}
            {rel.responded_at && isRejected && (
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {L.respondedOn}: {formatDate(rel.responded_at, lang)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Utility UI ───────────────────────────────────────────────────────────────

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div
      className="card-sm px-6 py-10 text-center"
      style={{ backgroundColor: 'var(--surface-alt)' }}
    >
      <div
        className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-3"
        style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)' }}
      >
        {icon}
      </div>
      <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
        {message}
      </p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="card p-5 animate-pulse"
          style={{ minHeight: 120 }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-11 h-11 rounded-full flex-shrink-0"
              style={{ backgroundColor: 'var(--surface-alt)' }}
            />
            <div className="flex-1 space-y-2">
              <div
                className="h-3.5 rounded-full w-40"
                style={{ backgroundColor: 'var(--surface-alt)' }}
              />
              <div
                className="h-3 rounded-full w-24"
                style={{ backgroundColor: 'var(--surface-alt)' }}
              />
              <div
                className="h-3 rounded-full w-32"
                style={{ backgroundColor: 'var(--surface-alt)' }}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <div
              className="h-8 rounded-xl w-24"
              style={{ backgroundColor: 'var(--surface-alt)' }}
            />
            <div
              className="h-8 rounded-xl w-20"
              style={{ backgroundColor: 'var(--surface-alt)' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
