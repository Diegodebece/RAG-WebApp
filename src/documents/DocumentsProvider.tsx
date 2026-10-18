import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError } from '../api/client.ts'
import { deleteDocument, listDocuments, type RagDocument } from '../api/documents.ts'
import { useAuth } from '../auth/auth.ts'
import { DocumentsContext } from './documents.ts'

const isStatus = (error: unknown, status: number) => error instanceof ApiError && error.fromApi && error.status === status

// The list and the selection remember the session (token) they belong to, so after a logout or another
// user's login nothing of the previous session is shown, without having to clear anything.
type Owned<T> = { token: string; value: T }

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const { session, expire } = useAuth()
  const token = session?.token ?? null
  const [list, setList] = useState<Owned<RagDocument[]> | null>(null)
  const [selection, setSelection] = useState<Owned<string> | null>(null)
  // the session whose last attempt to load the list failed
  const [failedToken, setFailedToken] = useState<string | null>(null)

  const documents = useMemo(() => (list && list.token === token ? list.value : []), [list, token])
  const selectedId = selection && selection.token === token ? selection.value : null
  const failed = token !== null && failedToken === token
  // Only the first load of a session shows as loading; later refreshes keep the current list on screen.
  const loading = token !== null && list?.token !== token && !failed

  // Loads the session's list; the result is dropped if the session changed in the meantime.
  const load = useCallback(
    (owner: string, isCurrent: () => boolean) =>
      listDocuments(owner).then(
        (value) => {
          if (isCurrent()) {
            setList({ token: owner, value })
            setFailedToken(null)
          }
        },
        (error: unknown) => {
          if (!isCurrent()) {
            return
          }
          if (isStatus(error, 401)) {
            expire()
          }
          setFailedToken(owner)
        },
      ),
    [expire],
  )

  // each new session loads its documents
  useEffect(() => {
    if (!token) {
      return
    }
    let current = true
    void load(token, () => current)
    return () => {
      current = false
    }
  }, [token, load])

  const refresh = useCallback(async () => {
    if (token) {
      await load(token, () => true)
    }
  }, [token, load])

  const remove = useCallback(
    async (id: string) => {
      if (!token) {
        return
      }
      try {
        await deleteDocument(token, id)
      } catch (error) {
        if (isStatus(error, 401)) {
          expire()
        }
        // 404: it was already gone (deleted elsewhere or expired), which is what the user wanted
        if (!isStatus(error, 404)) {
          throw error
        }
      }
      setList((current) => current && { ...current, value: current.value.filter((document) => document.id !== id) })
      setSelection((current) => (current?.value === id ? null : current))
    },
    [token, expire],
  )

  const select = useCallback((id: string | null) => setSelection(id && token ? { token, value: id } : null), [token])

  const selected = documents.find((document) => document.id === selectedId) ?? null

  const state = useMemo(
    () => ({ documents, loading, failed, refresh, remove, selected, select }),
    [documents, loading, failed, refresh, remove, selected, select],
  )

  return <DocumentsContext value={state}>{children}</DocumentsContext>
}
