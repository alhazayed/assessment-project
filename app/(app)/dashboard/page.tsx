import { createClient } from '@/lib/supabase/server'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, Heart, BookOpen, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react'
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

async function getClinicianDashboard(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: patients } = await supabase
    .from('profiles')
    .select('id, full_name_en, full_name_ar, created_at')
    .eq('assigned_clinician_id', userId)
    .eq('role', 'patient')
    .eq('is_active', true)

  const patientIds = (patients || []).map(p => p.id)

  const [recentSubmissions, highRisk] = await Promise.all([
    patientIds.length > 0
      ? supabase
          .from('assessment_submissions')
          .select('*, assessment_definitions(name_en, name_ar), profiles!assessment_submissions_patient_id_fkey(full_name_en, full_name_ar)')
          .in('patient_id', patientIds)
          .order('submitted_at', { ascending: false })
          .limit(5)
      : { data: [] },
    patientIds.length > 0
      ? supabase
          .from('assessment_submissions')
          .select('*, profiles!assessment_submissions_patient_id_fkey(full_name_en, full_name_ar)')
          .in('patient_id', patientIds)
          .eq('high_risk_flag', true)
          .gte('submitted_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      : { data: [] },
  ])

  return {
    patients: patients || [],
    recentSubmissions: recentSubmissions.data || [],
    highRiskPatients: highRisk.data || [],
  }
}

function severityColor(band: string) {
  const b = band.toLowerCase()
  if (b.includes('minimal') || b.includes('none') || b.includes('normal')) return 'text-green-700 bg-green-50 border-green-200'
  if (b.includes('mild')) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
  if (b.includes('moderate')) return 'text-orange-700 bg-orange-50 border-orange-200'
  return 'text-red-700 bg-red-50 border-red-200'
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

  if (p?.role === 'patient') {
    const { submissions, moods, pendingAssignments } = await getPatientDashboard(supabase, user.id)
    const latestMood = moods[0] as MoodLog | undefined
    const avgMood = moods.length > 0 ? Math.round(moods.reduce((sum, m) => sum + m.mood_score, 0) / moods.length) : null
    const firstName = (lang === 'ar' && p.full_name_ar ? p.full_name_ar : p.full_name_en).split(' ')[0]

    return (
      <div className="p-8 max-w-6xl">
        <CrisisBanner lang={lang} />
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('dashboard.welcome', lang)}, {firstName}
          </h1>
          <p className="text-gray-500 mt-1">{t('dashboard.subtitle', lang)}</p>
        </div>

        {pendingAssignments.length > 0 && (
          <div className="mb-6 p-4 bg-brand-50 border border-brand-200 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-semibold text-brand-700">{t('dashboard.assignments.title', lang)}</span>
            </div>
            <div className="space-y-2">
              {pendingAssignments.map((a: AssessmentAssignment) => {
                const def = (a as any).assessment_definitions
                const aName = lang === 'ar' && def?.name_ar ? def.name_ar : def?.name_en
                return (
                  <Link
                    key={a.id}
                    href={`/assessments/${a.definition_id}`}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-brand-100 hover:border-brand-300 transition-colors group"
                  >
                    <span className="text-sm font-medium text-gray-900">{aName}</span>
                    <span className="text-xs text-brand-600 group-hover:text-brand-700">{t('dashboard.assignments.start', lang)}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-pink-50 flex items-center justify-center">
                <Heart className="w-5 h-5 text-pink-500" />
              </div>
              <span className="text-sm font-medium text-gray-600">{t('dashboard.mood.card', lang)}</span>
            </div>
            {latestMood ? (
              <div>
                <p className="text-3xl font-bold text-gray-900">{latestMood.mood_score}<span className="text-lg text-gray-400">/10</span></p>
                <p className="text-xs text-gray-500 mt-1">{latestMood.log_date}</p>
              </div>
            ) : (
              <Link href="/mood" className="text-sm text-brand-600 hover:underline">{t('dashboard.mood.log', lang)}</Link>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-sm font-medium text-gray-600">{t('dashboard.mood.avg', lang)}</span>
            </div>
            {avgMood !== null ? (
              <p className="text-3xl font-bold text-gray-900">{avgMood}<span className="text-lg text-gray-400">/10</span></p>
            ) : (
              <p className="text-sm text-gray-400">{t('dashboard.mood.no_data', lang)}</p>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-sm font-medium text-gray-600">{t('dashboard.done', lang)}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{submissions.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">{t('dashboard.recent', lang)}</h2>
              <Link href="/assessments" className="text-sm text-brand-600 hover:underline">{t('dashboard.view_all', lang)}</Link>
            </div>
            {submissions.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">{t('dashboard.no_assessments', lang)}</p>
                <Link href="/assessments" className="btn-primary mt-3 text-xs px-3 py-1.5 inline-flex">
                  {t('dashboard.take_one', lang)}
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((s: AssessmentSubmission) => {
                  const def = (s as any).assessment_definitions
                  const sName = lang === 'ar' && def?.name_ar ? def.name_ar : def?.name_en
                  return (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{sName}</p>
                        <p className="text-xs text-gray-400">{new Date(s.submitted_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`badge-minimal border ${severityColor(s.severity_band)}`}>
                        {s.severity_band}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">{t('dashboard.mood_week', lang)}</h2>
              <Link href="/mood" className="text-sm text-brand-600 hover:underline">{t('dashboard.log_mood', lang)}</Link>
            </div>
            {moods.length === 0 ? (
              <div className="text-center py-8">
                <Heart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">{t('dashboard.track_mood', lang)}</p>
                <Link href="/mood" className="btn-primary mt-3 text-xs px-3 py-1.5 inline-flex">
                  {t('dashboard.track_cta', lang)}
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {moods.map((m: MoodLog) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-20">{m.log_date}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-brand-500 h-2 rounded-full"
                        style={{ width: `${m.mood_score * 10}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-8 text-right">{m.mood_score}/10</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Clinician / Admin dashboard
  const { patients, recentSubmissions, highRiskPatients } = await getClinicianDashboard(supabase, user.id)

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.clinician.title', lang)}</h1>
        <p className="text-gray-500 mt-1">{t('dashboard.clinician.subtitle', lang)}</p>
      </div>

      {highRiskPatients.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-red-700">
              {highRiskPatients.length} {t('dashboard.clinician.high_risk', lang)}
            </span>
          </div>
          <p className="text-xs text-red-600">{t('dashboard.clinician.review', lang)}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-sm font-medium text-gray-600">{t('dashboard.clinician.patients', lang)}</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{patients.length}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-sm font-medium text-gray-600">{t('dashboard.clinician.risk', lang)}</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{highRiskPatients.length}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-sm font-medium text-gray-600">{t('dashboard.clinician.recent', lang)}</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{recentSubmissions.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">{t('dashboard.clinician.results', lang)}</h2>
          {recentSubmissions.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">{t('dashboard.clinician.no_results', lang)}</p>
          ) : (
            <div className="space-y-3">
              {recentSubmissions.map((s: any) => {
                const patName = lang === 'ar' && s.profiles?.full_name_ar ? s.profiles.full_name_ar : s.profiles?.full_name_en
                const defName = lang === 'ar' && s.assessment_definitions?.name_ar ? s.assessment_definitions.name_ar : s.assessment_definitions?.name_en
                return (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{patName}</p>
                      <p className="text-xs text-gray-400">{defName} · {new Date(s.submitted_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className={`badge-minimal border ${severityColor(s.severity_band)}`}>
                        {s.severity_band}
                      </span>
                      {s.high_risk_flag && (
                        <p className="text-xs text-red-600 mt-1 font-medium">⚠ {t('dashboard.high_risk_badge', lang)}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">{t('dashboard.clinician.your_patients', lang)}</h2>
          {patients.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">{t('dashboard.clinician.no_patients', lang)}</p>
          ) : (
            <div className="space-y-2">
              {patients.map((pt: any) => {
                const ptName = lang === 'ar' && pt.full_name_ar ? pt.full_name_ar : pt.full_name_en
                return (
                  <div key={pt.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-brand-700">{ptName.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ptName}</p>
                      <p className="text-xs text-gray-400">{t('dashboard.clinician.joined', lang)} {new Date(pt.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
