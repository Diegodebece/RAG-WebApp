import { createContext, useContext } from 'react'

export type Theme = 'light' | 'dark'

export const THEME_KEY = 'theme'

export type ThemeState = {
  theme: Theme
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeState | null>(null)

export function useTheme(): ThemeState {
  const state = useContext(ThemeContext)
  if (!state) {
    throw new Error('useTheme must be used inside ThemeProvider')
  }
  return state
}

// index.html applies the saved or system theme before the first paint; the app starts from that choice.
export function initialTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}
