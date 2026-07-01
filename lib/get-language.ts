import { cookies, type UnsafeUnwrappedCookies } from 'next/headers';
import type { Lang } from './i18n'

export function getLanguage(): Lang {
  const lang = (cookies() as unknown as UnsafeUnwrappedCookies).get('lang')?.value
  return lang === 'ar' ? 'ar' : 'en'
}
