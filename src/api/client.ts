// In development Vite forwards /v1 to the API (vite.config.ts); the built site calls the API directly.
export const API_BASE = import.meta.env.DEV ? '/v1' : 'https://rag-api.diegodebrun.com/v1'

// An error answer. fromApi is false when the API itself did not answer: a network error, or an error page
// from Cloudflare when the author's PC is off. Those mean the server is unavailable, whatever the status.
export class ApiError extends Error {
  readonly status: number
  readonly details: string[]
  readonly fromApi: boolean

  constructor(status: number, message: string, details: string[], fromApi: boolean) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
    this.fromApi = fromApi
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  token?: string
  signal?: AbortSignal
}

const isErrorBody = (value: unknown): value is { message: string; details?: unknown } =>
  typeof value === 'object' && value !== null && typeof (value as { message?: unknown }).message === 'string'

export async function request<T>(path: string, { method = 'GET', body, token, signal }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (signal?.aborted) {
      throw error
    }
    throw new ApiError(0, 'The server could not be reached', [], false)
  }

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    if (isErrorBody(payload)) {
      const details = Array.isArray(payload.details) ? payload.details.filter((detail) => typeof detail === 'string') : []
      throw new ApiError(response.status, payload.message, details, true)
    }
    throw new ApiError(response.status, 'The server answered without the API', [], false)
  }
  if (payload === null) {
    throw new ApiError(response.status, 'The server answered without the API', [], false)
  }

  return payload as T
}
