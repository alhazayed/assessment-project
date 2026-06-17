import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import LanguageToggle from '@/components/language-toggle'
import BrandLogo from '@/components/brand-logo'
import DarkModeToggle from '@/components/dark-mode-toggle'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const lang = getLanguage()
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100/30 dark:from-[#0B1521] dark:via-[#0A1019] dark:to-[#0D1B2A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4 gap-2">
          <DarkModeToggle />
          <LanguageToggle lang={lang} />
        </div>
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <BrandLogo variant="full" size={100} />
          </div>
          <p className="text-sm text-gray-500 mt-1">{t('app.tagline', lang)}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
