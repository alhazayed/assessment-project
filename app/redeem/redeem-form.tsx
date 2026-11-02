'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const MESSAGES: Record<string, { en: string; ar: string }> = {
  invalid: { en: 'That code is not valid. Check it and try again.', ar: 'هذا الرمز غير صحيح. تحقق منه وحاول مرة أخرى.' },
  used: { en: 'This code has already been used.', ar: 'تم استخدام هذا الرمز من قبل.' },
  already_redeemed_by_you: { en: 'You have already redeemed this code.', ar: 'لقد استخدمت هذا الرمز من قبل.' },
  already_owned: {
    en: 'You already have this package, so the code was not used. You can pass it on to someone else.',
    ar: 'لديك هذه الباقة بالفعل، لذا لم يُستخدم الرمز. يمكنك إعطاؤه لشخص آخر.',
  },
  rate_limited: { en: 'Too many attempts. Please try again later.', ar: 'محاولات كثيرة جداً. حاول لاحقاً.' },
  error: { en: 'Something went wrong. Please try again.', ar: 'حدث خطأ. حاول مرة أخرى.' },
}

export default function RedeemForm({ initialCode, lang }: { initialCode: string; lang: 'en' | 'ar' }) {
  const router = useRouter()
  const [code, setCode] = useState(initialCode)
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [packageId, setPackageId] = useState<string | null>(null)
  const isAr = lang === 'ar'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setReason(null)
    setPackageId(null)
    try {
      const res = await fetch('/api/packages/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        router.push(`/packages/${data.packageId}?purchased=1`)
        return
      }
      setReason(typeof data.reason === 'string' && MESSAGES[data.reason] ? data.reason : 'error')
      if (typeof data.packageId === 'string') setPackageId(data.packageId)
    } catch {
      setReason('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <div>
        <label htmlFor="gift-code" className="block text-[13px] font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
          {isAr ? 'الرمز' : 'Code'}
        </label>
        <input
          id="gift-code"
          name="code"
          dir="ltr"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="XXXX-XXXX-XXXX"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          maxLength={20}
          required
          className="w-full px-3 py-2.5 rounded-lg border text-lg tracking-widest font-mono text-center"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
          aria-invalid={reason === 'invalid' ? true : undefined}
          aria-describedby={reason ? 'redeem-message' : undefined}
        />
      </div>
      {reason && (
        <p id="redeem-message" role="alert" className="text-[13.5px]" style={{ color: reason === 'already_owned' || reason === 'already_redeemed_by_you' ? 'var(--text-secondary)' : '#b91c1c' }}>
          {isAr ? MESSAGES[reason].ar : MESSAGES[reason].en}{' '}
          {packageId && (
            <Link href={`/packages/${packageId}`} className="font-semibold underline" style={{ color: '#1D6296' }}>
              {isAr ? 'افتح الباقة' : 'Open the package'}
            </Link>
          )}
        </p>
      )}
      <button type="submit" disabled={loading || code.trim().length < 12} className="btn-accent w-full inline-flex items-center justify-center gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
        {isAr ? 'افتح الباقة' : 'Open the package'}
      </button>
    </form>
  )
}
