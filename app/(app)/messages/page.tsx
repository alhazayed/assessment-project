'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, MessageSquare } from 'lucide-react'
import type { Message, Profile } from '@/lib/types'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

export default function MessagesPage() {
  const supabase = createClient()
  const lang = useLang()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [clinician, setClinician] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p as Profile)

    if (p?.role === 'patient' && p.assigned_clinician_id) {
      const { data: clin } = await supabase.from('profiles').select('*').eq('id', p.assigned_clinician_id).single()
      setClinician(clin as Profile)

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('patient_id', user.id)
        .eq('clinician_id', p.assigned_clinician_id)
        .order('created_at')
      setMessages(msgs as Message[] || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !profile || !clinician) return
    setSending(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('messages').insert({
      patient_id: profile.role === 'patient' ? user.id : clinician.id,
      clinician_id: profile.role === 'clinician' ? user.id : clinician.id,
      sender_id: user.id,
      body: newMessage.trim(),
    })

    setNewMessage('')
    setSending(false)
    load()
  }

  if (loading) return <div className="p-8 text-gray-400">{t('messages.loading', lang)}</div>

  if (profile?.role === 'patient' && !profile.assigned_clinician_id) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="card p-8 text-center max-w-sm">
          <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-base font-medium text-gray-700 mb-2">{t('messages.no_clinician', lang)}</h3>
          <p className="text-sm text-gray-400">{t('messages.no_clinician.sub', lang)}</p>
        </div>
      </div>
    )
  }

  const otherParty = clinician
  const otherName = otherParty
    ? (lang === 'ar' && otherParty.full_name_ar ? otherParty.full_name_ar : otherParty.full_name_en)
    : t('messages.clinician', lang)

  return (
    <div className="flex flex-col h-screen max-h-screen">
      <div className="px-8 py-5 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-sm font-semibold text-brand-700">
              {otherName.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{otherName}</p>
            <p className="text-xs text-gray-400 capitalize">{otherParty?.role || ''}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">{t('messages.empty', lang)}</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMine = msg.sender_id === profile?.id
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-md px-4 py-3 rounded-2xl text-sm ${
                    isMine
                      ? 'bg-brand-600 text-white rounded-br-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  <p className="leading-relaxed">{msg.body}</p>
                  <p className={`text-xs mt-1.5 ${isMine ? 'text-brand-200' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-8 py-4 border-t border-gray-200 bg-white flex-shrink-0">
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            className="input flex-1"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder={t('messages.placeholder', lang)}
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="btn-primary px-4 gap-2 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
