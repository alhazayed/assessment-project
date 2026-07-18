'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, MessageSquare, AlertCircle } from 'lucide-react'
import type { Message, Profile } from '@/lib/types'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

// A patient can have several clinicians and vice-versa (clinician_patient_
// relationships). Messaging is available for a pair only when the relationship
// is active and the `message_patient` permission is granted — mirroring the
// messages RLS policy, so the picker never lists a contact the user can't message.
type RelPerm = { permission_key: string; granted: boolean }
function canMessage(perms: unknown): boolean {
  return Array.isArray(perms) && perms.some(
    (p) => (p as RelPerm)?.permission_key === 'message_patient' && (p as RelPerm)?.granted,
  )
}
// Supabase types a to-one embed as an array; normalize to a single Profile.
function firstProfile(embed: unknown): Profile | null {
  const v = Array.isArray(embed) ? embed[0] : embed
  return (v ?? null) as Profile | null
}

export default function MessagesPage() {
  const supabase = useMemo(() => createClient(), [])
  const lang = useLang()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [clinicians, setClinicians] = useState<Profile[]>([])
  const [selectedClinician, setSelectedClinician] = useState<Profile | null>(null)
  const [patients, setPatients] = useState<Profile[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [isUrgent, setIsUrgent] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async (patientId: string, clinicianId: string) => {
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
  }, [supabase])

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p as Profile)

    if (p?.role === 'patient') {
      // Every clinician the patient has an active, message-permitted relationship with.
      const { data: rels } = await supabase
        .from('clinician_patient_relationships')
        .select('clinician:profiles!clinician_patient_relationships_clinician_id_fkey(*), relationship_permissions(permission_key, granted)')
        .eq('patient_id', user.id)
        .eq('status', 'active')
      const list = (rels ?? [])
        .filter((r) => canMessage(r.relationship_permissions))
        .map((r) => firstProfile(r.clinician))
        .filter((c): c is Profile => !!c)
        .sort((a, b) => (a.full_name_en || '').localeCompare(b.full_name_en || ''))
      setClinicians(list)
      if (list.length === 1) setSelectedClinician(list[0])
    } else if (p?.role === 'clinician') {
      // Every patient the clinician has an active, message-permitted relationship with.
      const { data: rels } = await supabase
        .from('clinician_patient_relationships')
        .select('patient:profiles!clinician_patient_relationships_patient_id_fkey(*), relationship_permissions(permission_key, granted)')
        .eq('clinician_id', user.id)
        .eq('status', 'active')
      const list = (rels ?? [])
        .filter((r) => canMessage(r.relationship_permissions))
        .map((r) => firstProfile(r.patient))
        .filter((pt): pt is Profile => !!pt)
        .sort((a, b) => (a.full_name_en || '').localeCompare(b.full_name_en || ''))
      setPatients(list)
    }
    setLoading(false)
  }, [supabase, loadMessages])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (profile?.role === 'clinician' && selectedPatient) {
      loadMessages(selectedPatient.id, profile.id)
    }
  }, [selectedPatient, profile, loadMessages])

  useEffect(() => {
    if (profile?.role === 'patient' && selectedClinician) {
      loadMessages(profile.id, selectedClinician.id)
    }
  }, [selectedClinician, profile, loadMessages])

  useEffect(() => {
    if (!profile) return

    let patientId: string | null = null
    let clinicianId: string | null = null

    if (profile.role === 'patient' && selectedClinician) {
      patientId = profile.id
      clinicianId = selectedClinician.id
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
  }, [profile, selectedClinician, selectedPatient, supabase, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !profile) return

    const patientId = profile.role === 'patient' ? profile.id : selectedPatient?.id
    const clinicianId = profile.role === 'clinician' ? profile.id : selectedClinician?.id
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

    // Notify recipient via server endpoint (admin client bypasses RLS for cross-user notification inserts)
    const recipientId = profile.role === 'patient' ? clinicianId : patientId
    const senderName = lang === 'ar' && profile.full_name_ar ? profile.full_name_ar : profile.full_name_en
    fetch('/api/notify-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_id: recipientId,
        title_en: isUrgent ? '⚠ Urgent message received' : 'New message',
        title_ar: isUrgent ? '⚠ رسالة عاجلة' : 'رسالة جديدة',
        body_en: `${senderName}: ${newMessage.trim().slice(0, 80)}`,
        body_ar: `${senderName}: ${newMessage.trim().slice(0, 80)}`,
      }),
    }).catch(() => {})

    setNewMessage('')
    setIsUrgent(false)
    setSending(false)
    loadMessages(patientId, clinicianId)
  }

  if (loading) return <div className="p-7" style={{ color: 'var(--text-muted)' }}>{t('messages.loading', lang)}</div>

  if (profile?.role === 'patient' && clinicians.length === 0) {
    return (
      <div className="p-7 flex items-center justify-center min-h-64">
        <div className="card p-10 text-center max-w-sm">
          <div className="w-14 h-14 rounded-[16px] flex items-center justify-center mx-auto mb-4" style={{ background: '#EAF2F9' }}>
            <MessageSquare className="w-7 h-7" style={{ color: '#1D6296' }} />
          </div>
          <h3 className="text-[15px] font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('messages.no_clinician', lang)}</h3>
          <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>{t('messages.no_clinician.sub', lang)}</p>
        </div>
      </div>
    )
  }

  if (profile?.role === 'clinician' && patients.length === 0) {
    return (
      <div className="p-7 flex items-center justify-center min-h-64">
        <div className="card p-10 text-center max-w-sm">
          <div className="w-14 h-14 rounded-[16px] flex items-center justify-center mx-auto mb-4" style={{ background: '#EAF2F9' }}>
            <MessageSquare className="w-7 h-7" style={{ color: '#1D6296' }} />
          </div>
          <h3 className="text-[15px] font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('messages.no_patients', lang)}</h3>
          <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>{t('messages.no_patients.sub', lang)}</p>
        </div>
      </div>
    )
  }

  const isClinician = profile?.role === 'clinician'
  const otherParty = isClinician ? selectedPatient : selectedClinician
  const otherName = otherParty
    ? (lang === 'ar' && otherParty.full_name_ar ? otherParty.full_name_ar : otherParty.full_name_en)
    : t('messages.clinician', lang)

  return (
    <div className="flex h-screen max-h-screen overflow-hidden">
      <div className="w-64 flex-shrink-0 flex flex-col" style={{ backgroundColor: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="section-label">{isClinician ? t('messages.patients', lang) : t('messages.clinicians', lang)}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {(isClinician ? patients : clinicians).map(item => {
            const name = (lang === 'ar' && item.full_name_ar ? item.full_name_ar : item.full_name_en) || '—'
            const isSelected = isClinician ? selectedPatient?.id === item.id : selectedClinician?.id === item.id
            return (
              <button
                key={item.id}
                onClick={() => isClinician ? setSelectedPatient(item) : setSelectedClinician(item)}
                className="w-full text-start px-4 py-3 flex items-center gap-3 transition-colors"
                style={isSelected ? { background: '#EAF2F9' } : undefined}
              >
                <div className="avatar-sm" style={{ background: '#1D6296' }}>{name.charAt(0).toUpperCase()}</div>
                <span className="text-[13.5px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{name}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        {(isClinician ? selectedPatient : selectedClinician) ? (
          <>
            {/* Chat header */}
            <div className="px-6 py-4 flex-shrink-0 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
              <div className="avatar-lg" style={{ background: '#1D6296' }}>{otherName.charAt(0).toUpperCase()}</div>
              <div>
                <p className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{otherName}</p>
                <p className="text-[12px] capitalize" style={{ color: 'var(--text-muted)' }}>{otherParty?.role || ''}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4" style={{ backgroundColor: 'var(--page-bg)' }}>
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--surface-alt)' }}>
                    <MessageSquare className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <p className="text-[13.5px]" style={{ color: 'var(--text-muted)' }}>{t('messages.empty', lang)}</p>
                </div>
              ) : messages.map(msg => {
                const isMine = msg.sender_id === profile?.id
                return (
                  <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    {msg.is_urgent && (
                      <div className="flex items-center gap-1 mb-1 px-1">
                        <AlertCircle className="w-3 h-3" style={{ color: '#F3650A' }} />
                        <span className="text-[11.5px] font-bold" style={{ color: '#F3650A' }}>
                          {lang === 'ar' ? 'عاجل' : 'Urgent'}
                        </span>
                      </div>
                    )}
                    <div
                      className="max-w-md px-4 py-3 text-[14px] text-white"
                      style={{
                        backgroundColor: msg.is_urgent ? '#F3650A' : isMine ? '#1D6296' : 'var(--surface)',
                        color: isMine || msg.is_urgent ? 'white' : 'var(--text-primary)',
                        border: !isMine && !msg.is_urgent ? '1px solid var(--border)' : 'none',
                        borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      }}
                    >
                      <p className="leading-relaxed">{msg.body}</p>
                      <p className="text-[11px] mt-1.5 opacity-60">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
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
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="w-11 h-11 flex items-center justify-center rounded-[10px] text-white disabled:opacity-40 transition-opacity hover:opacity-90 flex-shrink-0"
                    style={{ backgroundColor: isUrgent ? '#F3650A' : '#1D6296' }}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUrgent(v => !v)}
                  className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-[8px] transition-colors"
                  style={isUrgent
                    ? { backgroundColor: '#F3650A', color: 'white' }
                    : { backgroundColor: 'var(--surface-alt)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                  }
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'تعليم كعاجل' : 'Mark as urgent'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--page-bg)' }}>
            <div className="text-center">
              <div className="w-14 h-14 rounded-[16px] flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--surface-alt)' }}>
                <MessageSquare className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
              </div>
              <p className="text-[13.5px]" style={{ color: 'var(--text-muted)' }}>{isClinician ? t('messages.select_patient', lang) : t('messages.select_clinician', lang)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
