'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GUEST_CLAIM_STORAGE_KEY } from '@/lib/guest-claim-storage'
import { useLang } from '@/lib/use-lang'

/**
 * After login/register, claim any guest assessment submissions stored in localStorage.
 * Tokens are HMAC-signed; server verifies ownership transfer securely.
 */
export default function GuestClaimOnAuth() {
  const router = useRouter()
  const lang = useLang()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function claim() {
      try {
        const raw = localStorage.getItem(GUEST_CLAIM_STORAGE_KEY)
        if (!raw) return
        const tokens: string[] = JSON.parse(raw)
        if (!Array.isArray(tokens) || tokens.length === 0) return

        const res = await fetch('/api/claim-guest-results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens: tokens.slice(0, 10) }),
        })
        if (!res.ok) return
        const data = await res.json()
        localStorage.removeItem(GUEST_CLAIM_STORAGE_KEY)
        if (!cancelled && data.claimed > 0) {
          setMessage(
            lang === 'ar'
              ? `تم حفظ ${data.claimed} نتيجة/نتائج من جلسة الضيف في حسابك.`
              : `Saved ${data.claimed} guest result(s) to your account.`
          )
          router.refresh()
        }
      } catch {
        // Non-fatal — leave tokens for a later attempt
      }
    }
    claim()
    return () => { cancelled = true }
  }, [lang, router])

  if (!message) return null
  return (
    <div className="mb-4 alert-success text-[13px]" role="status">
      {message}
    </div>
  )
}
