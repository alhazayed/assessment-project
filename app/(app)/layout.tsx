import { createClient } from '@/lib/supabase/server'
import { getLanguage } from '@/lib/get-language'
import Link from 'next/link'
import Sidebar from '@/components/sidebar'
import LanguageToggle from '@/components/language-toggle'
import DarkModeToggle from '@/components/dark-mode-toggle'
import type { Profile } from '@/lib/types'
import { t } from '@/lib/i18n'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const lang = getLanguage()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: Profile | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data as Profile | null
  }

  if (user && profile) {
    return (
      <div className="flex min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
        >
          {lang === 'ar' ? 'تخطي إلى المحتوى الرئيسي' : 'Skip to main content'}
        </a>
        <Sidebar profile={profile} lang={lang} />
        <main
          id="main-content"
          className="flex-1 min-w-0 overflow-auto"
          style={{
            marginInlineStart: 'var(--sidebar-w)',
            backgroundColor: 'var(--page-bg)',
          }}
        >
          {children}
        </main>
      </div>
    )
  }

  // Guest / unauthenticated state — show minimal header
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        {lang === 'ar' ? 'تخطي إلى المحتوى الرئيسي' : 'Skip to main content'}
      </a>
      <header className="topbar sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            V Welfare
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <DarkModeToggle />
          <LanguageToggle lang={lang} />
          <Link href="/login" className="btn-ghost">{t('nav.signin', lang)}</Link>
          <Link href="/register" className="btn-accent">{t('nav.create_account', lang)}</Link>
        </div>
      </header>
      <main id="main-content">{children}</main>
    </div>
  )
}
