'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next')
  const lang = useLang()
  const isRtl = lang === 'ar'

  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [fullName, setFullName]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [success, setSuccess]         = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError(isRtl ? 'يرجى إدخال اسم كامل صحيح' : 'Please enter a valid full name')
      setLoading(false)
      return
    }
    if (password.length < 8) {
      setError(isRtl ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters')
      setLoading(false)
      return
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError(isRtl ? 'كلمة المرور يجب أن تحتوي على حروف وأرقام' : 'Password must contain both letters and numbers')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name_en: fullName },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://vwelfare.vercel.app'}/auth/confirm?next=${encodeURIComponent(next || '/onboarding')}`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (data.session) {
      router.push(next || '/onboarding')
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#E6F4EC' }}>
          <CheckCircle2 className="w-8 h-8" style={{ color: '#1B8A5A' }} />
        </div>
        <h1 className="text-2xl font-extrabold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {t('auth.register.success.title', lang)}
        </h1>
        <p className="text-[14.5px] mb-6" style={{ color: 'var(--text-secondary)' }}>
          {isRtl
            ? `تم إرسال رابط التحقق إلى ${email}. انقر على الرابط في بريدك الإلكتروني للمتابعة.`
            : `A verification link was sent to ${email}. Click the link in your email to continue.`}
        </p>
        <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          {isRtl ? 'لم تستلم البريد؟ تحقق من مجلد الرسائل غير المرغوب فيها.' : "Didn't receive it? Check your spam folder."}
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-[28px] font-extrabold tracking-tight mb-1.5" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          {t('auth.register.title', lang)}
        </h1>
        <p className="text-[14.5px]" style={{ color: 'var(--text-secondary)' }}>
          {isRtl ? 'أنشئ حسابك وابدأ رحلتك نحو صحة نفسية أفضل.' : 'Create your account and start your wellness journey.'}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="alert-error mb-5 text-[14px]" style={{ color: '#C02A2A' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="label" htmlFor="fullName">{t('auth.register.name', lang)}</label>
          <div className="field-wrapper">
            <User className="field-icon" />
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              placeholder={t('auth.register.name.ph', lang)}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="label" htmlFor="email">{t('auth.register.email', lang)}</label>
          <div className="field-wrapper">
            <Mail className="field-icon" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="label" htmlFor="password">{t('auth.register.password', lang)}</label>
          <div className="field-wrapper">
            <Lock className="field-icon" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder={t('auth.register.password.ph', lang)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="flex-shrink-0 transition-colors"
              style={{ color: 'var(--text-icon)' }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="mt-1.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            {isRtl ? '٨ أحرف على الأقل، تشمل حروفاً وأرقاماً' : 'At least 8 characters, including letters and numbers'}
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn-accent w-full mt-2"
          disabled={loading}
        >
          {loading ? t('auth.register.submitting', lang) : (
            <>
              {t('auth.register.submit', lang)}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Login link */}
      <p className="mt-6 text-center text-[13.5px]" style={{ color: 'var(--text-muted)' }}>
        {t('auth.register.have_account', lang)}{' '}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
          className="font-semibold no-underline hover:underline"
          style={{ color: '#1D6296' }}
        >
          {t('auth.register.signin', lang)}
        </Link>
      </p>
    </div>
  )
}
