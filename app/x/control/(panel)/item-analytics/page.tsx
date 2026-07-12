import { requireAdmin } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLanguage } from '@/lib/get-language'
import ItemAnalyticsClient from './item-analytics-client'

export const metadata = { robots: { index: false, follow: false } }

export default async function ItemAnalyticsPage() {
  const { role } = await requireAdmin()
  // Answer-level statistics are a superadmin surface.
  if (role !== 'superadmin') redirect('/x/control/overview')

  const lang = await getLanguage()
  const db = createAdminClient()
  const { data } = await db
    .from('assessment_definitions')
    .select('id, code, name_en, name_ar')
    .eq('is_active', true)
    .order('name_en', { ascending: true })

  return <ItemAnalyticsClient definitions={data ?? []} lang={lang} />
}
