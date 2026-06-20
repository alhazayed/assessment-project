import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MoodContent from './mood-content'

export const metadata = {
  title: 'Mood Tracker | V Welfare',
  description: 'Track and monitor your mood patterns over time.',
}

export default async function MoodPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/mood')
  }

  return <MoodContent />
}
