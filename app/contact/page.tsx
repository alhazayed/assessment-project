import Link from 'next/link'
import { getLanguage } from '@/lib/get-language'
import { Mail, ArrowLeft } from 'lucide-react'
import BrandLogo from '@/components/brand-logo'
import DarkModeToggle from '@/components/dark-mode-toggle'
import LanguageToggle from '@/components/language-toggle'

export default function ContactPage() {
  const lang = getLanguage()
  const isRtl = lang === 'ar'

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
      <header className="sticky top-0 z-50" style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <BrandLogo variant="icon" size={36} />
            <span className="text-base font-extrabold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              V Welfare
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <LanguageToggle lang={lang} />
            <Link href="/login" className="btn-ghost">{isRtl ? 'تسجيل الدخول' : 'Sign in'}</Link>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-20">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium mb-10 hover:opacity-80 transition-opacity" style={{ color: '#1D6296' }}>
          <ArrowLeft className="w-4 h-4" />
          {isRtl ? 'العودة للرئيسية' : 'Back to home'}
        </Link>

        <h1 className="text-[36px] font-extrabold tracking-tight mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          {isRtl ? 'تواصل معنا' : 'Contact Us'}
        </h1>
        <p className="text-lg mb-12" style={{ color: 'var(--text-secondary)' }}>
          {isRtl
            ? 'نحن هنا للمساعدة. لا تتردد في التواصل معنا بأي استفسار.'
            : "We're here to help. Reach out with any questions or feedback."}
        </p>

        <div className="card p-8 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EAF2F9' }}>
              <Mail className="w-5 h-5" style={{ color: '#1D6296' }} />
            </div>
            <div>
              <h2 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                {isRtl ? 'البريد الإلكتروني' : 'Email'}
              </h2>
              <p className="text-[13.5px] mb-3" style={{ color: 'var(--text-secondary)' }}>
                {isRtl
                  ? 'للدعم العام والأسئلة الفنية والاستفسارات العامة:'
                  : 'For general support, technical questions, and inquiries:'}
              </p>
              <a
                href="mailto:info@vwelfare.com"
                className="font-semibold hover:underline"
                style={{ color: '#1D6296' }}
              >
                info@vwelfare.com
              </a>
            </div>
          </div>
        </div>

        <div className="card p-6" style={{ background: 'var(--surface-alt)' }}>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {isRtl
              ? 'تذكير: هذه المنصة مخصصة للفحص النفسي وليست بديلاً عن الرعاية الصحية المهنية. إذا كنت في أزمة أو تحتاج إلى مساعدة فورية، يرجى التواصل مع خدمات الطوارئ المحلية أو خط دعم الأزمات.'
              : 'Reminder: This platform is for screening purposes and is not a substitute for professional mental health care. If you are in crisis or need immediate help, please contact your local emergency services or a crisis support line.'}
          </p>
        </div>
      </div>

      <footer className="py-8 px-6 text-center" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {isRtl
            ? `© ${new Date().getFullYear()} V Welfare. جميع الحقوق محفوظة.`
            : `© ${new Date().getFullYear()} V Welfare. All rights reserved.`}
        </p>
      </footer>
    </div>
  )
}
