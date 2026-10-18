import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { writeSetting } from '../storage.ts'
import { THEME_KEY, ThemeContext, initialTheme, type Theme } from './theme.ts'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  // The CSS variables follow data-theme, and the constellation background watches it to redraw.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      writeSetting(THEME_KEY, next)
      return next
    })
  }, [])

  const state = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return <ThemeContext value={state}>{children}</ThemeContext>
}
