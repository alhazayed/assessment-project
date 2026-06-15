'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

export default function ForgotPasswordPage() {
  const lang = useLang()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      <div className="card p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('auth.forgot.title', lang)}</h2>
        <p className="text-sm text-gray-500 mb-6">{t('auth.forgot.success', lang)}</p>
        <Link href="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center justify-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('auth.forgot.back', lang)}
        </Link>
      </div>
    )
  }

  return (
    <div className="card p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('auth.forgot.title', lang)}</h2>
      <p className="text-sm text-gray-500 mb-6">{t('auth.forgot.desc', lang)}</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label" htmlFor="email">{t('auth.login.email', lang)}</label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>

        <button type="submit" className="btn-primary w-full gap-2" disabled={loading}>
          <Mail className="w-4 h-4" />
          {loading ? t('auth.forgot.submitting', lang) : t('auth.forgot.submit', lang)}
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link href="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center justify-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('auth.forgot.back', lang)}
        </Link>
      </p>
    </div>
  )
}
