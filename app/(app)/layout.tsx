import { createClient } from '@/lib/supabase/server'
import { getLanguage } from '@/lib/get-language'
import Link from 'next/link'
import Sidebar from '@/components/sidebar'
import LanguageToggle from '@/components/language-toggle'
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
      <div className="flex min-h-screen">
        <Sidebar profile={profile} lang={lang} />
        <main className={`flex-1 ${lang === 'ar' ? 'mr-64' : 'ml-64'} overflow-auto`}>{children}</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            {t('app.name', lang)}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle lang={lang} />
            <Link href="/login" className="btn-secondary text-sm px-3 py-1.5">{t('nav.signin', lang)}</Link>
            <Link href="/register" className="btn-primary text-sm px-3 py-1.5">{t('nav.create_account', lang)}</Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
