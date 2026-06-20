'use client'
import { useRouter } from 'next/navigation'
import type { Lang } from '@/lib/i18n'

export default function LanguageToggle({ lang, className }: { lang: Lang; className?: string }) {
  const router = useRouter()

  function toggle() {
    const next = lang === 'en' ? 'ar' : 'en'
    document.cookie = `lang=${next}; path=/; max-age=31536000; SameSite=Lax`
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-[#9DB0C2] rounded-lg border border-gray-200 dark:border-[#233241] hover:border-gray-300 dark:hover:border-[#2A3D52] hover:bg-gray-50 dark:hover:bg-[#122030] transition-colors ${className ?? ''}`}
      aria-label={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'}
    >
      <span className="text-base leading-none">{lang === 'en' ? '🌐' : '🌐'}</span>
      {lang === 'en' ? 'العربية' : 'English'}
    </button>
  )
}
