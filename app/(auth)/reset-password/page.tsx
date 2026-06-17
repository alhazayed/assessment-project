'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { KeyRound, Eye, EyeOff } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

export default function ResetPasswordPage() {
  const lang = useLang()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
      setTimeout(() => router.push('/login'), 1500)
    }
  }

  if (done) {
    return (
      <div className="card p-8 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#E6F4F0' }}>
          <KeyRound className="w-7 h-7 text-green-600" />
        </div>
        <h2 className="text-[18px] font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('auth.reset.done', lang)}</h2>
        <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>{t('auth.reset.redirecting', lang)}</p>
      </div>
    )
  }

  return (
    <div className="card p-8">
      <div className="mb-7">
        <h2 className="text-[22px] font-extrabold tracking-tight mb-1.5" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          {t('auth.reset.title', lang)}
        </h2>
        <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>{t('auth.reset.subtitle', lang)}</p>
      </div>

      {error && (
        <div className="mb-5 alert-error">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label" htmlFor="password">{t('auth.reset.password', lang)}</label>
          <div className="field-wrapper">
            <KeyRound className="field-icon w-4 h-4" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="field-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••"
            />
            <button
              type="button"
              className="absolute inset-y-0 end-0 pe-3 flex items-center transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11.5px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
            {t('auth.reset.hint', lang)}
          </p>
        </div>

        <button
          type="submit"
          className="btn-accent w-full gap-2"
          disabled={loading || password.length < 8}
        >
          <KeyRound className="w-4 h-4" />
          {loading ? t('auth.reset.submitting', lang) : t('auth.reset.submit', lang)}
        </button>
      </form>
    </div>
  )
}
