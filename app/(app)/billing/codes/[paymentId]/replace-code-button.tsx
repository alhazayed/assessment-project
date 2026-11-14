'use client'

import { useState } from 'react'

/** Replace an unused bulk code; the new code is shown here once. */
export default function ReplaceCodeButton({ paymentId, codeId, lang }: { paymentId: string; codeId: string; lang: 'en' | 'ar' }) {
  const [state, setState] = useState<'idle' | 'working' | 'error'>('idle')
  const [code, setCode] = useState<string | null>(null)
  const isAr = lang === 'ar'

  async function replace() {
    if (!window.confirm(isAr ? 'سيتوقف الرمز الحالي عن العمل. هل تريد المتابعة؟' : 'The current code will stop working. Continue?')) return
    setState('working')
    try {
      const res = await fetch(`/api/packages/bulk/${paymentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || typeof data.code !== 'string') {
        setState('error')
        return
      }
      setCode(data.code)
      setState('idle')
    } catch {
      setState('error')
    }
  }

  if (code) {
    return (
      <span className="flex flex-col items-end gap-0.5">
        <span dir="ltr" className="font-mono text-[14px] font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>{code}</span>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {isAr ? 'انسخه الآن، لن يُعرض مرة أخرى' : 'Copy it now; it will not be shown again'}
        </span>
      </span>
    )
  }
  return (
    <span className="flex items-center gap-2">
      {state === 'error' && (
        <span role="alert" className="text-[12px]" style={{ color: '#C02A2A' }}>{isAr ? 'تعذّر الاستبدال' : 'Could not replace'}</span>
      )}
      <button type="button" onClick={replace} disabled={state === 'working'} className="btn-secondary text-[12.5px] flex-shrink-0">
        {state === 'working' ? (isAr ? 'جارٍ…' : 'Working…') : isAr ? 'رمز جديد' : 'New code'}
      </button>
    </span>
  )
}
