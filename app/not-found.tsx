import Link from 'next/link'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import { ArrowLeft } from 'lucide-react'
import BrandLogo from '@/components/brand-logo'

export default async function NotFound() {
  const lang = await getLanguage()
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100/30 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <BrandLogo variant="full" size={100} />
        </div>
        <p className="text-6xl font-black text-brand-600 mb-3">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('error.404.title', lang)}</h1>
        <p className="text-gray-500 mb-8">{t('error.404.sub', lang)}</p>
        <Link href="/" className="btn-primary gap-2">
          <ArrowLeft className="w-4 h-4" />
          {t('error.404.back', lang)}
        </Link>
      </div>
    </div>
  )
}
