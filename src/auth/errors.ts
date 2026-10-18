import { ApiError } from '../api/client.ts'
import type { Messages } from '../i18n/messages.ts'
import type { DialogMode } from './auth.ts'

// The API's messages are in English; the interface shows its own, chosen by status code and context.
export function authErrorMessage(error: unknown, mode: DialogMode, t: Messages): string {
  const errors = t.auth.errors
  if (!(error instanceof ApiError)) {
    return errors.unexpected
  }
  if (!error.fromApi) {
    return errors.unavailable
  }
  switch (error.status) {
    case 400:
      return errors.checkFields
    // the same answer for an unknown email, on purpose
    case 401:
      return errors.invalidCredentials
    case 409:
      return mode === 'signUp' ? errors.emailTaken : errors.unexpected
    case 429:
      return errors.tooMany
    case 503:
    case 504:
      return errors.unavailable
    default:
      return errors.unexpected
  }
}
