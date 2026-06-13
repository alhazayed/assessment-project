'use client'
import { useState } from 'react'
import type { Lang } from './i18n'

function readLangCookie(): Lang {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(/(?:^|;\s*)lang=([^;]*)/)
  return match?.[1] === 'ar' ? 'ar' : 'en'
}

export function useLang(): Lang {
  // Lazy initialiser: reads the cookie synchronously on first render
  // so client components get the correct language without a useEffect delay.
  const [lang] = useState<Lang>(readLangCookie)
  return lang
}
