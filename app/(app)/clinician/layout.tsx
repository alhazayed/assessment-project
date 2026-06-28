import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Server-side role gate for the clinician area. The (app) layout only checks
// that the user is signed in, so without this any authenticated account could
// render the clinician UI (e.g. the patient-connect form) by navigating to the
// URL directly. The API enforces clinician+verified independently, but the
// pages themselves should not be reachable by non-clinicians.
export default async function ClinicianLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'clinician') redirect('/dashboard')

  return <>{children}</>
}
