import { useLanguage } from '../i18n/language.ts'
import { useTheme } from '../theme/theme.ts'
import { MoonIcon, SunIcon } from './icons.tsx'

// Shows where the button takes you: the moon in light mode, the sun in dark mode.
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const label = theme === 'dark' ? t.header.toLight : t.header.toDark

  return (
    <button type="button" className="icon-button" onClick={toggleTheme} aria-label={label} title={label}>
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
