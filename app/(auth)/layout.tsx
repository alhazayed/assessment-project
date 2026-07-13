import { getLanguage } from '@/lib/get-language'
import LanguageToggle from '@/components/language-toggle'
import DarkModeToggle from '@/components/dark-mode-toggle'
import TurnstileScript from '@/components/turnstile-script'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const lang = getLanguage()
  const isRtl = lang === 'ar'

  return (
    <div className="min-h-screen flex">
      <TurnstileScript />
      {/* Brand panel — left (or right in RTL) */}
      <div
        className={`hidden lg:flex flex-col justify-between p-10 w-[440px] flex-shrink-0 relative overflow-hidden ${isRtl ? 'order-2' : 'order-1'}`}
        style={{ background: 'linear-gradient(160deg, #0E1E30 0%, #12273C 55%, #1D3A52 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-[0.08]" style={{ background: '#1D6296' }} />
          <div className="absolute top-1/3 -left-24 w-80 h-80 rounded-full opacity-[0.06]" style={{ background: '#4C9BE0' }} />
          <div className="absolute -bottom-20 right-8 w-56 h-56 rounded-full opacity-[0.07]" style={{ background: '#F3650A' }} />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div className="w-10 h-10 rounded-[11px] flex items-center justify-center" style={{ background: '#1D6296' }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight" style={{ letterSpacing: '-0.02em' }}>
              V Welfare
            </span>
          </Link>
        </div>

        {/* Center copy */}
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold text-white mb-4 leading-tight" style={{ letterSpacing: '-0.025em' }}>
            {isRtl ? 'صحتك النفسية\nتهمنا.' : 'Your mental\nwellness matters.'}
          </h1>
          <p className="text-base leading-relaxed" style={{ color: '#7EB7DB' }}>
            {isRtl
              ? 'منصة آمنة وسرية لتقييم صحتك النفسية وتتبع تقدمك مع دعم متخصص.'
              : 'A safe, confidential platform for mental health assessments, mood tracking, and guided support.'}
          </p>

          {/* Trust stats */}
          <div className="flex gap-8 mt-8">
            {[
              { value: '39+', label: isRtl ? 'تقييم معتمد' : 'Validated tools' },
              { value: '100%', label: isRtl ? 'سرية تامة' : 'Confidential' },
              { value: '24/7', label: isRtl ? 'دعم مستمر' : 'Always available' },
            ].map(s => (
              <div key={s.value}>
                <p className="text-2xl font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6CA8CC' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer quote */}
        <div className="relative z-10">
          <p className="text-xs leading-relaxed" style={{ color: '#4A7A9B' }}>
            {isRtl
              ? '"رعاية صحتك النفسية هي أشجع شيء يمكنك فعله."'
              : '"Taking care of your mental health is one of the bravest things you can do."'}
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className={`flex-1 flex flex-col ${isRtl ? 'order-1' : 'order-2'}`} style={{ backgroundColor: 'var(--page-bg)' }}>
        {/* Topbar */}
        <div className="flex items-center justify-between px-8 py-5">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 no-underline lg:invisible">
            <div className="w-8 h-8 rounded-[9px] flex items-center justify-center" style={{ background: '#1D6296' }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="font-bold text-base" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>V Welfare</span>
          </Link>
          <div className={`flex items-center gap-2 ${isRtl ? 'mr-auto' : 'ml-auto'}`}>
            <DarkModeToggle />
            <LanguageToggle lang={lang} />
          </div>
        </div>

        {/* Form content */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-[400px]">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 text-center">
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {isRtl ? `© ${new Date().getFullYear()} V Welfare. جميع الحقوق محفوظة.` : `© ${new Date().getFullYear()} V Welfare. All rights reserved.`}
          </p>
        </div>
      </div>
    </div>
  )
}
