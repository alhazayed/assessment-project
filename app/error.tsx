'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const lang = useLang()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 mb-6">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('error.generic.title', lang)}</h1>
        <p className="text-gray-500 mb-8">{t('error.generic.sub', lang)}</p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary gap-2">
            <RefreshCw className="w-4 h-4" />
            {t('error.generic.retry', lang)}
          </button>
          <Link href="/" className="btn-secondary gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t('error.404.back', lang)}
          </Link>
        </div>
      </div>
    </div>
  )
}
