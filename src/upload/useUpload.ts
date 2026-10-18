import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/client.ts'
import { uploadDocument } from '../api/documents.ts'
import { useAuth } from '../auth/auth.ts'
import { useDocuments } from '../documents/documents.ts'
import { useLanguage } from '../i18n/language.ts'
import { MAX_TEXT_LENGTH, cleanFilename, extractText, looksScanned, type Extracted } from './extract.ts'
import { followJob } from './followJob.ts'
import { uploadErrorMessage } from './uploadErrors.ts'

// Where an upload stands, from reading the file to its indexed document.
export type UploadPhase =
  | { name: 'idle' }
  | { name: 'reading'; page: number | null; pages: number | null }
  | { name: 'read'; extracted: Extracted; scanned: boolean }
  | { name: 'unreadable' }
  | { name: 'empty' }
  | { name: 'tooLong'; length: number }
  | { name: 'sending' }
  | { name: 'queued'; position: number | null }
  | { name: 'indexing'; done: number | null; total: number | null }
  | { name: 'ready' }
  | { name: 'indexFailed'; error: string | null }
  // the server refused it; the text is kept so it can be sent again
  | { name: 'rejected'; message: string; extracted: Extracted; scanned: boolean }

// phases during which another file cannot be chosen
export const BUSY_PHASES: UploadPhase['name'][] = ['reading', 'sending', 'queued', 'indexing']

const isApiStatus = (error: unknown, status: number) => error instanceof ApiError && error.fromApi && error.status === status

export function useUpload() {
  const { session, expire } = useAuth()
  const { refresh, select } = useDocuments()
  const { t } = useLanguage()
  const [file, setFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<UploadPhase>({ name: 'idle' })
  const work = useRef<AbortController | null>(null)

  // Leaving the page, or the session ending, stops reading the file and following the job.
  const token = session?.token ?? null
  useEffect(() => () => work.current?.abort(), [token])

  const read = useCallback(async (chosen: File) => {
    work.current?.abort()
    const controller = new AbortController()
    work.current = controller
    setFile(chosen)
    setPhase({ name: 'reading', page: null, pages: null })
    try {
      const extracted = await extractText(chosen, ({ page, pages }) => {
        if (!controller.signal.aborted) {
          setPhase({ name: 'reading', page, pages })
        }
      })
      if (controller.signal.aborted) {
        return
      }
      if (!extracted.text.trim()) {
        setPhase({ name: 'empty' })
      } else if (extracted.text.length > MAX_TEXT_LENGTH) {
        setPhase({ name: 'tooLong', length: extracted.text.length })
      } else {
        setPhase({ name: 'read', extracted, scanned: looksScanned(extracted) })
      }
    } catch {
      // damaged, password-protected or mislabeled
      if (!controller.signal.aborted) {
        setPhase({ name: 'unreadable' })
      }
    }
  }, [])

  const send = useCallback(async () => {
    if (!session || !file || (phase.name !== 'read' && phase.name !== 'rejected')) {
      return
    }
    const { extracted, scanned } = phase
    const controller = new AbortController()
    work.current = controller
    setPhase({ name: 'sending' })
    try {
      const { jobId } = await uploadDocument(session.token, cleanFilename(file.name), extracted.text)
      // the new document appears in "My documents" right away, still waiting
      void refresh()
      await followJob(
        session.token,
        jobId,
        (update) => {
          if (controller.signal.aborted) {
            return
          }
          switch (update.kind) {
            case 'queued':
              setPhase({ name: 'queued', position: update.position })
              break
            case 'indexing':
              setPhase((current) =>
                // a "started" without numbers keeps the progress already shown
                update.done === null && current.name === 'indexing' ? current : { name: 'indexing', done: update.done, total: update.total },
              )
              break
            case 'done':
              setPhase({ name: 'ready' })
              void refresh().then(() => select(update.documentId))
              break
            case 'failed':
              setPhase({ name: 'indexFailed', error: update.error })
              void refresh()
              break
          }
        },
        controller.signal,
      )
    } catch (error) {
      if (controller.signal.aborted) {
        return
      }
      if (isApiStatus(error, 401)) {
        expire()
      }
      setPhase({ name: 'rejected', message: uploadErrorMessage(error, t), extracted, scanned })
    }
  }, [session, file, phase, refresh, select, expire, t])

  return { file, phase, read, send }
}
