import { createClient } from '@/lib/supabase/server'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, Heart, TrendingUp, AlertTriangle, CheckCircle2, ArrowRight, Activity, ChevronRight } from 'lucide-react'
import type { Profile, AssessmentSubmission, MoodLog, AssessmentAssignment } from '@/lib/types'
import CrisisBanner from '@/components/crisis-banner'

async function getPatientDashboard(supabase: ReturnType<typeof createClient>, userId: string) {
  const [submissions, moods, assignments] = await Promise.all([
    supabase
      .from('assessment_submissions')
      .select('*, assessment_definitions(name_en, name_ar, code)')
      .eq('patient_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(5),
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
  ])

  return {
    submissions: submissions.data || [],
    moods: moods.data || [],
    pendingAssignments: assignments.data || [],
  }
}

function severityBadge(band: string) {
  const b = band.toLowerCase()
  if (b.includes('minimal') || b.includes('none') || b.includes('normal')) return 'badge-minimal'
  if (b.includes('mild')) return 'badge-mild'
  if (b.includes('moderate')) return 'badge-moderate'
  return 'badge-severe'
}

export default async function DashboardPage() {
  const supabase = createClient()
  const lang = getLanguage()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const p = profile as Profile | null

  if (p?.role === 'admin' || p?.role === 'superadmin') redirect('/x/control')

  const { submissions, moods, pendingAssignments } = await getPatientDashboard(supabase, user.id)
  const latestMood = moods[0] as MoodLog | undefined
  const avgMood = moods.length > 0 ? Math.round(moods.reduce((sum, m) => sum + m.mood_score, 0) / moods.length) : null
  const rawName = p ? (lang === 'ar' && p.full_name_ar ? p.full_name_ar : p.full_name_en) : ''
  const firstName = (rawName || user.email?.split('@')[0] || '').split(' ')[0]

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-6xl">
      <CrisisBanner lang={lang} />

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          {t('dashboard.welcome', lang)}, {firstName}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>{t('dashboard.subtitle', lang)}</p>
      </div>

      {/* Pending assignments banner */}
      {pendingAssignments.length > 0 && (
        <div className="safety-strip mb-6">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#F3650A' }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              {t('dashboard.assignments.title', lang)}
            </p>
            <div className="flex flex-wrap gap-2">
              {pendingAssignments.map((a: AssessmentAssignment) => {
                const def = (a as any).assessment_definitions
                const aName = lang === 'ar' && def?.name_ar ? def.name_ar : def?.name_en
                return (
                  <Link
                    key={a.id}
                    href={`/assessments/${a.definition_id}`}
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

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
        {/* Mood card */}
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
            <Link href="/mood" className="text-[13px] font-semibold" style={{ color: '#1D6296' }}>
              {t('dashboard.mood.log', lang)}
            </Link>
          )}
        </div>

        {/* Avg mood */}
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
              <p className="stat-sub">{lang === 'ar' ? `آخر ${moods.length} أيام` : `Last ${moods.length} days`}</p>
            </>
          ) : (
            <p className="stat-sub mt-2">{t('dashboard.mood.no_data', lang)}</p>
          )}
        </div>

        {/* Completions */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <span className="stat-label">{t('dashboard.done', lang)}</span>
            <div className="stat-icon" style={{ background: '#E6F4EC' }}>
              <CheckCircle2 className="w-5 h-5" style={{ color: '#1B8A5A' }} />
            </div>
          </div>
          <p className="stat-value">{submissions.length}</p>
          <p className="stat-sub">{lang === 'ar' ? 'تقييم مكتمل' : 'assessments completed'}</p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent assessments */}
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
              <Link href="/assessments" className="btn-accent">
                {t('dashboard.take_one', lang)}
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {submissions.map((s: AssessmentSubmission) => {
                const def = (s as any).assessment_definitions
                const sName = lang === 'ar' && def?.name_ar ? def.name_ar : def?.name_en
                return (
                  <div key={s.id} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--divider)' }}>
                    <div>
                      <p className="text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>{sName}</p>
                      <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        {new Date(s.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={severityBadge(s.severity_band)}>{s.severity_band}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Mood chart */}
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

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
        {[
          { href: '/assessments', label: lang === 'ar' ? 'التقييمات' : 'Assessments', icon: ClipboardList, color: '#EAF2F9', iconColor: '#1D6296' },
          { href: '/mood', label: lang === 'ar' ? 'المزاج' : 'Mood Tracker', icon: Heart, color: '#FDE8E8', iconColor: '#C02A2A' },
          { href: '/insights', label: lang === 'ar' ? 'الإحصائيات' : 'Insights', icon: TrendingUp, color: '#E6F4EC', iconColor: '#1B8A5A' },
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
