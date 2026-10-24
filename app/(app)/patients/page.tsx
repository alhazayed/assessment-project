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

  // Patient rosters are for clinicians (and admins); RLS already hides the
  // data, this just stops other roles landing on an empty clinician screen.
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['clinician', 'admin', 'superadmin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  return <PatientsContent />
}
