import { createClient } from '@/lib/supabase/server'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import Link from 'next/link'
import { ClipboardList, CheckCircle2, Clock, AlertCircle, LogIn } from 'lucide-react'
import type { AssessmentDefinition, AssessmentAssignment, AssessmentSubmission } from '@/lib/types'
import AIAssessmentFinder from '@/components/ai-assessment-finder'

function severityColor(band: string) {
  const b = band.toLowerCase()
  if (b.includes('minimal') || b.includes('none') || b.includes('normal')) return 'text-green-700 bg-green-50 border-green-200'
  if (b.includes('mild')) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
  if (b.includes('moderate')) return 'text-orange-700 bg-orange-50 border-orange-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

export default async function AssessmentsPage() {
  const supabase = createClient()
  const lang = getLanguage()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: definitions } = await supabase
    .from('assessment_definitions')
    .select('*')
    .eq('is_active', true)
    .order('name_en')

  const allDefinitions = (definitions || []) as AssessmentDefinition[]

  let assignments: (AssessmentAssignment & { assessment_definitions: any })[] = []
  let submissions: (AssessmentSubmission & { assessment_definitions: any })[] = []

  if (user) {
    const [aRes, sRes] = await Promise.all([
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
    ])
    assignments = (aRes.data || []) as any
    submissions = (sRes.data || []) as any
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('assessments.page.title', lang)}</h1>
        <p className="text-gray-500 mt-1">{t('assessments.page.sub', lang)}</p>
      </div>

      {!user && (
        <div className="mb-8 p-4 bg-brand-50 border border-brand-200 rounded-xl flex items-start gap-3">
          <LogIn className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-brand-800">{t('assessments.guest.title', lang)}</p>
            <p className="text-sm text-brand-600 mt-0.5">
              <Link href="/register" className="underline font-medium">{t('assessments.guest.create', lang)}</Link>{' '}
              {t('assessments.guest.or', lang)}{' '}
              <Link href="/login" className="underline font-medium">{t('assessments.guest.signin', lang)}</Link>{' '}
              {t('assessments.guest.suffix', lang)}
            </p>
          </div>
        </div>
      )}

      {user && assignments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" />
            {t('assessments.assigned.title', lang)}
          </h2>
          <div className="grid gap-3">
            {assignments.map((a) => {
              const def = a.assessment_definitions
              const aName = lang === 'ar' && def?.name_ar ? def.name_ar : def?.name_en
              const note = lang === 'ar' && a.note_to_patient_ar ? a.note_to_patient_ar : a.note_to_patient_en
              return (
                <div key={a.id} className="card p-4 border-l-4 border-brand-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{aName}</h3>
                      {note && (
                        <p className="text-sm text-gray-500 mt-1 italic">&quot;{note}&quot;</p>
                      )}
                      {a.due_date && (
                        <p className="text-xs text-orange-600 mt-1">{t('assessments.due', lang)} {new Date(a.due_date).toLocaleDateString()}</p>
                      )}
                    </div>
                    <Link href={`/assessments/${a.definition_id}`} className="btn-primary">
                      {t('assessments.btn.start', lang)}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <AIAssessmentFinder />

      <div className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-gray-500" />
          {t('assessments.available.title', lang)}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {allDefinitions.map((d) => {
            const lastSubmission = submissions.find(s => s.definition_id === d.id)
            const dName = lang === 'ar' && d.name_ar ? d.name_ar : d.name_en
            const dDesc = lang === 'ar' && d.description_ar ? d.description_ar : d.description_en
            return (
              <div key={d.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{dName}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-wide">{d.code}</p>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                    {d.total_questions}{t('assessments.questions', lang)}
                  </span>
                </div>
                {dDesc && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{dDesc}</p>
                )}
                {lastSubmission && (
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-gray-500">{t('assessments.last', lang)} {new Date(lastSubmission.submitted_at).toLocaleDateString()}</span>
                    <span className={`badge-minimal border ${severityColor(lastSubmission.severity_band)}`}>
                      {lastSubmission.severity_band}
                    </span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Link href={`/assessments/${d.id}`} className="btn-primary text-xs px-3 py-1.5">
                    {lastSubmission ? t('assessments.btn.retake', lang) : t('assessments.start', lang)}
                  </Link>
                  {lastSubmission && (
                    <span className="btn-secondary text-xs px-3 py-1.5">
                      {t('assessments.score', lang)} {lastSubmission.total_score}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {user && submissions.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-gray-500" />
            {t('assessments.history.title', lang)}
          </h2>
          <div className="card divide-y divide-gray-50">
            {submissions.map((s) => {
              const def = s.assessment_definitions
              const sName = lang === 'ar' && def?.name_ar ? def.name_ar : def?.name_en
              return (
                <div key={s.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{sName}</p>
                    <p className="text-xs text-gray-400">{new Date(s.submitted_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">{t('assessments.score', lang)} {s.total_score}</span>
                    <span className={`badge-minimal border ${severityColor(s.severity_band)}`}>
                      {s.severity_band}
                    </span>
                    {s.high_risk_flag && <AlertCircle className="w-4 h-4 text-red-500" aria-label="High risk flagged" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
