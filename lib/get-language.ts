import { cookies } from 'next/headers'
import type { Lang } from './i18n'

export function getLanguage(): Lang {
  const lang = cookies().get('lang')?.value
  return lang === 'ar' ? 'ar' : 'en'
}
