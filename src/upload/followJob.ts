import { ApiError } from '../api/client.ts'
import { getJob, type Job } from '../api/documents.ts'
import { streamEvents } from '../api/events.ts'

export type JobUpdate =
  | { kind: 'queued'; position: number | null }
  | { kind: 'indexing'; done: number | null; total: number | null }
  | { kind: 'done'; documentId: string }
  | { kind: 'failed'; error: string | null }

const POLL_INTERVAL = 2500
const STREAM_SAFETY_INTERVAL = 15_000

const fromJob = (job: Job): JobUpdate => {
  switch (job.status) {
    case 'queued':
      return { kind: 'queued', position: job.queuePosition }
    case 'processing':
      return { kind: 'indexing', done: job.progress?.done ?? null, total: job.progress?.total ?? null }
    case 'done':
      return { kind: 'done', documentId: job.documentId }
    default:
      return { kind: 'failed', error: job.error }
  }
}

const isFinal = (update: JobUpdate) => update.kind === 'done' || update.kind === 'failed'

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    })
  })

// Follows an indexing job until it is done or failed, reporting every change. The live event stream is the
// preferred source; the job itself is read first anyway, because the database is the source of truth and an
// event sent before the stream opened is lost. If the stream cannot be opened, or ends early, the job is read
// every 2.5 seconds instead. Throws the API's error (a 401 included) if the job cannot be read at all.
export async function followJob(token: string, jobId: string, onUpdate: (update: JobUpdate) => void, signal: AbortSignal): Promise<void> {
  const stream = new AbortController()
  const stopStream = () => stream.abort()
  signal.addEventListener('abort', stopStream)

  let finished = false
  let started = false
  const report = (update: JobUpdate) => {
    if (finished) {
      return
    }
    // two messages sent at almost the same moment can arrive out of order: a "queued" after "started" is stale
    if (update.kind === 'queued' && started) {
      return
    }
    if (update.kind === 'indexing') {
      started = true
    }
    finished = isFinal(update)
    onUpdate(update)
    if (finished) {
      stream.abort()
    }
  }

  const streaming = streamEvents(token, stream.signal, ({ event, data }) => {
    if (data.jobId !== jobId) {
      return
    }
    const number = (value: unknown) => (typeof value === 'number' ? value : null)
    switch (event) {
      case 'queued':
        report({ kind: 'queued', position: number(data.position) })
        break
      case 'started':
        report({ kind: 'indexing', done: null, total: null })
        break
      case 'progress':
        report({ kind: 'indexing', done: number(data.done), total: number(data.total) })
        break
      case 'done':
        report({ kind: 'done', documentId: String(data.documentId ?? '') })
        break
      case 'failed':
        report({ kind: 'failed', error: typeof data.error === 'string' ? data.error : null })
        break
    }
  }).catch((error: unknown) => {
    if (error instanceof ApiError && error.fromApi && error.status === 401) {
      throw error
    }
    // any other failure to open or keep the stream falls back to polling below
  })

  let streamOpen = true
  // the loop below awaits it; this only keeps a failure from being reported as unhandled meanwhile
  void streaming.catch(() => undefined).finally(() => {
    streamOpen = false
  })

  try {
    report(fromJob(await getJob(token, jobId, signal)))
    // While the stream is open the job is still read every 15 seconds, in case its last event was sent in the
    // moment before the stream connected; once the stream ends or fails, every 2.5 seconds.
    while (!finished && !signal.aborted) {
      await (streamOpen ? Promise.race([streaming, wait(STREAM_SAFETY_INTERVAL, signal)]) : wait(POLL_INTERVAL, signal))
      if (!finished && !signal.aborted) {
        report(fromJob(await getJob(token, jobId, signal)))
      }
    }
  } finally {
    signal.removeEventListener('abort', stopStream)
    stream.abort()
  }
}
