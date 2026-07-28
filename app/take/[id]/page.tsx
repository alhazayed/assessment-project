import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLanguage } from '@/lib/get-language'
import GuestAssessment from './guest-assessment'

// Public, no-login "try an assessment" flow. Logged-in users are sent to the
// full authenticated flow (the guest submit API rejects authenticated sessions).
export const metadata = {
  robots: { index: false, follow: false },
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function GuestTakePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!UUID_RE.test(id)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect(`/assessments/${id}`)

  const lang = await getLanguage()
  const { data: def } = await supabase
    .from('assessment_definitions')
    .select('id')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()
  if (!def) notFound()

  return <GuestAssessment definitionId={id} lang={lang} />
}
