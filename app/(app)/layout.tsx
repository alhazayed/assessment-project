import { createClient } from '@/lib/supabase/server'
import { getLanguage } from '@/lib/get-language'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Sidebar from '@/components/sidebar'
import PushRegistration from '@/components/native/PushRegistration'
import { isMobileAppUserAgent } from '@/lib/capacitor/server'
import type { Profile } from '@/lib/types'

export const metadata = {
  robots: { index: false, follow: false },
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const lang = await getLanguage()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data }, { data: flagRow }] = await Promise.all([
    supabase.from('profiles').select('id, role, full_name_en, full_name_ar, language_preference, is_active').eq('id', user.id).single(),
    supabase.from('feature_flags').select('is_enabled').eq('flag_key', 'show_packages').single(),
  ])
  const profile = data as Profile | null
  const showPackages = flagRow?.is_enabled ?? false
  const isMobileApp = isMobileAppUserAgent((await headers()).get('user-agent'))

  // Admin accounts are web-only in the native app: bounce them to the notice
  // instead of the standard app shell (defense in depth on top of middleware +
  // the admin PIN).
  if (isMobileApp && (profile?.role === 'admin' || profile?.role === 'superadmin')) {
    redirect('/mobile/web-only')
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        {lang === 'ar' ? 'تخطي إلى المحتوى الرئيسي' : 'Skip to main content'}
      </a>
      <Sidebar profile={profile} lang={lang} showPackages={showPackages} isMobileApp={isMobileApp} />
      <main
        id="main-content"
        className="flex-1 min-w-0 overflow-auto pt-[calc(var(--topbar-h)_+_env(safe-area-inset-top))] lg:pt-0 lg:ms-[248px]"
        style={{ backgroundColor: 'var(--page-bg)' }}
      >
        {children}
      </main>
      <PushRegistration />
    </div>
  )
}
