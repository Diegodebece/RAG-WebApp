import { createContext, useContext } from 'react'
import type { RagDocument } from '../api/documents.ts'

export type DocumentsState = {
  documents: RagDocument[]
  loading: boolean
  failed: boolean
  refresh: () => Promise<void>
  // deletes a document; throws the API's error so the confirmation can show it
  remove: (id: string) => Promise<void>
  // the document the user is asking about, or null for the home view
  selected: RagDocument | null
  select: (id: string | null) => void
}

export const DocumentsContext = createContext<DocumentsState | null>(null)

export function useDocuments(): DocumentsState {
  const state = useContext(DocumentsContext)
  if (!state) {
    throw new Error('useDocuments must be used inside DocumentsProvider')
  }
  return state
}
