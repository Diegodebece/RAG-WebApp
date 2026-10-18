import { API_BASE, ApiError } from './client.ts'

export type ServerEvent = {
  event: string
  data: Record<string, unknown>
}

// The user's live events as Server-Sent Events. The browser's EventSource cannot send the Authorization header,
// so the stream is read with fetch and parsed here: an "event:" line, a "data:" line with JSON and a blank line
// per message; lines starting with ":" are comments (": connected", ": heartbeat"). Resolves when the server ends
// the stream (for example when the token expires) and rejects if it cannot be opened.
export async function streamEvents(token: string, signal: AbortSignal, onEvent: (event: ServerEvent) => void): Promise<void> {
  const response = await fetch(`${API_BASE}/events`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
    signal,
  })
  if (!response.ok || !response.body) {
    const fromApi = response.headers.get('content-type')?.includes('json') ?? false
    throw new ApiError(response.status, 'The event stream could not be opened', [], fromApi)
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  let event = 'message'
  let data: string[] = []

  const dispatch = () => {
    if (event !== 'message' || data.length > 0) {
      let parsed: unknown = {}
      try {
        parsed = data.length > 0 ? JSON.parse(data.join('\n')) : {}
      } catch {
        // not JSON: keep an empty payload rather than dropping the event
      }
      onEvent({ event, data: typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {} })
    }
    event = 'message'
    data = []
  }

  for (;;) {
    const { value, done } = await reader.read()
    if (done) {
      return
    }
    buffer += value
    let end = buffer.search(/\r?\n/)
    while (end >= 0) {
      const line = buffer.slice(0, end)
      buffer = buffer.slice(end + (buffer[end] === '\r' ? 2 : 1))
      if (line === '') {
        dispatch()
      } else if (!line.startsWith(':')) {
        const colon = line.indexOf(':')
        const field = colon < 0 ? line : line.slice(0, colon)
        const content = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '')
        if (field === 'event') {
          event = content
        } else if (field === 'data') {
          data.push(content)
        }
      }
      end = buffer.search(/\r?\n/)
    }
  }
}
