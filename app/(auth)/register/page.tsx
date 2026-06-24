'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

function safeRedirectUrl(raw: string | null): string | null {
  if (!raw) return null
  // Reject absolute URLs and protocol-relative URLs
  if (/^https?:\/\//i.test(raw) || raw.startsWith('//')) return null
  // Must start with /
  if (!raw.startsWith('/')) return null
  // Reject redirects to admin or API areas from public auth
  if (raw.startsWith('/x/control') || raw.startsWith('/api/')) return null
  return raw
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeRedirectUrl(searchParams.get('next'))
  const lang = useLang()
  const isRtl = lang === 'ar'

  const [email, setEmail]                   = useState('')
  const [password, setPassword]             = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName]             = useState('')
  const [showPassword, setShowPassword]     = useState(false)
  const [showConfirm, setShowConfirm]       = useState(false)
  const [agreedToTerms, setAgreedToTerms]   = useState(false)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [success, setSuccess]               = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending]           = useState(false)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError(isRtl ? 'يرجى إدخال اسم كامل صحيح' : 'Please enter a valid full name')
      return
    }
    if (password.length < 8) {
      setError(isRtl ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters')
      return
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError(isRtl ? 'كلمة المرور يجب أن تحتوي على حروف وأرقام' : 'Password must contain both letters and numbers')
      return
    }
    if (password !== confirmPassword) {
      setError(isRtl ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match')
      return
    }
    if (!agreedToTerms) {
      setError(isRtl ? 'يجب الموافقة على الشروط والسياسة للمتابعة' : 'You must agree to the Terms of Service and Privacy Policy')
      return
    }

    setLoading(true)
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
      // Email confirmation required — show "check your email" screen
      setSuccess(true)
      setResendCooldown(60)
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resending) return
    setResending(true)
    const supabase = createClient()
    await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
    setResendCooldown(60)
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
        <p className="text-[14.5px] mb-2" style={{ color: 'var(--text-secondary)' }}>
          {isRtl
            ? `تم إرسال رابط التحقق إلى ${email}.`
            : `A verification link was sent to ${email}.`}
        </p>
        <p className="text-[13px] mb-6" style={{ color: 'var(--text-muted)' }}>
          {isRtl ? 'انقر على الرابط في بريدك الإلكتروني للمتابعة. تحقق من مجلد الرسائل غير المرغوب فيها إن لم تجده.'
                  : "Click the link in your email to continue. Check your spam folder if you don't see it."}
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0 || resending}
          className="btn-ghost gap-2 mb-4 w-full"
        >
          <RefreshCw className="w-4 h-4" />
          {resendCooldown > 0
            ? (isRtl ? `إعادة الإرسال بعد ${resendCooldown}ث` : `Resend in ${resendCooldown}s`)
            : (isRtl ? 'إعادة إرسال بريد التحقق' : 'Resend verification email')}
        </button>
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
          className="text-[13.5px] font-semibold hover:underline"
          style={{ color: '#1D6296' }}
        >
          {isRtl ? '→ العودة إلى تسجيل الدخول' : '← Back to sign in'}
        </Link>
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

      {error && (
        <div id="register-error" className="alert-error mb-5 text-[14px]">
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
              aria-describedby={error ? 'register-error' : undefined}
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

        {/* Confirm Password */}
        <div>
          <label className="label" htmlFor="confirmPassword">
            {isRtl ? 'تأكيد كلمة المرور' : 'Confirm password'}
          </label>
          <div className="field-wrapper">
            <Lock className="field-icon" />
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder={isRtl ? '••••••••' : '••••••••'}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="flex-shrink-0 transition-colors"
              style={{ color: 'var(--text-icon)' }}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="mt-1 text-[12px]" style={{ color: '#C02A2A' }}>
              {isRtl ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match'}
            </p>
          )}
        </div>

        {/* Terms checkbox */}
        <label className="flex items-start gap-3 cursor-pointer">
          <div
            className="mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors"
            style={agreedToTerms
              ? { backgroundColor: '#1D6296', borderColor: '#1D6296' }
              : { borderColor: 'var(--border)' }}
            onClick={() => setAgreedToTerms(!agreedToTerms)}
          >
            {agreedToTerms && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {isRtl ? (
              <>
                أوافق على{' '}
                <Link href="/terms" className="underline" style={{ color: '#1D6296' }}>شروط الخدمة</Link>
                {' '}و{' '}
                <Link href="/privacy" className="underline" style={{ color: '#1D6296' }}>سياسة الخصوصية</Link>
              </>
            ) : (
              <>
                I agree to the{' '}
                <Link href="/terms" className="underline" style={{ color: '#1D6296' }}>Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="underline" style={{ color: '#1D6296' }}>Privacy Policy</Link>
              </>
            )}
          </span>
        </label>

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

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="space-y-4 animate-pulse"><div className="h-8 rounded bg-gray-200 dark:bg-gray-700 w-3/4 mb-8" /><div className="h-10 rounded bg-gray-200 dark:bg-gray-700" /><div className="h-10 rounded bg-gray-200 dark:bg-gray-700" /><div className="h-10 rounded bg-gray-200 dark:bg-gray-700" /><div className="h-11 rounded bg-gray-300 dark:bg-gray-600 mt-2" /></div>}>
      <RegisterForm />
    </Suspense>
  )
}
