import { useAuth } from '../auth/auth.ts'
import { useLanguage } from '../i18n/language.ts'
import { LogOutIcon } from './icons.tsx'
import './AuthNav.css'

// Log in and sign up while logged out; the account's email and log out while logged in.
export function AuthNav() {
  const { session, openDialog, logOut } = useAuth()
  const { t } = useLanguage()

  if (session) {
    return (
      <div className="auth-nav">
        <span className="auth-nav__email" title={session.user.email}>
          <span className="visually-hidden">{t.auth.signedInAs} </span>
          {session.user.email}
        </span>
        <button type="button" className="button auth-nav__log-out" onClick={logOut} title={t.auth.logOut}>
          <LogOutIcon />
          <span className="auth-nav__log-out-label">{t.auth.logOut}</span>
        </button>
      </div>
    )
  }

  return (
    <nav className="auth-nav" aria-label={t.auth.account}>
      <button type="button" className="button" onClick={() => openDialog('logIn')}>
        {t.auth.logIn}
      </button>
      <button type="button" className="button button--primary auth-nav__sign-up" onClick={() => openDialog('signUp')}>
        {t.auth.signUp}
      </button>
    </nav>
  )
}
