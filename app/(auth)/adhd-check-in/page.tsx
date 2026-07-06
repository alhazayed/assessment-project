import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'ADHD Zone Check-in',
  description: 'Quick daily ADHD zone check-in assessment',
}

// The ADHD Zone Check-in is live at /adhd-zones (authenticated). This route used
// to show a stale "Coming Soon" placeholder even though the feature shipped,
// dead-ending users who clicked the public nav link. Redirect to the real tool;
// unauthenticated visitors go through login and land on it afterwards.
export default async function ADHDCheckInPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  redirect(user ? '/adhd-zones' : '/login?next=/adhd-zones')
}
