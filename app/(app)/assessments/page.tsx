import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import { localizeSeverity } from '@/lib/severity-labels'
import { getProfileCompletion } from '@/lib/profile-completion'
import Link from 'next/link'
import { ClipboardList, CheckCircle2, Clock, AlertCircle, ChevronRight, Sparkles } from 'lucide-react'
import type { AssessmentDefinition, AssessmentAssignment, AssessmentSubmission } from '@/lib/types'
import InProgressAssessments from '@/components/in-progress-assessments'
import RescreeningTrigger from '@/components/rescreening-trigger'
import AIAssessmentFinder from '@/components/ai-assessment-finder'
import ProfileCompletionBanner from '@/components/profile-completion-banner'
import AssessmentsCatalog from '@/components/assessments-catalog'

function severityBadge(band: string) {
  const b = band.toLowerCase()
  if (b.includes('minimal') || b.includes('none') || b.includes('normal')) return 'badge-minimal'
  if (b.includes('mild')) return 'badge-mild'
  if (b.includes('moderate')) return 'badge-moderate'
  return 'badge-severe'
}

export default async function AssessmentsPage() {
  const supabase = await createClient()
  const lang = await getLanguage()
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
      .order('submitted_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('date_of_birth, gender, marital_status, educational_status, country_of_residence')
      .eq('id', user.id)
      .single(),
    supabase
      .from('patient_profiles')
      .select('employment_status, has_psychiatric_medications, onboarding_completed_at')
      .eq('id', user.id)
      .single(),
  ])

  const allDefinitions = (defsRes.data || []) as AssessmentDefinition[]
  const assignments = (aRes.data || []) as (AssessmentAssignment & { assessment_definitions: any })[]
  const submissions = (sRes.data || []) as (AssessmentSubmission & { assessment_definitions: any })[]
  const profileCompletion = getProfileCompletion(profileRes.data, ppRes.data)
  const { isComplete: isProfileComplete, completed, total } = profileCompletion

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-6xl">
      {/* Page header */}
      <div className="mb-7">
        <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          {t('assessments.page.title', lang)}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>{t('assessments.page.sub', lang)}</p>
      </div>

      {!isProfileComplete && (
        <ProfileCompletionBanner
          lang={lang}
          completed={completed}
          total={total}
          showOnboardingLink={!ppRes.data?.onboarding_completed_at}
        />
      )}

      {/* Assigned assessments — priority over AI recommender */}
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
                      <Link
                        href={`/profile?complete=true&next=${encodeURIComponent(`/assessments/${a.definition_id}?assignment=${a.id}`)}`}
                        className="btn-ghost flex-shrink-0 text-xs"
                      >
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

      {/* AI assessment recommender */}
      <section className="mb-8">
        <div className="max-w-2xl mx-auto mb-6 text-center">
          <div
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
            style={{ background: '#FEF2EC', color: '#F3650A', border: '1px solid #FBC29D' }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {t('landing.ai.badge', lang)}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {t('landing.ai.title', lang)}
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>{t('landing.ai.sub', lang)}</p>
        </div>
        <div className="max-w-2xl mx-auto">
          <AIAssessmentFinder lang={lang} profileComplete={isProfileComplete} />
        </div>
      </section>

      <div className="mb-4 flex items-center gap-2">
        <ClipboardList className="w-4 h-4" style={{ color: 'var(--text-icon)' }} />
        <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
          {t('assessments.available.title', lang)}
        </h2>
      </div>

      <AssessmentsCatalog
        lang={lang}
        definitions={allDefinitions}
        submissions={submissions}
        isProfileComplete={isProfileComplete}
      />

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
                <Link
                  key={s.id}
                  href={`/assessments/${s.definition_id}/results/${s.id}`}
                  className="flex items-center justify-between p-4 min-w-0 gap-3 hover:opacity-80 transition-opacity"
                  style={{ borderBottom: i < submissions.length - 1 ? '1px solid var(--divider)' : 'none' }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{sName}</p>
                    <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{new Date(s.submitted_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[13px] font-bold hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>{t('assessments.score', lang)} {s.total_score}</span>
                    <span className={`${severityBadge(s.severity_band)} hidden sm:inline-flex`}>{localizeSeverity(s.severity_band, lang)}</span>
                    {s.high_risk_flag && <AlertCircle className="w-4 h-4" style={{ color: '#C02A2A' }} aria-label={lang === 'ar' ? 'خطر مرتفع' : 'High risk'} />}
                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  </div>
                </Link>
              )
            })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
