'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, MessageSquare, AlertCircle } from 'lucide-react'
import type { Message, Profile } from '@/lib/types'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

export default function MessagesPage() {
  const supabase = createClient()
  const lang = useLang()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [clinician, setClinician] = useState<Profile | null>(null)
  const [patients, setPatients] = useState<Profile[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [isUrgent, setIsUrgent] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function loadMessages(patientId: string, clinicianId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('patient_id', patientId)
      .eq('clinician_id', clinicianId)
      .order('created_at')
    setMessages(msgs as Message[] || [])

    // Mark unread messages sent by the other party as read
    if (user) {
      const unreadIds = (msgs || [])
        .filter(m => m.sender_id !== user.id && !m.read_at)
        .map(m => m.id)
      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIds)
      }
    }
  }

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p as Profile)

    if (p?.role === 'patient' && p.assigned_clinician_id) {
      const { data: clin } = await supabase.from('profiles').select('*').eq('id', p.assigned_clinician_id).single()
      setClinician(clin as Profile)
      await loadMessages(user.id, p.assigned_clinician_id)
    } else if (p?.role === 'clinician') {
      const { data: pts } = await supabase
        .from('profiles')
        .select('*')
        .eq('assigned_clinician_id', user.id)
        .eq('role', 'patient')
        .eq('is_active', true)
        .order('full_name_en')
      setPatients(pts as Profile[] || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (profile?.role === 'clinician' && selectedPatient) {
      loadMessages(selectedPatient.id, profile.id)
    }
  }, [selectedPatient])

  useEffect(() => {
    if (!profile) return

    let patientId: string | null = null
    let clinicianId: string | null = null

    if (profile.role === 'patient' && clinician) {
      patientId = profile.id
      clinicianId = clinician.id
    } else if (profile.role === 'clinician' && selectedPatient) {
      patientId = selectedPatient.id
      clinicianId = profile.id
    }

    if (!patientId || !clinicianId) return

    const pid = patientId
    const cid = clinicianId

    const channel = supabase
      .channel(`msgs:${pid}:${cid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `patient_id=eq.${pid}` },
        () => loadMessages(pid, cid))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile, clinician, selectedPatient])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !profile) return

    const patientId = profile.role === 'patient' ? profile.id : selectedPatient?.id
    const clinicianId = profile.role === 'clinician' ? profile.id : clinician?.id
    if (!patientId || !clinicianId) return

    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('messages').insert({
      patient_id: patientId,
      clinician_id: clinicianId,
      sender_id: user.id,
      body: newMessage.trim(),
      is_urgent: isUrgent,
    })

    // Notify the recipient for every message
    const recipientId = profile.role === 'patient' ? clinicianId : patientId
    const senderName = lang === 'ar' && profile.full_name_ar ? profile.full_name_ar : profile.full_name_en
    await supabase.from('notifications').insert({
      user_id: recipientId,
      type: 'message',
      title_en: isUrgent ? '⚠ Urgent message received' : 'New message',
      title_ar: isUrgent ? '⚠ رسالة عاجلة' : 'رسالة جديدة',
      body_en: `${senderName}: ${newMessage.trim().slice(0, 80)}`,
      body_ar: `${senderName}: ${newMessage.trim().slice(0, 80)}`,
      link: '/messages',
    })

    setNewMessage('')
    setIsUrgent(false)
    setSending(false)
    loadMessages(patientId, clinicianId)
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

  if (profile?.role === 'clinician' && patients.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="card p-8 text-center max-w-sm">
          <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-base font-medium text-gray-700 mb-2">{t('messages.no_patients', lang)}</h3>
          <p className="text-sm text-gray-400">{t('messages.no_patients.sub', lang)}</p>
        </div>
      </div>
    )
  }

  const isClinician = profile?.role === 'clinician'
  const otherParty = isClinician ? selectedPatient : clinician
  const otherName = otherParty
    ? (lang === 'ar' && otherParty.full_name_ar ? otherParty.full_name_ar : otherParty.full_name_en)
    : t('messages.clinician', lang)

  return (
    <div className="flex h-screen max-h-screen overflow-hidden">
      {isClinician && (
        <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
          <div className="px-4 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('messages.patients', lang)}</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {patients.map(p => {
              const name = lang === 'ar' && p.full_name_ar ? p.full_name_ar : p.full_name_en
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPatient(p)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${selectedPatient?.id === p.id ? 'bg-brand-50' : 'hover:bg-gray-50'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-brand-700">{name.charAt(0)}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-800 truncate">{name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        {(!isClinician || selectedPatient) ? (
          <>
            <div className="px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                  <span className="text-sm font-semibold text-brand-700">{otherName.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{otherName}</p>
                  <p className="text-xs text-gray-400 capitalize">{otherParty?.role || ''}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">{t('messages.empty', lang)}</p>
                </div>
              ) : messages.map(msg => {
                const isMine = msg.sender_id === profile?.id
                return (
                  <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    {msg.is_urgent && (
                      <div className="flex items-center gap-1 mb-1 px-1">
                        <AlertCircle className="w-3 h-3" style={{ color: '#F3650A' }} />
                        <span className="text-xs font-semibold" style={{ color: '#F3650A' }}>
                          {lang === 'ar' ? 'عاجل' : 'Urgent'}
                        </span>
                      </div>
                    )}
                    <div className={`max-w-md px-4 py-3 rounded-2xl text-sm ${
                      msg.is_urgent
                        ? 'text-white rounded-br-sm'
                        : isMine
                          ? 'bg-brand-600 text-white rounded-br-sm'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                    }`}
                      style={msg.is_urgent ? { backgroundColor: '#F3650A', borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px' } : {}}
                    >
                      <p className="leading-relaxed">{msg.body}</p>
                      <p className={`text-xs mt-1.5 ${isMine || msg.is_urgent ? 'text-white/60' : 'text-gray-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0">
              <form onSubmit={handleSend} className="space-y-2">
                <div className="flex gap-3">
                  <input
                    type="text"
                    className="input flex-1"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder={t('messages.placeholder', lang)}
                    maxLength={2000}
                  />
                  <button type="submit" disabled={!newMessage.trim() || sending}
                    className="px-4 gap-2 inline-flex items-center justify-center rounded-lg text-sm font-medium text-white disabled:opacity-40 transition-opacity hover:opacity-90"
                    style={{ backgroundColor: isUrgent ? '#F3650A' : '#1D6296' }}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUrgent(v => !v)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${isUrgent ? 'text-white' : 'text-gray-500 hover:text-gray-700 bg-gray-100'}`}
                  style={isUrgent ? { backgroundColor: '#F3650A' } : {}}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'تعليم كعاجل' : 'Mark as urgent'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">{t('messages.select_patient', lang)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
