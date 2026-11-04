import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLanguage } from '@/lib/get-language'
import PublicMarketingShell from '@/components/public-marketing-shell'
import RedeemForm from './redeem-form'

export const metadata = { title: 'Redeem a package code', robots: { index: false, follow: false } }

/**
 * Redeem a one-time gift code. Lives outside the (app) group so a signed-out
 * visitor from the gift email is sent to sign in and comes back with the code.
 */
export default async function RedeemPage(props: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await props.searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const next = code ? `/redeem?code=${encodeURIComponent(code)}` : '/redeem'
    redirect(`/login?next=${encodeURIComponent(next)}`)
  }
  const lang = await getLanguage()

  return (
    <PublicMarketingShell>
      <main className="max-w-md mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-2" style={{ color: 'var(--text-primary)' }}>
          {lang === 'ar' ? 'استخدم رمز الباقة' : 'Redeem a package code'}
        </h1>
        <p className="text-[14px] mb-6" style={{ color: 'var(--text-secondary)' }}>
          {lang === 'ar'
            ? 'أدخل الرمز الذي وصلك بالبريد الإلكتروني. يعمل الرمز مرة واحدة ويفتح الباقة في هذا الحساب.'
            : 'Enter the code from your email. It works once and opens the package on this account.'}
        </p>
        <RedeemForm initialCode={typeof code === 'string' ? code.slice(0, 20) : ''} lang={lang} />
      </main>
    </PublicMarketingShell>
  )
}
