import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProfileCompletion } from '@/lib/profile-completion'
import AssessmentContent from './assessment-content'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ assignment?: string }>
}

export default async function TakeAssessmentPage(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Optional clinician-assignment context — preserved across auth/profile
  // redirects so completing the assignment still marks it done on submit.
  const assignmentId = typeof searchParams.assignment === 'string' ? searchParams.assignment : undefined
  const nextPath = `/assessments/${params.id}${assignmentId ? `?assignment=${assignmentId}` : ''}`

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  }

  const [{ data: profile }, { data: pp }] = await Promise.all([
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

  const { isComplete: isProfileComplete } = getProfileCompletion(profile, pp)

  if (!isProfileComplete) {
    redirect(`/profile?complete=true&next=${encodeURIComponent(nextPath)}`)
  }

  return <AssessmentContent id={params.id} userId={user.id} assignmentId={assignmentId} />
}
