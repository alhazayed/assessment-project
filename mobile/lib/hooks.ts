import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Localization from 'expo-localization'
import type { Lang } from './i18n'

const LANG_KEY = '@vwelfare_lang'
const THEME_KEY = '@vwelfare_theme'

export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * Reads/writes language preference from AsyncStorage.
 * Defaults to device locale if available, otherwise 'en'.
 */
export function useLocale(): { lang: Lang; setLang: (l: Lang) => void } {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then(stored => {
      if (stored === 'ar' || stored === 'en') {
        setLangState(stored as Lang)
      } else {
        const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'en'
        const resolved: Lang = deviceLang === 'ar' ? 'ar' : 'en'
        setLangState(resolved)
      }
    })
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    AsyncStorage.setItem(LANG_KEY, l)
  }

  return { lang, setLang }
}

/**
 * Reads/writes theme mode from AsyncStorage.
 * Returns current mode, setter, and isDark boolean.
 */
export function useThemeMode(): { mode: ThemeMode; setMode: (m: ThemeMode) => void; isDark: boolean } {
  const [mode, setModeState] = useState<ThemeMode>('system')

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(stored => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored as ThemeMode)
      }
    })
  }, [])

  function setMode(m: ThemeMode) {
    setModeState(m)
    AsyncStorage.setItem(THEME_KEY, m)
  }

  const isDark = mode === 'dark'

  return { mode, setMode, isDark }
}

/**
 * Returns true when the given language is RTL (Arabic).
 */
export function useIsRTL(lang: Lang): boolean {
  return lang === 'ar'
}
