import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Lang } from './i18n'

interface LocaleContextValue {
  lang: Lang
  setLang: (lang: Lang) => Promise<void>
}

const LocaleContext = createContext<LocaleContextValue>({ lang: 'en', setLang: async () => {} })

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    AsyncStorage.getItem('@vwelfare_lang').then(val => {
      if (val === 'ar' || val === 'en') setLangState(val)
    })
  }, [])

  async function setLang(newLang: Lang) {
    setLangState(newLang)
    await AsyncStorage.setItem('@vwelfare_lang', newLang)
  }

  return (
    <LocaleContext.Provider value={{ lang, setLang }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useAppLocale() {
  return useContext(LocaleContext)
}
