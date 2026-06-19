import { createClient } from '@/lib/supabase/server'
import { getLanguage } from '@/lib/get-language'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/sidebar'
import type { Profile } from '@/lib/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const lang = getLanguage()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  const profile = data as Profile | null

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
