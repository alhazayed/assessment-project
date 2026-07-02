import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PatientsContent from './patients-content'

export const metadata = {
  title: 'Patients',
  description: 'Manage your patients and their assessments.',
}

export default async function PatientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/patients')
  }

  return <PatientsContent />
}
