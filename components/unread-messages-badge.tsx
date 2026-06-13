'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function UnreadMessagesBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    let userId: string | null = null

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userId = user.id

      const { count: n } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .neq('sender_id', user.id)
        .is('read_at', null)
        .or(`patient_id.eq.${user.id},clinician_id.eq.${user.id}`)

      setCount(n ?? 0)
    }

    load()

    const channel = supabase
      .channel('unread-messages-badge')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
      }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (count === 0) return null

  return (
    <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-accent-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
      {count > 99 ? '99+' : count}
    </span>
  )
}
