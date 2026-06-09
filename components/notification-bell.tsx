'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, X, CheckCheck, AlertTriangle, ClipboardList, MessageSquare, Info } from 'lucide-react'
import Link from 'next/link'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'

type Notification = {
  id: string
  type: 'assignment' | 'message' | 'high_risk' | 'system'
  title_en: string
  title_ar: string
  body_en: string | null
  body_ar: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

const TYPE_ICON = {
  assignment: ClipboardList,
  message:    MessageSquare,
  high_risk:  AlertTriangle,
  system:     Info,
}

const TYPE_COLOR = {
  assignment: 'text-brand-600 bg-brand-50',
  message:    'text-indigo-600 bg-indigo-50',
  high_risk:  'text-red-600 bg-red-50',
  system:     'text-gray-600 bg-gray-100',
}

export default function NotificationBell({ lang }: { lang: Lang }) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const isAr = lang === 'ar'

  const unread = items.filter(n => !n.read_at).length

  useEffect(() => {
    loadNotifications()

    // Real-time subscription
    const channel = supabase
      .channel('notifications-bell')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, () => loadNotifications())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Close panel on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  async function loadNotifications() {
    const res = await fetch('/api/notifications')
    if (res.ok) {
      const json = await res.json()
      setItems(json.notifications ?? [])
    }
  }

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
  }

  async function markRead(id: string) {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) })
    setItems(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
  }

  function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return isAr ? 'الآن' : 'just now'
    if (m < 60) return isAr ? `منذ ${m} د` : `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return isAr ? `منذ ${h} س` : `${h}h ago`
    return isAr ? `منذ ${Math.floor(h / 24)} ي` : `${Math.floor(h / 24)}d ago`
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
            style={{ backgroundColor: '#F3650A' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute ${isAr ? 'left-0' : 'right-0'} top-10 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">{t('notif.title', lang)}</p>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5" />
                  {t('notif.mark_all', lang)}
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {items.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">{t('notif.empty', lang)}</p>
              </div>
            ) : items.map(n => {
              const Icon = TYPE_ICON[n.type] ?? Info
              const colorClass = TYPE_COLOR[n.type] ?? TYPE_COLOR.system
              const title = isAr ? n.title_ar : n.title_en
              const body = isAr ? n.body_ar : n.body_en
              const Wrapper = n.link ? Link : 'div' as any

              return (
                <Wrapper
                  key={n.id}
                  href={n.link ?? undefined}
                  onClick={() => { if (!n.read_at) markRead(n.id); if (n.link) setOpen(false) }}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${!n.read_at ? 'bg-brand-50/40' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-snug ${!n.read_at ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{title}</p>
                    {body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{body}</p>}
                    <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read_at && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ backgroundColor: '#F3650A' }} />}
                </Wrapper>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
