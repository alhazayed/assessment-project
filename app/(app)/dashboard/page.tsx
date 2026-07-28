import { createClient } from '@/lib/supabase/server'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import { localizeSeverity } from '@/lib/severity-labels'
import { getProfileCompletion } from '@/lib/profile-completion'
import { PULSE_CODES } from '@/lib/self-knowledge'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, Heart, TrendingUp, AlertTriangle, CheckCircle2, ArrowRight, Activity, ChevronRight, Sparkles } from 'lucide-react'
import type { Profile, AssessmentSubmission, MoodLog, AssessmentAssignment } from '@/lib/types'
import CrisisBanner from '@/components/crisis-banner'
import ProfileCompletionBanner from '@/components/profile-completion-banner'
import PulseCheckinCard, { type PulseItem } from '@/components/pulse-checkin-card'
import SelfMapLink from '@/components/self-map-link'
import LearnedTimeline, { type TimelineEntry } from '@/components/learned-timeline'
import GuestClaimOnAuth from '@/components/guest-claim-on-auth'

async function getPatientDashboard(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const [submissions, moods, assignments, totalCountRes, pulseDefs, latestByCode] = await Promise.all([
    supabase
      .from('assessment_submissions')
      .select('*, assessment_definitions(name_en, name_ar, code)')
      .eq('patient_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(8),
    supabase
      .from('mood_logs')
      .select('*')
      .eq('patient_id', userId)
      .order('log_date', { ascending: false })
      .limit(7),
    supabase
      .from('assessment_assignments')
      .select('*, assessment_definitions(name_en, name_ar, code)')
      .eq('patient_id', userId)
      .eq('status', 'pending')
      .limit(3),
    supabase
      .from('assessment_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', userId),
    supabase
      .from('assessment_definitions')
      .select('id, code, name_en, name_ar, total_questions')
      .eq('is_active', true)
      .in('code', [...PULSE_CODES]),
    supabase
      .from('assessment_submissions')
      .select('definition_id, submitted_at, assessment_definitions(code)')
      .eq('patient_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(50),
  ])

  return {
    submissions: submissions.data || [],
    moods: moods.data || [],
    pendingAssignments: assignments.data || [],
    totalCompleted: totalCountRes.count ?? 0,
    pulseDefs: pulseDefs.data || [],
    latestByCode: latestByCode.data || [],
  }
}

function severityBadge(band: string) {
  const b = band.toLowerCase()
  if (b.includes('minimal') || b.includes('none') || b.includes('normal')) return 'badge-minimal'
  if (b.includes('mild')) return 'badge-mild'
  if (b.includes('moderate')) return 'badge-moderate'
  return 'badge-severe'
}

function buildPulseItems(
  lang: 'en' | 'ar',
  pulseDefs: Array<{ id: string; code: string; name_en: string; name_ar: string | null; total_questions: number }>,
  latestByCode: Array<{ definition_id: string; submitted_at: string; assessment_definitions: { code: string } | null }>,
  totalCompleted: number
): PulseItem[] {
  const lastByCode = new Map<string, Date>()
  for (const row of latestByCode) {
    const code = row.assessment_definitions?.code
    if (!code || lastByCode.has(code)) continue
    lastByCode.set(code, new Date(row.submitted_at))
  }

  const now = Date.now()
  const items: PulseItem[] = []

  for (const code of PULSE_CODES) {
    const def = pulseDefs.find(d => d.code === code)
    if (!def) continue
    const last = lastByCode.get(code)
    const daysSince = last ? (now - last.getTime()) / (1000 * 60 * 60 * 24) : Infinity
    // Suggest if never taken, or due for a pulse (≥14 days for brief scales)
    if (daysSince < 14 && totalCompleted > 0) continue

    const reasonEn =
      !last
        ? totalCompleted === 0
          ? 'Start with a short first insight'
          : 'Not taken yet — a good pulse check'
        : `Last taken ${Math.round(daysSince)} days ago`
    const reasonAr =
      !last
        ? totalCompleted === 0
          ? 'ابدأ برؤية قصيرة أولى'
          : 'لم يُؤخذ بعد — نبضة مناسبة'
        : `آخر مرة منذ ${Math.round(daysSince)} يوماً`

    items.push({
      id: def.id,
      code: def.code,
      name_en: def.name_en,
      name_ar: def.name_ar,
      total_questions: def.total_questions,
      reasonEn,
      reasonAr,
    })
  }

  return items.slice(0, 3)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const lang = await getLanguage()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: patientProfile }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('patient_profiles').select('employment_status, has_psychiatric_medications, onboarding_completed_at, consent_given_at').eq('id', user.id).single(),
  ])

  const p = profile as Profile | null

  if (p?.role === 'admin' || p?.role === 'superadmin') redirect('/x/control')

  const profileCompletion = getProfileCompletion(profile, patientProfile)
  const { submissions, moods, pendingAssignments, totalCompleted, pulseDefs, latestByCode } = await getPatientDashboard(supabase, user.id)
  const latestMood = moods[0] as MoodLog | undefined
  const avgMood = moods.length > 0 ? Math.round(moods.reduce((sum, m) => sum + m.mood_score, 0) / moods.length) : null
  const rawName = p ? (lang === 'ar' && p.full_name_ar ? p.full_name_ar : p.full_name_en) : ''
  const firstName = (rawName || user.email?.split('@')[0] || '').split(' ')[0]
  const pulseItems = buildPulseItems(
    lang,
    pulseDefs as Array<{ id: string; code: string; name_en: string; name_ar: string | null; total_questions: number }>,
    (latestByCode as unknown as Array<{ definition_id: string; submitted_at: string; assessment_definitions: { code: string } | null }>),
    totalCompleted
  )

  const timelineEntries: TimelineEntry[] = (submissions as AssessmentSubmission[]).map(s => {
    const def = (s as AssessmentSubmission & { assessment_definitions?: { name_en: string; name_ar: string; code: string } }).assessment_definitions
    return {
      id: s.id,
      definitionId: s.definition_id,
      code: def?.code ?? '',
      nameEn: def?.name_en ?? '',
      nameAr: def?.name_ar ?? null,
      score: s.total_score,
      band: s.severity_band,
      submittedAt: s.submitted_at,
      highRisk: s.high_risk_flag,
    }
  })

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-6xl">
      <GuestClaimOnAuth />
      <CrisisBanner lang={lang} />

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          {t('dashboard.welcome', lang)}, {firstName}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>{t('dashboard.subtitle', lang)}</p>
      </div>

      {!patientProfile?.consent_given_at && (
        <div className="mb-5 p-4 rounded-xl" style={{ background: '#FEF2EC', border: '1px solid #FBC29D' }}>
          <p className="text-[13.5px] font-semibold mb-1" style={{ color: '#C2560A' }}>
            {lang === 'ar' ? 'الموافقة المستنيرة مطلوبة' : 'Informed consent needed'}
          </p>
          <p className="text-[13px] mb-2" style={{ color: 'var(--text-secondary)' }}>
            {lang === 'ar'
              ? 'قبل حفظ نتائج التقييمات، يرجى تأكيد موافقتك في الملف الشخصي.'
              : 'Before saving assessment results, please confirm consent in your profile.'}
          </p>
          <Link href="/profile#consent" className="text-[13px] font-semibold" style={{ color: '#F3650A' }}>
            {lang === 'ar' ? 'فتح الملف الشخصي' : 'Open profile'} →
          </Link>
        </div>
      )}

      {!profileCompletion.isComplete && (
        <ProfileCompletionBanner
          lang={lang}
          completed={profileCompletion.completed}
          total={profileCompletion.total}
          showOnboardingLink={!patientProfile?.onboarding_completed_at}
        />
      )}

      {totalCompleted === 0 && (
        <div className="mb-6 card p-5 flex flex-col sm:flex-row sm:items-center gap-4" style={{ borderInlineStart: '4px solid var(--vw-blue)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EAF2F9' }}>
            <Sparkles className="w-5 h-5" style={{ color: 'var(--vw-blue)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {lang === 'ar' ? 'ابدأ أول رؤية عن نفسك' : 'Start your first insight'}
            </p>
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              {lang === 'ar'
                ? 'اختر ما تريد فهمه — مزاج، قلق، نوم، أو شخصية — وسنقترح تقييماً مناسباً.'
                : 'Pick what you want to understand — mood, anxiety, sleep, or personality — and we’ll suggest a fitting assessment.'}
            </p>
          </div>
          <Link href="/first-insight" className="btn-primary flex-shrink-0">
            {lang === 'ar' ? 'ابدأ' : 'Begin'}
          </Link>
        </div>
      )}

      {pendingAssignments.length > 0 && (
        <div className="safety-strip mb-6">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#F3650A' }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              {t('dashboard.assignments.title', lang)}
            </p>
            <div className="flex flex-wrap gap-2">
              {pendingAssignments.map((a: AssessmentAssignment) => {
                const def = (a as AssessmentAssignment & { assessment_definitions?: { name_en: string; name_ar: string } }).assessment_definitions
                const aName = lang === 'ar' && def?.name_ar ? def.name_ar : def?.name_en
                return (
                  <Link
                    key={a.id}
                    href={`/assessments/${a.definition_id}?assignment=${a.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12.5px] font-semibold transition-opacity hover:opacity-80"
                    style={{ background: '#FEF2EC', color: '#F3650A', border: '1px solid #FBC29D' }}
                  >
                    {aName}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <PulseCheckinCard lang={lang} items={pulseItems} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-7">
        <SelfMapLink lang={lang} />
        <LearnedTimeline lang={lang} entries={timelineEntries} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <span className="stat-label">{t('dashboard.mood.card', lang)}</span>
            <div className="stat-icon" style={{ background: '#FDE8E8' }}>
              <Heart className="w-5 h-5" style={{ color: '#C02A2A' }} />
            </div>
          </div>
          {latestMood ? (
            <>
              <p className="stat-value">{latestMood.mood_score}<span className="text-lg font-normal" style={{ color: 'var(--text-muted)' }}>/10</span></p>
              <p className="stat-sub">{latestMood.log_date}</p>
            </>
          ) : (
            <>
              <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                {lang === 'ar' ? 'لم تسجّل مزاجك اليوم بعد' : "You haven't logged today yet"}
              </p>
              <Link href="/mood" className="text-[13px] font-semibold" style={{ color: '#1D6296' }}>
                {t('dashboard.mood.log', lang)}
              </Link>
            </>
          )}
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <span className="stat-label">{t('dashboard.mood.avg', lang)}</span>
            <div className="stat-icon" style={{ background: '#EAF2F9' }}>
              <TrendingUp className="w-5 h-5" style={{ color: '#1D6296' }} />
            </div>
          </div>
          {avgMood !== null ? (
            <>
              <p className="stat-value">{avgMood}<span className="text-lg font-normal" style={{ color: 'var(--text-muted)' }}>/10</span></p>
              <p className="stat-sub">{lang === 'ar' ? `آخر ${moods.length} ${moods.length === 1 ? 'يوم' : 'أيام'}` : `Last ${moods.length} ${moods.length === 1 ? 'day' : 'days'}`}</p>
            </>
          ) : (
            <p className="stat-sub mt-2">{t('dashboard.mood.no_data', lang)}</p>
          )}
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <span className="stat-label">{t('dashboard.done', lang)}</span>
            <div className="stat-icon" style={{ background: '#E6F4EC' }}>
              <CheckCircle2 className="w-5 h-5" style={{ color: '#1B8A5A' }} />
            </div>
          </div>
          <p className="stat-value">{totalCompleted}</p>
          <p className="stat-sub">{lang === 'ar' ? 'تقييم مكتمل' : 'assessments completed'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('dashboard.recent', lang)}</h2>
            <Link href="/assessments" className="text-[12.5px] font-semibold flex items-center gap-1 hover:opacity-80" style={{ color: '#1D6296' }}>
              {t('dashboard.view_all', lang)} <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {submissions.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--surface-alt)' }}>
                <ClipboardList className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
              </div>
              <p className="text-[13.5px] mb-4" style={{ color: 'var(--text-secondary)' }}>{t('dashboard.no_assessments', lang)}</p>
              <Link href="/first-insight" className="btn-accent">
                {lang === 'ar' ? 'أول رؤية' : 'First insight'}
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {submissions.slice(0, 5).map((s: AssessmentSubmission) => {
                const def = (s as AssessmentSubmission & { assessment_definitions?: { name_en: string; name_ar: string } }).assessment_definitions
                const sName = lang === 'ar' && def?.name_ar ? def.name_ar : def?.name_en
                return (
                  <Link
                    key={s.id}
                    href={`/assessments/${s.definition_id}/results/${s.id}`}
                    className="flex items-center justify-between py-3 hover:opacity-80 transition-opacity"
                    style={{ borderBottom: '1px solid var(--divider)' }}
                  >
                    <div>
                      <p className="text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>{sName}</p>
                      <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        {new Date(s.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={severityBadge(s.severity_band)}>{localizeSeverity(s.severity_band, lang)}</span>
                      <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('dashboard.mood_week', lang)}</h2>
            <Link href="/mood" className="text-[12.5px] font-semibold flex items-center gap-1 hover:opacity-80" style={{ color: '#1D6296' }}>
              {t('dashboard.log_mood', lang)} <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {moods.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--surface-alt)' }}>
                <Activity className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
              </div>
              <p className="text-[13.5px] mb-4" style={{ color: 'var(--text-secondary)' }}>{t('dashboard.track_mood', lang)}</p>
              <Link href="/mood" className="btn-accent">
                {t('dashboard.track_cta', lang)}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {moods.map((m: MoodLog) => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="text-[11.5px] w-20 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{m.log_date}</span>
                  <div className="flex-1 progress-track">
                    <div className="progress-fill" style={{ width: `${m.mood_score * 10}%` }} />
                  </div>
                  <span className="text-[12px] font-semibold w-8 text-end flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
                    {m.mood_score}/10
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
        {[
          { href: '/assessments', label: lang === 'ar' ? 'التقييمات' : 'Assessments', icon: ClipboardList, color: '#EAF2F9', iconColor: '#1D6296' },
          { href: '/mood', label: lang === 'ar' ? 'المزاج' : 'Mood Tracker', icon: Heart, color: '#FDE8E8', iconColor: '#C02A2A' },
          { href: '/insights#self-map', label: lang === 'ar' ? 'خريطتي' : 'Self Map', icon: TrendingUp, color: '#E6F4EC', iconColor: '#1B8A5A' },
          { href: '/journal', label: lang === 'ar' ? 'اليوميات' : 'Journal', icon: Activity, color: '#FEF2EC', iconColor: '#F3650A' },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="card p-4 flex flex-col items-center gap-2.5 text-center hover:shadow-card-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-[11px] flex items-center justify-center" style={{ backgroundColor: item.color }}>
              <item.icon className="w-5 h-5" style={{ color: item.iconColor }} />
            </div>
            <span className="text-[12.5px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
