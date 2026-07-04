'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

function safeRedirectUrl(raw: string | null): string {
  if (!raw) return '/dashboard'
  // Reject absolute URLs and protocol-relative URLs
  if (/^https?:\/\//i.test(raw) || raw.startsWith('//')) return '/dashboard'
  // Must start with /
  if (!raw.startsWith('/')) return '/dashboard'
  // Reject redirects to admin or API areas from public auth
  if (raw.startsWith('/x/control') || raw.startsWith('/api/')) return '/dashboard'
  return raw
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeRedirectUrl(searchParams.get('next'))
  const lang = useLang()
  const isRtl = lang === 'ar'
  const turnstileRef = useRef<HTMLDivElement>(null)

  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]         = useState(false)
  // Surface auth-callback failures (/auth/confirm redirects here with ?error=…)
  // so a failed email verification isn't a silent blank login page.
  const [error, setError]             = useState<string | null>(
    searchParams.get('error') === 'verification_failed'
      ? (lang === 'ar'
          ? 'انتهت صلاحية رابط التحقق أو تم استخدامه. سجّل الدخول أو اطلب رابطاً جديداً.'
          : 'Your verification link has expired or was already used. Sign in, or request a new link.')
      : null
  )
  // True when Turnstile can't be used (failed to connect, errored, timed out,
  // or its script never loaded). We then stop hard-gating login on the CAPTCHA
  // so a third-party widget outage can't lock every user out. Login is still
  // protected server-side by the rate limiter.
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false)

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (typeof window === 'undefined' || !siteKey || !turnstileRef.current) return

    let cancelled = false
    const render = (): boolean => {
      if (cancelled || !turnstileRef.current || !window.turnstile) return false
      try {
        window.turnstile.render(turnstileRef.current, {
          sitekey: siteKey,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          callback: () => setCaptchaUnavailable(false),
          'error-callback': () => setCaptchaUnavailable(true),
          'timeout-callback': () => setCaptchaUnavailable(true),
        } as any)
        return true
      } catch {
        return false
      }
    }

    // api.js is async/defer, so it may not be ready at mount — poll briefly,
    // and if it never loads, mark the CAPTCHA unavailable rather than blocking.
    if (render()) return () => { cancelled = true }
    const started = Date.now()
    const iv = setInterval(() => {
      if (cancelled || render()) { clearInterval(iv); return }
      if (Date.now() - started > 8000) { clearInterval(iv); setCaptchaUnavailable(true) }
    }, 300)
    return () => { cancelled = true; clearInterval(iv) }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Step 1: Check login rate limit
      const limitRes = await fetch('/api/auth/check-login-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!limitRes.ok) {
        const data = await limitRes.json()
        setError(data.error || 'Too many login attempts. Please try again later.')
        setLoading(false)
        return
      }

      // Step 2: Verify CAPTCHA if enabled. Only hard-block when the widget is
      // actually usable — if it failed to load/connect, don't lock the user
      // out (rate limiting above is the brute-force defense).
      const turnstileToken = window.turnstile?.getResponse()
      if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken && !captchaUnavailable) {
        setError(isRtl ? 'يرجى التحقق من أنك لست روبوتاً' : 'Please complete the CAPTCHA verification')
        setLoading(false)
        window.turnstile?.reset()
        return
      }

      if (turnstileToken) {
        const captchaRes = await fetch('/api/auth/verify-captcha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: turnstileToken }),
        })

        if (!captchaRes.ok) {
          const data = await captchaRes.json()
          setError(isRtl ? 'فشل التحقق من CAPTCHA' : 'CAPTCHA verification failed')
          setLoading(false)
          window.turnstile?.reset()
          return
        }
      }

      // Step 3: Attempt login. Also pass the Turnstile token to Supabase Auth
      // itself (options.captchaToken) — if the project's Auth > Attack
      // Protection captcha provider is enabled, GoTrue verifies it server-side
      // independent of this frontend, which is the only enforcement a scripted
      // client hitting the Auth REST endpoint directly can't bypass.
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        ...(turnstileToken ? { options: { captchaToken: turnstileToken } } : {}),
      })

      if (error) {
        setError(
          isRtl
            ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
            : 'Invalid email or password.'
        )
        setLoading(false)
        if (turnstileToken) window.turnstile?.reset()
      } else {
        router.push(next)
        router.refresh()
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(isRtl ? 'حدث خطأ أثناء تسجيل الدخول' : 'An error occurred during login')
      setLoading(false)
      if (window.turnstile?.getResponse()) window.turnstile?.reset()
    }
  }

  return (
    <div>
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-[28px] font-extrabold tracking-tight mb-1.5" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          {t('auth.login.title', lang)}
        </h1>
        <p className="text-[14.5px]" style={{ color: 'var(--text-secondary)' }}>
          {isRtl ? 'أدخل بريدك الإلكتروني وكلمة المرور للمتابعة.' : 'Enter your email and password to continue.'}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div id="login-error" className="alert-error mb-5 text-[14px]" style={{ color: '#C02A2A' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
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
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label mb-0" htmlFor="password">{t('auth.login.password', lang)}</label>
            <Link
              href="/forgot-password"
              className="text-[12.5px] font-semibold no-underline hover:underline"
              style={{ color: '#1D6296' }}
            >
              {t('auth.login.forgot_password', lang)}
            </Link>
          </div>
          <div className="field-wrapper">
            <Lock className="field-icon" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
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
        </div>

        {/* Turnstile CAPTCHA */}
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <div className="flex justify-center my-4 cf-turnstile" ref={turnstileRef} data-theme={typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'} />
        )}
        {captchaUnavailable && (
          <p className="text-center text-xs text-gray-400 -mt-2 mb-2">
            {isRtl ? 'تعذّر تحميل التحقق الأمني — يمكنك المتابعة.' : 'Security check unavailable — you can continue.'}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="btn-accent w-full mt-2"
          disabled={loading}
        >
          {loading ? (t('auth.login.submitting', lang)) : (
            <>
              {t('auth.login.submit', lang)}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Register link */}
      <p className="mt-6 text-center text-[13.5px]" style={{ color: 'var(--text-muted)' }}>
        {t('auth.login.no_account', lang)}{' '}
        <Link
          href={searchParams.get('next') ? `/register?next=${encodeURIComponent(searchParams.get('next')!)}` : '/register'}
          className="font-semibold no-underline hover:underline"
          style={{ color: '#1D6296' }}
        >
          {t('auth.login.register', lang)}
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="space-y-4 animate-pulse"><div className="h-8 rounded bg-gray-200 dark:bg-gray-700 w-3/4 mb-8" /><div className="h-10 rounded bg-gray-200 dark:bg-gray-700" /><div className="h-10 rounded bg-gray-200 dark:bg-gray-700" /><div className="h-11 rounded bg-gray-300 dark:bg-gray-600 mt-2" /></div>}>
      <LoginForm />
    </Suspense>
  )
}
