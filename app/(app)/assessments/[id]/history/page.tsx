import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLanguage } from '@/lib/get-language'
import HistoryCompareClient from './history-compare-client'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata = {
  robots: { index: false, follow: false },
}

export default async function AssessmentHistoryPage(props: Props) {
  const { id } = await props.params
  const supabase = await createClient()
  const lang = await getLanguage()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/assessments/${id}/history`)}`)
  }

  const { data: def } = await supabase
    .from('assessment_definitions')
    .select('id, name_en, name_ar')
    .eq('id', id)
    .single()

  const name = lang === 'ar' && def?.name_ar ? def.name_ar : (def?.name_en ?? (lang === 'ar' ? 'التقييم' : 'Assessment'))

  return <HistoryCompareClient definitionId={id} name={name} lang={lang} />
}
