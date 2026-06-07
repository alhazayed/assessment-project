'use client'
import { useState, useEffect } from 'react'
import type { Lang } from './i18n'

export function useLang(): Lang {
  const [lang, setLang] = useState<Lang>('en')
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)lang=([^;]*)/)
    if (match?.[1] === 'ar') setLang('ar')
  }, [])
  return lang
}
