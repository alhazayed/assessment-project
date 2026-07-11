import { headers } from 'next/headers'
import Link from 'next/link'
import {
  ShieldCheck,
  Building2,
  Stethoscope,
  Clock,
  BadgeCheck,
  AlertCircle,
  Eye,
  FileText,
  History,
  BarChart2,
  TrendingUp,
  Smile,
  Download,
  MessageSquare,
  Upload,
  ClipboardList,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'
import BrandLogo from '@/components/brand-logo'

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvitationData {
  clinician_name: string | null
  clinician_name_ar: string | null
  specialty: string | null
  organization: string | null
  message: string | null
  requested_permissions: string[]
  expires_at: string
}

type Lang = 'ar' | 'en'

// ─── Permission map ───────────────────────────────────────────────────────────

const PERMISSION_LABELS: Record<string, { en: string; ar: string; icon: React.ElementType }> = {
  view_profile: {
    en: 'Your profile information',
    ar: 'معلومات ملفك الشخصي',
    icon: Eye,
  },
  view_assessment_results: {
    en: 'Your assessment results',
    ar: 'نتائج تقييماتك',
    icon: BarChart2,
  },
  view_assessment_history: {
    en: 'Your full assessment history',
    ar: 'سجل تقييماتك الكامل',
    icon: History,
  },
  view_reports: {
    en: 'Your clinical reports',
    ar: 'تقاريرك السريرية',
    icon: FileText,
  },
  view_progress_tracking: {
    en: 'Your progress over time',
    ar: 'تقدمك عبر الزمن',
    icon: TrendingUp,
  },
  view_mood_tracking: {
    en: 'Your mood logs',
    ar: 'سجلات مزاجك',
    icon: Smile,
  },
  export_reports: {
    en: 'Ability to export your reports',
    ar: 'صلاحية تصدير تقاريرك',
    icon: Download,
  },
  message_patient: {
    en: 'Send you secure messages',
    ar: 'إرسال رسائل آمنة إليك',
    icon: MessageSquare,
  },
  upload_documents: {
    en: 'Upload documents to your profile',
    ar: 'رفع مستندات إلى ملفك',
    icon: Upload,
  },
  generate_clinical_notes: {
    en: 'Create clinical notes about your sessions',
    ar: 'إنشاء ملاحظات سريرية عن جلساتك',
    icon: ClipboardList,
  },
}

// ─── Language detection ───────────────────────────────────────────────────────

async function detectLang(): Promise<Lang> {
  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') ?? ''
  if (acceptLanguage.toLowerCase().startsWith('en')) return 'en'
  return 'ar'
}

// ─── Server data fetch ────────────────────────────────────────────────────────

async function fetchInvitation(
  token: string
): Promise<{ invitation: InvitationData } | { error: string; status: number }> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const url = `${siteUrl}/api/connect/${encodeURIComponent(token)}`

  let res: Response
  try {
    res = await fetch(url, { cache: 'no-store' })
  } catch {
    return { error: 'network', status: 500 }
  }

  if (res.status === 404 || res.status === 410) {
    return { error: 'not_found', status: res.status }
  }

  if (!res.ok) {
    return { error: 'server_error', status: res.status }
  }

  const body = await res.json()
  return { invitation: body.invitation }
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function ErrorState({ lang }: { lang: Lang }) {
  const isRtl = lang === 'ar'
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--page-bg)' }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-50 safe-top safe-x"
        style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-2.5">
          <BrandLogo variant="icon" size={36} />
          <span
            className="text-base font-extrabold tracking-tight"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
          >
            V Welfare
          </span>
        </div>
      </header>

      <main
        id="main-content"
        className="flex-1 flex items-center justify-center px-6 py-20"
      >
        <div className="max-w-md w-full text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
            style={{ background: '#FDE8E8' }}
          >
            <AlertCircle className="w-8 h-8" style={{ color: '#C02A2A' }} />
          </div>
          <h1
            className="text-2xl font-extrabold mb-3"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
          >
            {isRtl ? 'الدعوة غير صالحة' : 'Invitation Not Found'}
          </h1>
          <p
            className="text-[15px] leading-relaxed mb-8"
            style={{ color: 'var(--text-secondary)' }}
          >
            {isRtl
              ? 'انتهت صلاحية هذه الدعوة أو أنها غير صالحة. تواصل مع طبيبك للحصول على رابط جديد.'
              : 'This invitation has expired or is invalid. Please ask your clinician to send you a new invitation link.'}
          </p>
          <Link
            href="/"
            className="btn-ghost inline-flex items-center gap-2"
          >
            {isRtl ? 'العودة إلى الرئيسية' : 'Back to home'}
            {isRtl ? (
              <ArrowRight className="w-4 h-4 rotate-180" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
          </Link>
        </div>
      </main>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ConnectTokenPage(
  props: {
    params: Promise<{ token: string }>
  }
) {
  const params = await props.params;
  const lang = await detectLang()
  const isRtl = lang === 'ar'
  const { token } = params

  const result = await fetchInvitation(token)

  if ('error' in result) {
    return <ErrorState lang={lang} />
  }

  const { invitation } = result

  const clinicianName = isRtl
    ? (invitation.clinician_name_ar ?? invitation.clinician_name ?? (isRtl ? 'الطبيب' : 'Clinician'))
    : (invitation.clinician_name ?? (isRtl ? 'الطبيب' : 'Clinician'))

  const permissions = Array.isArray(invitation.requested_permissions)
    ? invitation.requested_permissions
    : []

  const expiresAt = new Date(invitation.expires_at)
  const expiresFormatted = expiresAt.toLocaleDateString(isRtl ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const acceptHref = `/connect/${token}/accept`
  const loginRedirectHref = `/login?next=${encodeURIComponent(acceptHref)}`
  const declineHref = `/connect/${token}/decline`

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--page-bg)' }}
      dir={isRtl ? 'rtl' : 'ltr'}
      lang={lang}
    >
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-blue-700 focus:rounded focus:shadow-lg"
      >
        {isRtl ? 'تخطي إلى المحتوى الرئيسي' : 'Skip to main content'}
      </a>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-50 safe-top safe-x"
        style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-2.5">
          <BrandLogo variant="icon" size={36} />
          <span
            className="text-base font-extrabold tracking-tight"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
          >
            V Welfare
          </span>
        </div>
      </header>

      {/* ── Main ── */}
      <main
        id="main-content"
        className="flex-1 w-full max-w-2xl mx-auto px-4 py-10 sm:py-16"
      >
        {/* Hero heading */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
            style={{ background: '#EAF2F9' }}
            aria-hidden="true"
          >
            <ShieldCheck className="w-7 h-7" style={{ color: '#1D6296' }} />
          </div>
          <h1
            className="text-3xl sm:text-[34px] font-extrabold mb-3"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
          >
            {isRtl ? 'لديك دعوة' : "You've been invited"}
          </h1>
          <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>
            {isRtl
              ? 'مراجعة طلب وصول الطبيب قبل القبول'
              : 'Review the clinician access request before accepting'}
          </p>
        </div>

        {/* ── Clinician info card ── */}
        <div
          className="rounded-2xl p-6 mb-5"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 1px 3px rgba(18,39,60,0.06)',
          }}
          aria-label={isRtl ? 'معلومات الطبيب' : 'Clinician information'}
        >
          {/* Avatar placeholder + name row */}
          <div className="flex items-start gap-4">
            <div
              className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl"
              style={{ background: '#EAF2F9', color: '#1D6296' }}
              aria-hidden="true"
            >
              {clinicianName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  className="text-[17px] font-bold truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {clinicianName}
                </h2>
                {/* Verified badge */}
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5"
                  style={{
                    background: '#E6F4EC',
                    color: '#1B8A5A',
                    border: '1px solid #A8DFBE',
                  }}
                  title={isRtl ? 'طبيب موثق' : 'Verified clinician'}
                >
                  <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  {isRtl ? 'موثق' : 'Verified'}
                </span>
              </div>

              {/* Specialty */}
              {invitation.specialty && (
                <div
                  className="flex items-center gap-1.5 mt-1 text-[13.5px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Stethoscope className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                  <span>{invitation.specialty}</span>
                </div>
              )}

              {/* Organization */}
              {invitation.organization && (
                <div
                  className="flex items-center gap-1.5 mt-1 text-[13.5px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                  <span>{invitation.organization}</span>
                </div>
              )}
            </div>
          </div>

          {/* Expiry notice */}
          <div
            className="mt-4 pt-4 flex items-center gap-2 text-[13px]"
            style={{
              borderTop: '1px solid var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            <Clock className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span>
              {isRtl
                ? `تنتهي صلاحية هذه الدعوة في ${expiresFormatted}`
                : `This invitation expires on ${expiresFormatted}`}
            </span>
          </div>
        </div>

        {/* ── Permissions card ── */}
        {permissions.length > 0 && (
          <div
            className="rounded-2xl p-6 mb-5"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(18,39,60,0.06)',
            }}
          >
            <h3
              className="text-[14px] font-bold uppercase tracking-wide mb-4"
              style={{ color: 'var(--text-muted)' }}
            >
              {isRtl
                ? 'هذا الطبيب يطلب الوصول إلى:'
                : 'This clinician is requesting access to:'}
            </h3>

            <ul className="space-y-3" role="list" aria-label={isRtl ? 'الأذونات المطلوبة' : 'Requested permissions'}>
              {permissions.map((key) => {
                const def = PERMISSION_LABELS[key]
                if (!def) return null
                const Icon = def.icon
                const label = isRtl ? def.ar : def.en
                return (
                  <li
                    key={key}
                    className="flex items-center gap-3"
                  >
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: '#EAF2F9' }}
                      aria-hidden="true"
                    >
                      <Icon className="w-4 h-4" style={{ color: '#1D6296' }} />
                    </div>
                    <span
                      className="text-[14px]"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {label}
                    </span>
                    <ChevronRight
                      className="w-3.5 h-3.5 ms-auto flex-shrink-0 opacity-30"
                      aria-hidden="true"
                    />
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* ── Clinician message ── */}
        {invitation.message && (
          <div
            className="rounded-2xl p-6 mb-5"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(18,39,60,0.06)',
            }}
          >
            <h3
              className="text-[13px] font-bold uppercase tracking-wide mb-3"
              style={{ color: 'var(--text-muted)' }}
            >
              {isRtl ? 'رسالة من الطبيب' : 'Message from clinician'}
            </h3>
            <blockquote
              className="text-[14.5px] leading-relaxed italic"
              style={{
                color: 'var(--text-secondary)',
                borderInlineStart: '3px solid #1D6296',
                paddingInlineStart: '14px',
              }}
            >
              {invitation.message}
            </blockquote>
          </div>
        )}

        {/* ── CTAs ── */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          {/* Accept */}
          <Link
            href={loginRedirectHref}
            className="btn-accent flex-1 text-center text-[15px] font-bold py-3.5 px-6 rounded-[11px]"
            style={{ display: 'block' }}
          >
            {isRtl ? 'قبول الدعوة' : 'Accept Invitation'}
          </Link>

          {/* Decline */}
          <Link
            href={declineHref}
            className="btn-ghost flex-1 text-center text-[15px] py-3.5 px-6 rounded-[11px]"
            style={{ display: 'block' }}
          >
            {isRtl ? 'رفض' : 'Decline'}
          </Link>
        </div>

        {/* ── Footer note ── */}
        <p
          className="text-center text-[13px] mt-5 leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          {isRtl
            ? 'يمكنك تعديل أو سحب أذونات الوصول في أي وقت من لوحة'
            : 'You can modify or revoke access at any time from your'}
          {' '}
          <Link
            href="/patient/clinicians"
            className="font-semibold underline underline-offset-2"
            style={{ color: '#1D6296' }}
          >
            {isRtl ? 'إدارة الأطباء' : 'Clinicians dashboard'}
          </Link>
          {isRtl ? '.' : '.'}
        </p>

        {/* ── Security note ── */}
        <div
          className="mt-8 rounded-xl p-4 flex items-start gap-3"
          style={{ background: '#EAF2F9', border: '1px solid #A9CFE7' }}
          role="note"
          aria-label={isRtl ? 'ملاحظة أمان' : 'Security note'}
        >
          <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#1D6296' }} aria-hidden="true" />
          <p className="text-[13px] leading-relaxed" style={{ color: '#1D6296' }}>
            {isRtl
              ? 'V Welfare تحمي بياناتك. لن يتمكن الطبيب من الوصول إلا للمعلومات التي تأذن بها صراحةً. يمكنك سحب الوصول في أي وقت.'
              : 'V Welfare protects your data. The clinician will only access information you explicitly permit. You can revoke access at any time.'}
          </p>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer
        className="py-6 text-center text-[12.5px]"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        <p>
          {isRtl ? '© 2025 V Welfare. جميع الحقوق محفوظة.' : '© 2025 V Welfare. All rights reserved.'}
          {' · '}
          <Link href="/privacy" style={{ color: 'var(--text-muted)' }} className="underline underline-offset-2 hover:opacity-80">
            {isRtl ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </Link>
          {' · '}
          <Link href="/terms" style={{ color: 'var(--text-muted)' }} className="underline underline-offset-2 hover:opacity-80">
            {isRtl ? 'شروط الاستخدام' : 'Terms of Use'}
          </Link>
        </p>
      </footer>
    </div>
  )
}
