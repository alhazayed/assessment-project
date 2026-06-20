import Link from 'next/link'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import { ArrowLeft } from 'lucide-react'
import BrandLogo from '@/components/brand-logo'

export default async function NotFound() {
  const lang = await getLanguage()
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--page-bg)' }}>
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <BrandLogo variant="full" size={100} />
        </div>
        <p className="text-6xl font-black mb-3" style={{ color: 'var(--vw-blue)' }}>404</p>
        <h1 className="text-2xl font-extrabold tracking-tight mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>{t('error.404.title', lang)}</h1>
        <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>{t('error.404.sub', lang)}</p>
        <Link href="/" className="btn-accent gap-2">
          <ArrowLeft className="w-4 h-4" />
          {t('error.404.back', lang)}
        </Link>
      </div>
    </div>
  )
}
