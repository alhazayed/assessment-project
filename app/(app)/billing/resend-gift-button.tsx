'use client'

import { useState } from 'react'

/** Sends the gift recipient a fresh one-time code (the old one stops working). */
export default function ResendGiftButton({ giftId, lang }: { giftId: string; lang: 'en' | 'ar' }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const isAr = lang === 'ar'

  async function resend() {
    setState('sending')
    try {
      const res = await fetch(`/api/packages/gifts/${giftId}/resend`, { method: 'POST' })
      setState(res.ok ? 'sent' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'sent') {
    return <span role="status" className="text-[12.5px] font-semibold" style={{ color: '#1B8A5A' }}>{isAr ? 'تم الإرسال' : 'Sent'}</span>
  }
  return (
    <span className="flex items-center gap-2">
      {state === 'error' && (
        <span role="alert" className="text-[12px]" style={{ color: '#C02A2A' }}>{isAr ? 'تعذّر الإرسال' : 'Could not send'}</span>
      )}
      <button type="button" onClick={resend} disabled={state === 'sending'} className="btn-secondary text-[13px] flex-shrink-0">
        {state === 'sending' ? (isAr ? 'جارٍ الإرسال…' : 'Sending…') : isAr ? 'إعادة إرسال الرمز' : 'Resend code'}
      </button>
    </span>
  )
}
