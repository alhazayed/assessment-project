import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import type { AssessmentDefinition, AssessmentAssignment, AssessmentSubmission } from '@/lib/types'

function severityColor(band: string) {
  const b = band.toLowerCase()
  if (b.includes('minimal') || b.includes('none') || b.includes('normal')) return 'text-green-700 bg-green-50 border-green-200'
  if (b.includes('mild')) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
  if (b.includes('moderate')) return 'text-orange-700 bg-orange-50 border-orange-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

export default async function AssessmentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  const [definitionsRes, assignmentsRes, submissionsRes] = await Promise.all([
    supabase
      .from('assessment_definitions')
      .select('*')
      .eq('is_active', true)
      .order('name_en'),
    supabase
      .from('assessment_assignments')
      .select('*, assessment_definitions(name_en, description_en)')
      .eq('patient_id', user.id)
      .eq('status', 'pending'),
    supabase
      .from('assessment_submissions')
      .select('*, assessment_definitions(name_en, code)')
      .eq('patient_id', user.id)
      .order('submitted_at', { ascending: false }),
  ])

  const definitions = (definitionsRes.data || []) as AssessmentDefinition[]
  const assignments = (assignmentsRes.data || []) as (AssessmentAssignment & { assessment_definitions: any })[]
  const submissions = (submissionsRes.data || []) as (AssessmentSubmission & { assessment_definitions: any })[]

  const isPatient = profile?.role === 'patient'

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
        <p className="text-gray-500 mt-1">
          {isPatient ? 'Complete standardized mental health assessments' : 'Manage and review assessments'}
        </p>
      </div>

      {isPatient && assignments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" />
            Assigned to you
          </h2>
          <div className="grid gap-3">
            {assignments.map((a) => (
              <div key={a.id} className="card p-4 border-l-4 border-brand-500">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{a.assessment_definitions?.name_en}</h3>
                    {a.note_to_patient_en && (
                      <p className="text-sm text-gray-500 mt-1 italic">&quot;{a.note_to_patient_en}&quot;</p>
                    )}
                    {a.due_date && (
                      <p className="text-xs text-orange-600 mt-1">Due: {new Date(a.due_date).toLocaleDateString()}</p>
                    )}
                  </div>
                  <Link href={`/assessments/${a.definition_id}`} className="btn-primary">
                    Start
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-gray-500" />
          Available Assessments
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {definitions.map((d) => {
            const lastSubmission = submissions.find(s => s.definition_id === d.id)
            return (
              <div key={d.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{d.name_en}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-wide">{d.code}</p>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                    {d.total_questions}Q
                  </span>
                </div>
                {d.description_en && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{d.description_en}</p>
                )}
                {lastSubmission && (
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-gray-500">Last taken: {new Date(lastSubmission.submitted_at).toLocaleDateString()}</span>
                    <span className={`badge-minimal border ${severityColor(lastSubmission.severity_band)}`}>
                      {lastSubmission.severity_band}
                    </span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Link href={`/assessments/${d.id}`} className="btn-primary text-xs px-3 py-1.5">
                    {lastSubmission ? 'Retake' : 'Start'}
                  </Link>
                  {lastSubmission && (
                    <span className="btn-secondary text-xs px-3 py-1.5">
                      Score: {lastSubmission.total_score}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {submissions.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-gray-500" />
            Past Results
          </h2>
          <div className="card divide-y divide-gray-50">
            {submissions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.assessment_definitions?.name_en}</p>
                  <p className="text-xs text-gray-400">{new Date(s.submitted_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">Score: {s.total_score}</span>
                  <span className={`badge-minimal border ${severityColor(s.severity_band)}`}>
                    {s.severity_band}
                  </span>
                  {s.high_risk_flag && (
                    <AlertCircle className="w-4 h-4 text-red-500" aria-label="High risk flagged" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
