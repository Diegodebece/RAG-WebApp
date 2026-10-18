import { createContext, useContext } from 'react'
import { readSetting } from '../storage.ts'
import { LANGUAGES, type Language, type Messages } from './messages.ts'

export const LANGUAGE_KEY = 'language'

export type LanguageState = {
  language: Language
  setLanguage: (language: Language) => void
  t: Messages
}

export const LanguageContext = createContext<LanguageState | null>(null)

export function useLanguage(): LanguageState {
  const state = useContext(LanguageContext)
  if (!state) {
    throw new Error('useLanguage must be used inside LanguageProvider')
  }
  return state
}

// English unless the user picked Spanish before.
export function initialLanguage(): Language {
  const saved = readSetting(LANGUAGE_KEY)
  return LANGUAGES.find((language) => language === saved) ?? 'en'
}
