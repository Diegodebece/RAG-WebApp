import { ApiError } from '../api/client.ts'
import type { Messages } from '../i18n/messages.ts'

// The API's messages are in English; the interface shows its own, chosen by status code and context.
export function uploadErrorMessage(error: unknown, t: Messages): string {
  const errors = t.upload.errors
  if (!(error instanceof ApiError)) {
    return errors.unexpected
  }
  if (!error.fromApi) {
    return errors.unavailable
  }
  switch (error.status) {
    case 400:
    case 413:
      return errors.rejected
    // 409 is either the 3-document limit or another document still being indexed
    case 409:
      return /index/i.test(error.message) ? errors.oneAtATime : errors.documentLimit
    // 429 is either the daily limit (3 uploads, deleted ones included) or too many requests in a minute
    case 429:
      return /day|daily/i.test(error.message) ? errors.dailyLimit : errors.tooFast
    case 503:
      return errors.queueFull
    default:
      return errors.unexpected
  }
}
