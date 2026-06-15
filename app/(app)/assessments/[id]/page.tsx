import { createClient } from '@/lib/supabase/server'
import AssessmentContent from './assessment-content'

interface Props {
  params: { id: string }
}

export default async function TakeAssessmentPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <AssessmentContent id={params.id} userId={user?.id ?? ''} />
}
