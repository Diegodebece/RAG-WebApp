import { createContext, useContext } from 'react'
import type { User } from '../api/auth.ts'
import { readSessionItem } from '../storage.ts'

export const SESSION_KEY = 'session'

// The token lasts one hour and cannot be renewed.
const TOKEN_LIFETIME = 60 * 60 * 1000

export type Session = {
  token: string
  user: User
  expiresAt: number
}

export type DialogMode = 'logIn' | 'signUp'

export type AuthDialogState = {
  mode: DialogMode
  // why the dialog opened on its own
  notice: 'expired' | null
}

export type AuthState = {
  session: Session | null
  dialog: AuthDialogState | null
  openDialog: (mode: DialogMode) => void
  closeDialog: () => void
  signIn: (token: string, user: User) => void
  logOut: () => void
  // ends the session because the API rejected the token (a 401), and asks to log in again
  expire: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const state = useContext(AuthContext)
  if (!state) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return state
}

// The token's own expiry (the JWT's exp claim), or one hour from now if it cannot be read.
export function tokenExpiry(token: string): number {
  try {
    const payload: unknown = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    const exp = (payload as { exp?: unknown }).exp
    if (typeof exp === 'number') {
      return exp * 1000
    }
  } catch {
    // not a readable JWT
  }
  return Date.now() + TOKEN_LIFETIME
}

// The session saved before a reload, unless it has expired since.
export function savedSession(): Session | null {
  try {
    const session = JSON.parse(readSessionItem(SESSION_KEY) ?? 'null') as Session | null
    return session && session.expiresAt > Date.now() ? session : null
  } catch {
    return null
  }
}
