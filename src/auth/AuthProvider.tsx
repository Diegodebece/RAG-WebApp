import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '../api/auth.ts'
import { writeSessionItem } from '../storage.ts'
import { AuthContext, SESSION_KEY, savedSession, tokenExpiry, type AuthDialogState, type DialogMode, type Session } from './auth.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(savedSession)
  const [dialog, setDialog] = useState<AuthDialogState | null>(null)

  const saveSession = useCallback((next: Session | null) => {
    writeSessionItem(SESSION_KEY, next && JSON.stringify(next))
    setSession(next)
  }, [])

  // When the token expires, or the API rejects it, the session ends and the login dialog opens over
  // whatever the user was doing, which stays on screen behind it.
  const expire = useCallback(() => {
    saveSession(null)
    setDialog({ mode: 'logIn', notice: 'expired' })
  }, [saveSession])

  useEffect(() => {
    if (!session) {
      return
    }
    const timer = setTimeout(expire, session.expiresAt - Date.now())
    return () => clearTimeout(timer)
  }, [session, expire])

  const openDialog = useCallback((mode: DialogMode) => setDialog({ mode, notice: null }), [])
  const closeDialog = useCallback(() => setDialog(null), [])

  const signIn = useCallback(
    (token: string, user: User) => {
      saveSession({ token, user, expiresAt: tokenExpiry(token) })
      setDialog(null)
    },
    [saveSession],
  )

  // The token is stateless: logging out only forgets it.
  const logOut = useCallback(() => saveSession(null), [saveSession])

  const state = useMemo(
    () => ({ session, dialog, openDialog, closeDialog, signIn, logOut, expire }),
    [session, dialog, openDialog, closeDialog, signIn, logOut, expire],
  )

  return <AuthContext value={state}>{children}</AuthContext>
}
