import { API_BASE } from './client.ts'

export type ServerStatus = 'ok' | 'degraded' | 'down'
export type PartStatus = 'up' | 'down'

export type Health = {
  // ok: everything works; degraded: the API answers but the models do not; down: nothing answers
  status: ServerStatus
  api: PartStatus
  database: PartStatus | null
  // the model server
  ollama: PartStatus | null
}

const OFFLINE: Health = { status: 'down', api: 'down', database: null, ollama: null }

const isServerStatus = (value: unknown): value is ServerStatus => value === 'ok' || value === 'degraded' || value === 'down'
const part = (value: unknown): PartStatus | null => (value === 'up' || value === 'down' ? value : null)

// Read with fetch directly rather than through request(): a degraded or down server may answer with an error
// status and still describe itself. No answer at all, or one that is not the API's (an error page from
// Cloudflare when the PC is off), means the server is offline.
export async function fetchHealth(): Promise<Health> {
  try {
    const response = await fetch(`${API_BASE}/health`)
    const payload: unknown = await response.json()
    // the fields may come at the top level or inside the usual data envelope
    const body = (payload as { data?: unknown })?.data ?? payload
    const { status, database, ollama } = (body ?? {}) as Record<string, unknown>
    if (!isServerStatus(status)) {
      return OFFLINE
    }
    return { status, api: 'up', database: part(database), ollama: part(ollama) }
  } catch {
    return OFFLINE
  }
}
