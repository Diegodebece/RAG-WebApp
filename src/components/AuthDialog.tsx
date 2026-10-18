import { useEffect, useRef, useState, type FormEvent } from 'react'
import { logIn, register } from '../api/auth.ts'
import { useAuth, type DialogMode } from '../auth/auth.ts'
import { authErrorMessage } from '../auth/errors.ts'
import { useLanguage } from '../i18n/language.ts'
import { CloseIcon } from './icons.tsx'
import './AuthDialog.css'

const MODES: DialogMode[] = ['logIn', 'signUp']

// One modal for logging in and signing up, with a tab for each. It is a native <dialog>: the browser keeps
// the focus inside it, closes it with Escape and hides the rest of the page from screen readers.
export function AuthDialog() {
  const { dialog, closeDialog } = useAuth()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = ref.current
    if (dialog && element && !element.open) {
      element.showModal()
      // showModal focuses the first button (close); the email field is where the user starts
      element.querySelector('input')?.focus()
    }
    if (!dialog && element?.open) {
      element.close()
    }
  }, [dialog])

  return (
    <dialog
      ref={ref}
      className="auth-dialog"
      aria-labelledby="auth-title"
      onClose={closeDialog}
      // a click on the backdrop lands on the dialog itself, outside its content
      onClick={(event) => event.target === event.currentTarget && closeDialog()}
    >
      {dialog && <AuthForm mode={dialog.mode} expired={dialog.notice === 'expired'} />}
    </dialog>
  )
}

function AuthForm({ mode, expired }: { mode: DialogMode; expired: boolean }) {
  const { openDialog, closeDialog, signIn } = useAuth()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const signingUp = mode === 'signUp'

  const switchTo = (next: DialogMode) => {
    setError(null)
    openDialog(next)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim()) {
      setError(t.auth.errors.emailRequired)
      return
    }
    // The password is checked and sent as typed: spaces count and are not trimmed.
    if (password.length < 8 || password.length > 64) {
      setError(t.auth.errors.passwordLength)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const response = await (signingUp ? register : logIn)(email.trim(), password)
      signIn(response.token, response.data)
    } catch (caught) {
      setError(authErrorMessage(caught, mode, t))
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-dialog__body">
      <h2 id="auth-title" className="visually-hidden">
        {signingUp ? t.auth.signUpTitle : t.auth.logInTitle}
      </h2>
      <button type="button" className="icon-button auth-dialog__close" onClick={closeDialog} aria-label={t.auth.close} title={t.auth.close}>
        <CloseIcon />
      </button>

      <div className="auth-dialog__tabs" role="group" aria-label={t.auth.account}>
        {MODES.map((option) => (
          <button key={option} type="button" aria-pressed={mode === option} onClick={() => switchTo(option)}>
            {option === 'logIn' ? t.auth.logIn : t.auth.signUp}
          </button>
        ))}
      </div>

      {expired && !signingUp && <p className="auth-dialog__notice">{t.auth.expired}</p>}
      {signingUp && <p className="auth-dialog__notice">{t.auth.signUpNotice}</p>}

      <form className="auth-dialog__form" onSubmit={submit} noValidate>
        <label className="field">
          <span className="field__label">{t.auth.email}</span>
          <input
            className="field__input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {signingUp && <span className="field__hint">{t.auth.emailHint}</span>}
        </label>

        <label className="field">
          <span className="field__label">{t.auth.password}</span>
          <span className="field__password">
            <input
              className="field__input"
              type={showPassword ? 'text' : 'password'}
              autoComplete={signingUp ? 'new-password' : 'current-password'}
              maxLength={64}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button type="button" className="field__reveal" onClick={() => setShowPassword((shown) => !shown)} aria-pressed={showPassword}>
              {showPassword ? t.auth.hidePassword : t.auth.showPassword}
            </button>
          </span>
          {signingUp && <span className="field__hint">{t.auth.passwordHint}</span>}
        </label>

        <p className="auth-dialog__error" role="alert">
          {error}
        </p>

        <button type="submit" className="button button--primary auth-dialog__submit" disabled={submitting}>
          {submitting ? t.auth.submitting : signingUp ? t.auth.submitSignUp : t.auth.submitLogIn}
        </button>
      </form>
    </div>
  )
}
