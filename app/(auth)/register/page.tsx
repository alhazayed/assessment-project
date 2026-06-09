'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { UserPlus } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

export default function RegisterPage() {
  const router = useRouter()
  const lang = useLang()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError(lang === 'ar' ? 'يرجى إدخال اسم كامل صحيح' : 'Please enter a valid full name')
      setLoading(false)
      return
    }
    if (password.length < 8) {
      setError(lang === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters')
      setLoading(false)
      return
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError(lang === 'ar' ? 'كلمة المرور يجب أن تحتوي على حروف وأرقام' : 'Password must contain both letters and numbers')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name_en: fullName },
        emailRedirectTo: `${location.origin}/auth/confirm?next=/onboarding`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (data.session) {
      // Email confirmation disabled — user is signed in immediately
      router.push('/onboarding')
    } else {
      // Email confirmation required — show "check your email" screen
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="card p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('auth.register.success.title', lang)}</h2>
        <p className="text-gray-500 text-sm mb-6">
          {lang === 'ar'
            ? `تم إرسال رابط التحقق إلى ${email}. انقر على الرابط في بريدك الإلكتروني للمتابعة.`
            : `A verification link was sent to ${email}. Click the link in your email to continue.`}
        </p>
        <p className="text-xs text-gray-400">
          {lang === 'ar' ? 'لم تستلم البريد؟ تحقق من مجلد الرسائل غير المرغوب فيها.' : "Didn't receive it? Check your spam folder."}
        </p>
      </div>
    )
  }

  return (
    <div className="card p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('auth.register.title', lang)}</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label" htmlFor="fullName">{t('auth.register.name', lang)}</label>
          <input
            id="fullName"
            type="text"
            className="input"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
            placeholder={t('auth.register.name.ph', lang)}
          />
        </div>

        <div>
          <label className="label" htmlFor="email">{t('auth.register.email', lang)}</label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="label" htmlFor="password">{t('auth.register.password', lang)}</label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder={t('auth.register.password.ph', lang)}
          />
        </div>

        <button type="submit" className="btn-primary w-full gap-2" disabled={loading}>
          <UserPlus className="w-4 h-4" />
          {loading ? t('auth.register.submitting', lang) : t('auth.register.submit', lang)}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        {t('auth.register.have_account', lang)}{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          {t('auth.register.signin', lang)}
        </Link>
      </p>
    </div>
  )
}
