import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import { localizeSeverity } from '@/lib/severity-labels'
import Link from 'next/link'
import { ClipboardList, CheckCircle2, Clock, AlertCircle, ChevronRight } from 'lucide-react'
import type { AssessmentDefinition, AssessmentAssignment, AssessmentSubmission } from '@/lib/types'
import InProgressAssessments from '@/components/in-progress-assessments'
import RescreeningTrigger from '@/components/rescreening-trigger'

function severityBadge(band: string) {
  const b = band.toLowerCase()
  if (b.includes('minimal') || b.includes('none') || b.includes('normal')) return 'badge-minimal'
  if (b.includes('mild')) return 'badge-mild'
  if (b.includes('moderate')) return 'badge-moderate'
  return 'badge-severe'
}

export default async function AssessmentsPage() {
  const supabase = createClient()
  const lang = getLanguage()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/assessments')

  const [defsRes, aRes, sRes, profileRes, ppRes] = await Promise.all([
    supabase.from('assessment_definitions').select('*').eq('is_active', true).order('name_en'),
    supabase
      .from('assessment_assignments')
      .select('*, assessment_definitions(name_en, name_ar, description_en, description_ar)')
      .eq('patient_id', user.id)
      .eq('status', 'pending'),
    supabase
      .from('assessment_submissions')
      .select('*, assessment_definitions(name_en, name_ar, code)')
      .eq('patient_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(100),
    supabase
      .from('profiles')
      .select('date_of_birth, gender, marital_status, educational_status, country_of_residence')
      .eq('id', user.id)
      .single(),
    supabase
      .from('patient_profiles')
      .select('employment_status, has_psychiatric_medications')
      .eq('id', user.id)
      .single(),
  ])

  const allDefinitions = (defsRes.data || []) as AssessmentDefinition[]
  const assignments = (aRes.data || []) as (AssessmentAssignment & { assessment_definitions: any })[]
  const submissions = (sRes.data || []) as (AssessmentSubmission & { assessment_definitions: any })[]

  const pd = profileRes.data
  const ppd = ppRes.data
  const isProfileComplete = !!(
    pd?.date_of_birth && pd?.gender && pd?.marital_status &&
    pd?.educational_status && pd?.country_of_residence &&
    ppd?.employment_status &&
    ppd?.has_psychiatric_medications !== null && ppd?.has_psychiatric_medications !== undefined
  )

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-5xl">
      {/* Page header */}
      <div className="mb-7">
        <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          {t('assessments.page.title', lang)}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>{t('assessments.page.sub', lang)}</p>
      </div>

      {/* Profile incomplete banner */}
      {!isProfileComplete && (
        <div className="mb-6 rounded-xl p-4 flex items-start gap-3" style={{ background: '#FEF2EC', border: '1px solid #F3C5A0' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#F3650A' }} />
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: '#9B3D08' }}>
              {lang === 'ar' ? 'يرجى إكمال ملفك الشخصي لبدء التقييم' : 'Complete your profile to unlock assessments'}
            </p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: '#C2560A' }}>
              {lang === 'ar'
                ? 'يجب تعبئة البيانات الشخصية (تاريخ الميلاد، الجنس، الحالة الاجتماعية، التعليم، الدولة، الوظيفة، وحالة الأدوية) قبل بدء أي تقييم.'
                : 'Biographical data — date of birth, gender, marital status, education, country, employment, and medication status — must be filled before starting any assessment.'}
            </p>
            <Link
              href="/profile?complete=true"
              className="inline-flex items-center gap-1 text-xs font-semibold mt-2 hover:underline"
              style={{ color: '#9B3D08' }}
            >
              {lang === 'ar' ? 'اذهب إلى ملفي الشخصي' : 'Go to my profile'}
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Assigned assessments */}
      {assignments.length > 0 && (
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4" style={{ color: '#F3650A' }} />
            <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {t('assessments.assigned.title', lang)}
            </h2>
          </div>
          <div className="space-y-3">
            {assignments.map((a) => {
              const def = a.assessment_definitions
              const aName = lang === 'ar' && def?.name_ar ? def.name_ar : def?.name_en
              const note = lang === 'ar' && a.note_to_patient_ar ? a.note_to_patient_ar : a.note_to_patient_en
              return (
                <div key={a.id} className="card p-4" style={{ borderInlineStart: '4px solid #F3650A' }}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-[14.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>{aName}</h3>
                      {note && (
                        <p className="text-[13px] mt-1 italic" style={{ color: 'var(--text-secondary)' }}>&quot;{note}&quot;</p>
                      )}
                      {a.due_date && (
                        <p className="text-[12px] mt-1 font-medium" style={{ color: '#C2560A' }}>
                          {t('assessments.due', lang)} {new Date(a.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {isProfileComplete ? (
                      <Link href={`/assessments/${a.definition_id}?assignment=${a.id}`} className="btn-accent flex-shrink-0">
                        {t('assessments.btn.start', lang)}
                      </Link>
                    ) : (
                      <Link href="/profile?complete=true" className="btn-ghost flex-shrink-0 text-xs" style={{ opacity: 0.7 }}>
                        {lang === 'ar' ? 'أكمل ملفك' : 'Complete profile'}
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <RescreeningTrigger />
      <InProgressAssessments definitions={allDefinitions} lang={lang} userId={user.id} />

      {/* Available assessments */}
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="w-4 h-4" style={{ color: 'var(--text-icon)' }} />
          <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('assessments.available.title', lang)}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {allDefinitions.map((d) => {
            const lastSubmission = submissions.find(s => s.definition_id === d.id)
            const dName = lang === 'ar' && d.name_ar ? d.name_ar : d.name_en
            const dDesc = lang === 'ar' && d.description_ar ? d.description_ar : d.description_en
            return (
              <div key={d.id} className="card-hover p-5">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[14.5px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{dName}</h3>
                    <p className="section-label mt-0.5">{d.code}</p>
                  </div>
                  <span className="badge-neutral flex-shrink-0">
                    {d.total_questions}{t('assessments.questions', lang)}
                  </span>
                </div>
                {dDesc && (
                  <p className="text-[13px] mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{dDesc}</p>
                )}
                {lastSubmission && (
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#1B8A5A' }} />
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      {t('assessments.last', lang)} {new Date(lastSubmission.submitted_at).toLocaleDateString()}
                    </span>
                    <span className={severityBadge(lastSubmission.severity_band)}>
                      {localizeSeverity(lastSubmission.severity_band, lang)}
                    </span>
                  </div>
                )}
                <div className="flex gap-2">
                  {isProfileComplete ? (
                    <Link href={`/assessments/${d.id}`} className="btn-accent">
                      {lastSubmission ? t('assessments.btn.retake', lang) : t('assessments.start', lang)}
                    </Link>
                  ) : (
                    <span
                      className="btn-accent opacity-40 cursor-not-allowed select-none"
                      title={lang === 'ar' ? 'أكمل ملفك الشخصي أولاً' : 'Complete your profile first'}
                    >
                      {lastSubmission ? t('assessments.btn.retake', lang) : t('assessments.start', lang)}
                    </span>
                  )}
                  {lastSubmission && (
                    <span className="btn-ghost flex items-center">
                      {t('assessments.score', lang)} {lastSubmission.total_score}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* History */}
      {submissions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--text-icon)' }} />
            <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {t('assessments.history.title', lang)}
            </h2>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
            {submissions.map((s, i) => {
              const def = s.assessment_definitions
              const sName = lang === 'ar' && def?.name_ar ? def.name_ar : def?.name_en
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-4 min-w-0 gap-3"
                  style={{ borderBottom: i < submissions.length - 1 ? '1px solid var(--divider)' : 'none' }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{sName}</p>
                    <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{new Date(s.submitted_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[13px] font-bold hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>{t('assessments.score', lang)} {s.total_score}</span>
                    <span className={`${severityBadge(s.severity_band)} hidden sm:inline-flex`}>{localizeSeverity(s.severity_band, lang)}</span>
                    {s.high_risk_flag && <AlertCircle className="w-4 h-4" style={{ color: '#C02A2A' }} aria-label="High risk" />}
                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
              )
            })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
