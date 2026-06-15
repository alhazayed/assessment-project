import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AssessmentContent from './assessment-content'

interface Props {
  params: { id: string }
}

export default async function TakeAssessmentPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/assessments/${params.id}`)
  return <AssessmentContent id={params.id} userId={user.id} />
}
