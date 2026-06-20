import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AssessmentContent from './assessment-content'

interface Props {
  params: { id: string }
}

export default async function TakeAssessmentPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/assessments/${params.id}`)
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

  const isProfileComplete =
    profile?.date_of_birth &&
    profile?.gender &&
    profile?.marital_status &&
    profile?.educational_status &&
    profile?.country_of_residence &&
    pp?.employment_status &&
    pp?.has_psychiatric_medications !== null &&
    pp?.has_psychiatric_medications !== undefined

  if (!isProfileComplete) {
    redirect(`/profile?complete=true&next=/assessments/${params.id}`)
  }

  return <AssessmentContent id={params.id} userId={user.id} />
}
