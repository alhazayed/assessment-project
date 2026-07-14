import { requireAdmin } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'
import { getLanguage } from '@/lib/get-language'
import UserAssessmentsClient from './user-assessments-client'

export const metadata = { robots: { index: false, follow: false } }

export default async function AdminUserAssessmentsPage(props: { params: Promise<{ id: string }> }) {
  const { role } = await requireAdmin()
  // Viewing another user's full assessment answers/results is a superadmin surface.
  if (role !== 'superadmin') redirect('/x/control/users')

  const { id } = await props.params
  const lang = await getLanguage()
  return <UserAssessmentsClient userId={id} lang={lang} />
}
