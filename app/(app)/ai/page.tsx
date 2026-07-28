'use client'

import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/lib/use-lang'
import { Sparkles, Send, Loader2, AlertTriangle } from 'lucide-react'

type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string; emergency?: boolean }

const MAX_LEN = 1000

export default function WafiPage() {
  const lang = useLang()
  const isAr = lang === 'ar'
  const tr = (en: string, ar: string) => (isAr ? ar : en)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages([{
      id: 'greeting',
      role: 'assistant',
      text: tr(
        "Hi, I'm Wafi — your supportive companion. I'm here to listen and share coping ideas. I'm not a substitute for professional care. How are you feeling today?",
        'مرحباً، أنا وافي — رفيقك الداعم. أنا هنا للاستماع ومشاركة أفكار للتأقلم. لست بديلاً عن الرعاية المتخصصة. كيف تشعر اليوم؟'
      ),
    }])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAr])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    // Last 10 prior turns; map assistant → "model" (server only accepts user|model).
    const history = next
      .filter(m => m.id !== 'greeting')
      .slice(-11, -1)
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.text }))

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text, lang, history }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 429) {
        setMessages(m => [...m, { id: `a-${Date.now()}`, role: 'assistant', text: tr('You’ve reached the message limit for now. Please try again later.', 'لقد وصلت إلى حد الرسائل حالياً. يرجى المحاولة لاحقاً.') }])
      } else if (!res.ok || !data.reply) {
        setMessages(m => [...m, { id: `a-${Date.now()}`, role: 'assistant', text: data.error || tr('Sorry, I could not respond right now. If you are in crisis, please contact local emergency services.', 'عذراً، لم أتمكن من الرد الآن. إذا كنت في أزمة، يرجى الاتصال بخدمات الطوارئ المحلية.') }])
      } else {
        setMessages(m => [...m, { id: `a-${Date.now()}`, role: 'assistant', text: data.reply, emergency: !!data.emergency }])
      }
    } catch {
      setMessages(m => [...m, { id: `a-${Date.now()}`, role: 'assistant', text: tr('Network error. Please try again.', 'خطأ في الشبكة. حاول مرة أخرى.') }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-h))] lg:h-screen max-w-3xl mx-auto">
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EAF2F9' }}>
          <Sparkles className="w-5 h-5" style={{ color: 'var(--vw-blue)' }} />
        </div>
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{tr('Wafi', 'وافي')}</h1>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{tr('Your supportive AI companion', 'رفيقك الداعم بالذكاء الاصطناعي')}</p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-5 py-2 text-[11.5px]" style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-muted)' }}>
        {tr('Wafi is a supportive companion, not a medical professional or a crisis service.', 'وافي رفيق داعم وليس اختصاصياً طبياً أو خدمة طوارئ.')}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-5 space-y-3">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[85%] px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap"
              style={m.role === 'user'
                ? { backgroundColor: 'var(--vw-blue)', color: '#fff', borderBottomRightRadius: 4 }
                : m.emergency
                  ? { backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', borderBottomLeftRadius: 4 }
                  : { backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderBottomLeftRadius: 4 }}
            >
              {m.emergency && <AlertTriangle className="w-4 h-4 inline-block me-1.5 -mt-0.5" />}
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-2.5 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 flex items-end gap-2" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value.slice(0, MAX_LEN))}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          rows={1}
          placeholder={tr('Type a message…', 'اكتب رسالة…')}
          className="flex-1 resize-none rounded-xl px-4 py-2.5 text-[14px] outline-none"
          style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-primary)', border: '1px solid var(--border)', maxHeight: 120 }}
          disabled={loading}
        />
        <button
          type="button"
          onClick={send}
          disabled={loading || !input.trim()}
          className="btn-accent flex-shrink-0 !px-3.5 !py-2.5"
          aria-label={tr('Send', 'إرسال')}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
