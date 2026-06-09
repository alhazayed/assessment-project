import Link from 'next/link'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import { Heart, ArrowLeft } from 'lucide-react'

export default async function NotFound() {
  const lang = await getLanguage()
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 shadow-lg mb-6">
          <Heart className="w-8 h-8 text-white" />
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
