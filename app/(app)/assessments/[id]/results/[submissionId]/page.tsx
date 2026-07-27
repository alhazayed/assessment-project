import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getLanguage } from '@/lib/get-language'
import AssessmentResultView from '@/components/assessment-result-view'
import type { AssessmentDefinition } from '@/lib/types'

interface Props {
  params: Promise<{ id: string; submissionId: string }>
}

export const metadata = {
  robots: { index: false, follow: false },
}

export default async function SubmissionResultPage(props: Props) {
  const { id, submissionId } = await props.params
  const supabase = await createClient()
  const lang = await getLanguage()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/assessments/${id}/results/${submissionId}`)}`)
  }

  const [{ data: submission }, { data: profile }] = await Promise.all([
    supabase
      .from('assessment_submissions')
      .select('*, assessment_definitions(*)')
      .eq('id', submissionId)
      .eq('patient_id', user.id)
      .eq('definition_id', id)
      .single(),
    supabase
      .from('profiles')
      .select('full_name_en, full_name_ar')
      .eq('id', user.id)
      .single(),
  ])

  if (!submission) notFound()

  const definition = submission.assessment_definitions as AssessmentDefinition | null
  if (!definition) notFound()

  // severity_band stores English band label from scoring
  const bandEn = submission.severity_band ?? ''
  const bandContent = definition.scoring_logic as Array<{ severity_en: string; severity_ar: string }> | null
  const matchedBand = bandContent?.find(b => b.severity_en === bandEn)
  const bandAr = matchedBand?.severity_ar ?? bandEn

  return (
    <AssessmentResultView
      lang={lang}
      definition={definition}
      score={submission.total_score}
      bandEn={bandEn}
      bandAr={bandAr}
      highRisk={submission.high_risk_flag}
      submittedAt={submission.submitted_at}
      patientNames={{ en: profile?.full_name_en ?? '', ar: profile?.full_name_ar ?? null }}
      submissionId={submission.id}
    />
  )
}
