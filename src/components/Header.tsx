import { useAuth } from '../auth/auth.ts'
import { useLanguage } from '../i18n/language.ts'
import { AuthNav } from './AuthNav.tsx'
import { DocumentsMenu } from './DocumentsMenu.tsx'
import { HealthIndicator } from './HealthIndicator.tsx'
import { InfoTab } from './InfoTab.tsx'
import { LanguageSwitch } from './LanguageSwitch.tsx'
import { ThemeToggle } from './ThemeToggle.tsx'
import './Header.css'

export function Header() {
  const { t } = useLanguage()
  const { session } = useAuth()

  return (
    <header className="header">
      <div className="header__start">
        <a className="header__brand" href="/" aria-label={t.header.home}>
          RAG
        </a>
        <HealthIndicator />
      </div>
      <div className="header__controls">
        {session && <DocumentsMenu />}
        <AuthNav />
        <LanguageSwitch />
        <ThemeToggle />
      </div>
      <InfoTab />
    </header>
  )
}
