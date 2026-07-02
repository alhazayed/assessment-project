import { cookies } from 'next/headers'
import type { Lang } from './i18n'

// Next 16 makes cookies() async, so getLanguage is now async.
// All callers must `await getLanguage()`.
export async function getLanguage(): Promise<Lang> {
  const store = await cookies()
  const lang = store.get('lang')?.value
  return lang === 'ar' ? 'ar' : 'en'
}
