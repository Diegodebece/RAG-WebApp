import { request } from './client.ts'

type Envelope<T> = {
  success: true
  message: string
  data: T
}

export type DocumentStatus = 'pending' | 'indexing' | 'ready' | 'failed'

// Named RagDocument so it never shadows the DOM's Document.
export type RagDocument = {
  id: string
  filename: string
  status: DocumentStatus
  chunkCount: number
  createdAt: string
  expiresAt: string
}

export type Source = {
  id: string
  chunkNumber: number
  text: string
  // a passage close to the question, with its similarity score, or the text around one
  retrieval: 'match' | 'neighbor'
  score?: number
}

export type Answer = {
  // insufficient_evidence: the model found no answer in the document; no_match: nothing in the document was
  // close to the question, and the model was not asked
  status: 'answered' | 'insufficient_evidence' | 'no_match'
  answer: string
  // the source ids that really exist; an invented [F9] may stay in a baseline answer's text
  citations: string[]
  sources: Source[]
  timings: { totalMs: number }
}

export type AnswerLanguage = 'en' | 'es'

export type Job = {
  id: string
  status: 'queued' | 'processing' | 'done' | 'failed'
  documentId: string
  // safe to show
  error: string | null
  // 1 means next in line; null once the job is not waiting
  queuePosition: number | null
  progress: { done: number; total: number } | null
}

const documentPath = (id: string) => `/documents/${encodeURIComponent(id)}`

// Answers 202 at once; the document is indexed afterwards by the job it returns.
export const uploadDocument = (token: string, filename: string, text: string) =>
  request<Envelope<{ document: RagDocument; jobId: string }>>('/documents', { method: 'POST', token, body: { filename, text } }).then(
    (response) => response.data,
  )

export const getJob = (token: string, id: string, signal?: AbortSignal) =>
  request<Envelope<Job>>(`/jobs/${encodeURIComponent(id)}`, { token, signal }).then((response) => response.data)

// The user's documents, newest first.
export const listDocuments = (token: string) =>
  request<Envelope<RagDocument[]>>('/documents', { token }).then((response) => response.data)

export const deleteDocument = (token: string, id: string) =>
  request<{ success: true; message: string }>(documentPath(id), { method: 'DELETE', token })

// The answer comes in the same response, usually within a second and at most in 60.
export const askDocument = (token: string, id: string, question: string, language: AnswerLanguage) =>
  request<Envelope<Answer>>(`${documentPath(id)}/ask`, { method: 'POST', token, body: { question, language } }).then(
    (response) => response.data,
  )
