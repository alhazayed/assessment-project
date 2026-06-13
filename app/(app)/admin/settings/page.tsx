import Link from 'next/link'
import { Shield, User, ExternalLink, ChevronRight } from 'lucide-react'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'

export default async function AdminSettingsPage() {
  const lang = await getLanguage()

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('admin.settings.title', lang)}</h1>
      <p className="text-gray-500 mb-8">{t('nav.settings', lang)}</p>

      <div className="space-y-4">
        <Link
          href="/x/control/overview"
          className="flex items-center justify-between p-5 bg-white border border-gray-200 rounded-xl hover:border-brand-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 flex items-center gap-2">
                {t('admin.settings.panel_link', lang)}
                <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
              </p>
              <p className="text-sm text-gray-500 mt-0.5">{t('admin.settings.panel_desc', lang)}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-brand-400 transition-colors flex-shrink-0" />
        </Link>

        <Link
          href="/profile"
          className="flex items-center justify-between p-5 bg-white border border-gray-200 rounded-xl hover:border-brand-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{t('admin.settings.profile_link', lang)}</p>
              <p className="text-sm text-gray-500 mt-0.5">{t('profile.title', lang)}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-brand-400 transition-colors flex-shrink-0" />
        </Link>
      </div>
    </div>
  )
}
