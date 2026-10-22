'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { clearGuestClaimTokens, readGuestClaimTokens } from '@/lib/guest-claim-storage'
import { useLang } from '@/lib/use-lang'

/**
 * After login/register, offer to claim guest assessment submissions stored in
 * localStorage. Nothing is claimed without the user's confirmation, because on
 * a shared device the guest results may belong to someone else. Tokens older
 * than 24 hours are dropped client-side; the server verifies the HMAC.
 */
export default function GuestClaimOnAuth() {
  const router = useRouter()
  const lang = useLang()
  const isAr = lang === 'ar'
  const [pending, setPending] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    // Reading localStorage must happen after mount (not during SSR render).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(readGuestClaimTokens().slice(0, 10))
  }, [])

  async function save() {
    if (busy || pending.length === 0) return
    setBusy(true)
    try {
      const res = await fetch('/api/claim-guest-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: pending }),
      })
      if (!res.ok) {
        // Non-fatal: keep the tokens so the user can retry until they expire.
        setBusy(false)
        return
      }
      const data = await res.json()
      clearGuestClaimTokens()
      setPending([])
      if (data.claimed > 0) {
        setMessage(
          isAr
            ? `تم حفظ ${data.claimed} نتيجة/نتائج من جلسة الضيف في حسابك.`
            : `Saved ${data.claimed} guest result(s) to your account.`
        )
        router.refresh()
      }
    } catch {
      // Network error: leave tokens for a later attempt.
    }
    setBusy(false)
  }

  function discard() {
    clearGuestClaimTokens()
    setPending([])
  }

  if (message) {
    return (
      <div className="mb-4 alert-success text-[13px]" role="status">
        {message}
      </div>
    )
  }

  if (pending.length === 0) return null

  const n = pending.length
  return (
    <div
      className="mb-4 rounded-xl p-4 text-[13px] flex flex-col sm:flex-row sm:items-center gap-3"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      role="region"
      aria-label={isAr ? 'نتائج الضيف' : 'Guest results'}
    >
      <p className="flex-1">
        {isAr
          ? `هل تريد حفظ ${n} من نتائج الضيف في هذا الحساب؟ اختر "تجاهل" إذا لم تكن أنت من أجرى هذه التقييمات على هذا الجهاز.`
          : `Save ${n} guest result${n === 1 ? '' : 's'} to this account? Choose Discard if you didn't take these assessments on this device.`}
      </p>
      <div className="flex gap-2 flex-shrink-0">
        <button type="button" onClick={save} disabled={busy} className="btn-primary text-[13px] px-4 py-2">
          {isAr ? 'حفظ' : 'Save'}
        </button>
        <button type="button" onClick={discard} disabled={busy} className="btn-secondary text-[13px] px-4 py-2">
          {isAr ? 'تجاهل' : 'Discard'}
        </button>
      </div>
    </div>
  )
}
