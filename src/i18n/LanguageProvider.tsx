import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { writeSetting } from '../storage.ts'
import { LANGUAGE_KEY, LanguageContext, initialLanguage } from './language.ts'
import { MESSAGES, type Language } from './messages.ts'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage)

  // Screen readers and the browser's spell checking and translation read the page's language from here.
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const setLanguage = useCallback((next: Language) => {
    writeSetting(LANGUAGE_KEY, next)
    setLanguageState(next)
  }, [])

  const state = useMemo(() => ({ language, setLanguage, t: MESSAGES[language] }), [language, setLanguage])

  return <LanguageContext value={state}>{children}</LanguageContext>
}
