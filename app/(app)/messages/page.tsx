'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, MessageSquare, AlertCircle, ChevronLeft, Users } from 'lucide-react'
import type { Message, Profile } from '@/lib/types'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

export default function MessagesPage() {
  const supabase = useMemo(() => createClient(), [])
  const lang = useLang()
  const isRtl = lang === 'ar'
  const [profile, setProfile] = useState<Profile | null>(null)
  const [clinician, setClinician] = useState<Profile | null>(null)
  const [patients, setPatients] = useState<Profile[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [isUrgent, setIsUrgent] = useState(false)
  const [mobileShowList, setMobileShowList] = useState(true)
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
  }, [supabase, loadMessages])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (profile?.role === 'clinician' && selectedPatient) {
      loadMessages(selectedPatient.id, profile.id)
    }
  }, [selectedPatient, profile, loadMessages])

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
  }, [profile, clinician, selectedPatient, supabase, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function selectPatient(p: Profile) {
    setSelectedPatient(p)
    setMobileShowList(false)
  }

  function backToPatientList() {
    setMobileShowList(true)
  }

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

  if (loading) {
    return (
      <div className="p-4 sm:p-7 flex items-center justify-center app-page-fill" style={{ color: 'var(--text-muted)' }}>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--vw-blue)', borderTopColor: 'transparent' }} />
          {t('messages.loading', lang)}
        </div>
      </div>
    )
  }

  if (profile?.role === 'patient' && !profile.assigned_clinician_id) {
    return (
      <div className="p-4 sm:p-7 flex items-center justify-center app-page-fill">
        <div className="card p-8 sm:p-10 text-center max-w-sm w-full">
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
      <div className="p-4 sm:p-7 flex items-center justify-center app-page-fill">
        <div className="card p-8 sm:p-10 text-center max-w-sm w-full">
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
  const otherParty = isClinician ? selectedPatient : clinician
  const otherName = otherParty
    ? (lang === 'ar' && otherParty.full_name_ar ? otherParty.full_name_ar : otherParty.full_name_en)
    : t('messages.clinician', lang)

  const showPatientSidebar = isClinician && (!selectedPatient || mobileShowList)
  const showChat = !isClinician || (selectedPatient && !mobileShowList)

  return (
    <div className="flex flex-col lg:flex-row app-page-fill max-h-[calc(100dvh-var(--topbar-h)-env(safe-area-inset-top))] lg:max-h-[100dvh] overflow-hidden">
      {isClinician && (
        <div
          className={`${showPatientSidebar ? 'flex' : 'hidden'} lg:flex w-full lg:w-64 flex-shrink-0 flex-col border-b lg:border-b-0`}
          style={{
            backgroundColor: 'var(--surface)',
            borderInlineEnd: '1px solid var(--border)',
          }}
        >
          <div className="px-4 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="section-label flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              {t('messages.patients', lang)}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 max-h-[40dvh] lg:max-h-none">
            {patients.map(p => {
              const name = lang === 'ar' && p.full_name_ar ? p.full_name_ar : p.full_name_en
              const isSelected = selectedPatient?.id === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => selectPatient(p)}
                  className="w-full text-start px-4 py-3.5 min-h-[52px] flex items-center gap-3 transition-colors"
                  style={isSelected ? { background: '#EAF2F9' } : undefined}
                >
                  <div className="avatar-sm" style={{ background: '#1D6296' }}>{name.charAt(0).toUpperCase()}</div>
                  <span className="text-[13.5px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className={`flex flex-col flex-1 min-w-0 min-h-0 ${showChat ? 'flex' : 'hidden lg:flex'}`}>
        {(!isClinician || selectedPatient) ? (
          <>
            <div className="px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
              {isClinician && (
                <button
                  type="button"
                  onClick={backToPatientList}
                  className="lg:hidden touch-target -ms-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label={lang === 'ar' ? 'العودة إلى قائمة المرضى' : 'Back to patient list'}
                  style={{ color: 'var(--text-muted)' }}
                >
                  <ChevronLeft className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
                </button>
              )}
              <div className="avatar-lg flex-shrink-0" style={{ background: '#1D6296' }}>{otherName.charAt(0).toUpperCase()}</div>
              <div className="min-w-0">
                <p className="text-[14.5px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{otherName}</p>
                <p className="text-[12px] capitalize" style={{ color: 'var(--text-muted)' }}>{otherParty?.role || ''}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 py-4 sm:py-6 space-y-4" style={{ backgroundColor: 'var(--page-bg)' }}>
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
                      className="max-w-[85%] sm:max-w-md px-4 py-3 text-[14px] break-words"
                      style={{
                        backgroundColor: msg.is_urgent ? '#F3650A' : isMine ? '#1D6296' : 'var(--surface)',
                        color: isMine || msg.is_urgent ? 'white' : 'var(--text-primary)',
                        border: !isMine && !msg.is_urgent ? '1px solid var(--border)' : 'none',
                        borderRadius: isMine
                          ? (isRtl ? '16px 16px 16px 4px' : '16px 16px 4px 16px')
                          : (isRtl ? '16px 16px 4px 16px' : '16px 16px 16px 4px'),
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

            <div className="px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
              <form onSubmit={handleSend} className="space-y-2">
                <div className="flex gap-2 sm:gap-3">
                  <input
                    type="text"
                    className="input flex-1 min-w-0"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder={t('messages.placeholder', lang)}
                    maxLength={2000}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="touch-target w-11 h-11 flex items-center justify-center rounded-[10px] text-white disabled:opacity-40 transition-opacity hover:opacity-90 flex-shrink-0"
                    style={{ backgroundColor: isUrgent ? '#F3650A' : '#1D6296' }}
                    aria-label={lang === 'ar' ? 'إرسال' : 'Send'}
                  >
                    <Send className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUrgent(v => !v)}
                  className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 min-h-[44px] rounded-[8px] transition-colors"
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
          <div className="flex-1 flex items-center justify-center p-6" style={{ backgroundColor: 'var(--page-bg)' }}>
            <div className="text-center">
              <div className="w-14 h-14 rounded-[16px] flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--surface-alt)' }}>
                <MessageSquare className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
              </div>
              <p className="text-[13.5px]" style={{ color: 'var(--text-muted)' }}>{t('messages.select_patient', lang)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
