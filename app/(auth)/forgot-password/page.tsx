'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle2, Send } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

export default function ForgotPasswordPage() {
  const lang = useLang()
  const isRtl = lang === 'ar'
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirectTo: `${location.origin}/reset-password`,
        }),
      })
      if (res.status === 429) {
        const data = await res.json()
        setError(data.error ?? 'Too many requests. Please wait before trying again.')
      } else {
        setSent(true)
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#EAF2F9' }}>
          <CheckCircle2 className="w-8 h-8" style={{ color: '#1D6296' }} />
        </div>
        <h1 className="text-2xl font-extrabold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {t('auth.forgot.title', lang)}
        </h1>
        <p className="text-[14.5px] mb-8" style={{ color: 'var(--text-secondary)' }}>
          {t('auth.forgot.success', lang)}
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold no-underline hover:underline"
          style={{ color: '#1D6296' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('auth.forgot.back', lang)}
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-[28px] font-extrabold tracking-tight mb-1.5" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          {t('auth.forgot.title', lang)}
        </h1>
        <p className="text-[14.5px]" style={{ color: 'var(--text-secondary)' }}>
          {t('auth.forgot.desc', lang)}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="alert-error mb-5 text-[14px]" style={{ color: '#C02A2A' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">{t('auth.login.email', lang)}</label>
          <div className="field-wrapper">
            <Mail className="field-icon" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn-accent w-full"
          disabled={loading}
        >
          {loading ? t('auth.forgot.submitting', lang) : (
            <>
              <Send className="w-4 h-4" />
              {t('auth.forgot.submit', lang)}
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold no-underline hover:underline"
          style={{ color: '#1D6296' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('auth.forgot.back', lang)}
        </Link>
      </div>
    </div>
  )
}
