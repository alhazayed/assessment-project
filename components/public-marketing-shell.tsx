import Link from 'next/link'
import { getLanguage } from '@/lib/get-language'
import BrandLogo from '@/components/brand-logo'
import DarkModeToggle from '@/components/dark-mode-toggle'
import LanguageToggle from '@/components/language-toggle'
import { t } from '@/lib/i18n'

export default async function PublicMarketingShell({
  children,
}: {
  children: React.ReactNode
}) {
  const lang = await getLanguage()
  const isRtl = lang === 'ar'

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--page-bg)' }}>
      <header
        className="sticky top-0 z-50 safe-top safe-x"
        style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2.5 no-underline min-w-0">
            <BrandLogo variant="icon" size={36} />
            <span
              className="hidden sm:inline text-base font-extrabold tracking-tight truncate"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
            >
              V Welfare
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-5 text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            <Link href="/learn" className="hover:opacity-80">{isRtl ? 'مكتبة التعلم' : 'Learn'}</Link>
            <Link href="/faq" className="hover:opacity-80">{isRtl ? 'الأسئلة الشائعة' : 'FAQ'}</Link>
            <Link href="/clinicians" className="hover:opacity-80">{isRtl ? 'للأطباء' : 'Clinicians'}</Link>
            <Link href="/contact" className="hover:opacity-80">{isRtl ? 'تواصل' : 'Contact'}</Link>
          </nav>
          <div className="flex items-center gap-2 flex-shrink-0">
            <DarkModeToggle />
            <LanguageToggle lang={lang} />
            <Link href="/register" className="hidden sm:inline-flex btn-accent text-sm">
              {t('nav.signup', lang)}
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <footer style={{ backgroundColor: '#0E1A26' }}>
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <BrandLogo variant="icon" size={30} />
            <span className="text-base font-bold text-white">V Welfare</span>
          </div>
          <div className="flex items-center flex-wrap justify-center gap-5 text-[13px]" style={{ color: '#4A7A9B' }}>
            <Link href="/learn" className="hover:text-white transition-colors">{isRtl ? 'مكتبة التعلم' : 'Learn'}</Link>
            <Link href="/faq" className="hover:text-white transition-colors">{isRtl ? 'الأسئلة الشائعة' : 'FAQ'}</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">{isRtl ? 'الخصوصية' : 'Privacy'}</Link>
            <Link href="/terms" className="hover:text-white transition-colors">{isRtl ? 'الشروط' : 'Terms'}</Link>
            <Link href="/clinicians" className="hover:text-white transition-colors">{isRtl ? 'للأطباء' : 'Clinicians'}</Link>
            <Link href="/contact" className="hover:text-white transition-colors">{isRtl ? 'تواصل' : 'Contact'}</Link>
            <Link href="/sample-result" className="hover:text-white transition-colors">{isRtl ? 'عينة نتيجة' : 'Sample result'}</Link>
          </div>
          <p className="text-[11.5px] text-center md:text-end" style={{ color: '#2E4A62' }}>
            {t('footer.disclaimer', lang)}
          </p>
        </div>
      </footer>
    </div>
  )
}
