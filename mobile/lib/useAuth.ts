import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Profile } from './types'
import type { Session } from '@supabase/supabase-js'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('id, role, full_name_en, full_name_ar, language_preference, is_active, date_of_birth, gender, country_of_residence, avatar_url, created_at, updated_at')
      .eq('id', userId)
      .single()
    setProfile(data as Profile | null)
    setLoading(false)
  }

  return { session, profile, loading }
}
