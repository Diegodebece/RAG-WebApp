import { request } from './client.ts'

export type User = {
  id: string
  email: string
  role: string
  createdAt: string
}

// Login and register answer the same way, with the token next to data.
type AuthResponse = {
  success: true
  message: string
  data: User
  token: string
}

// The API trims and lowercases the email itself; the password is sent exactly as typed, spaces included.
export const logIn = (email: string, password: string) =>
  request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } })

export const register = (email: string, password: string) =>
  request<AuthResponse>('/auth/register', { method: 'POST', body: { email, password } })
