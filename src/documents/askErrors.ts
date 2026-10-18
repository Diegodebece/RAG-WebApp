import { ApiError } from '../api/client.ts'
import type { Messages } from '../i18n/messages.ts'

// The API's messages are in English; the interface shows its own, chosen by status code and context.
export function askErrorMessage(error: unknown, t: Messages): string {
  const errors = t.ask.errors
  if (!(error instanceof ApiError)) {
    return errors.unexpected
  }
  if (!error.fromApi) {
    return errors.unavailable
  }
  switch (error.status) {
    case 400:
      return errors.length
    case 404:
      return errors.gone
    // 409 is either a document still being indexed or a question already waiting; only the message tells
    case 409:
      return /waiting/i.test(error.message) ? errors.waiting : errors.notReady
    case 429:
      return errors.tooMany
    // "busy" or "the model server is not available": both mean trying again later
    case 503:
      return /busy/i.test(error.message) ? errors.busy : errors.unavailable
    case 504:
      return errors.timeout
    default:
      return errors.unexpected
  }
}
