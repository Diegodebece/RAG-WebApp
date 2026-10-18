import { useEffect, useId, useRef, useState } from 'react'
import type { RagDocument } from '../api/documents.ts'
import { useDocuments } from '../documents/documents.ts'
import { useLanguage } from '../i18n/language.ts'
import type { Language, Messages } from '../i18n/messages.ts'
import { ConfirmDialog } from './ConfirmDialog.tsx'
import { ChevronIcon, FolderIcon, TrashIcon } from './icons.tsx'
import './DocumentsMenu.css'

// "Deleted in 18 hours": documents disappear 24 hours after their upload.
function expiryText(expiresAt: string, language: Language, t: Messages): string {
  const minutes = Math.round((Date.parse(expiresAt) - Date.now()) / 60000)
  if (!(minutes > 0)) {
    return t.documents.deletingSoon
  }
  const relative = new Intl.RelativeTimeFormat(language, { numeric: 'always' })
  return t.documents.deletedIn(minutes < 60 ? relative.format(minutes, 'minute') : relative.format(Math.round(minutes / 60), 'hour'))
}

// The user's documents in a dropdown under the header: picking a ready one opens it for questions, and each
// one can be deleted after a confirmation. The list is read again every time the dropdown opens.
export function DocumentsMenu() {
  const { documents, loading, failed, refresh, remove, selected, select } = useDocuments()
  const { language, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState<RagDocument | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (open) {
      void refresh()
    }
  }, [open, refresh])

  // Closes on a click outside or on Escape, unless the delete confirmation (which handles its own) is open.
  useEffect(() => {
    if (!open || confirming) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, confirming])

  return (
    <div className="documents-menu" ref={rootRef}>
      <button
        type="button"
        className="button documents-menu__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <FolderIcon />
        <span className="documents-menu__label">{t.documents.menu}</span>
        <span className="documents-menu__count">{documents.length}</span>
        <ChevronIcon />
      </button>

      <div id={panelId} className="documents-menu__panel" hidden={!open}>
        {documents.length === 0 && (
          <p className="documents-menu__state">
            {loading ? t.documents.loading : failed ? t.documents.failed : t.documents.empty}
            {failed && !loading && (
              <button type="button" className="documents-menu__retry" onClick={() => void refresh()}>
                {t.documents.retry}
              </button>
            )}
          </p>
        )}

        {documents.length > 0 && (
          <ul className="documents-menu__list">
            {documents.map((doc) => (
              <li key={doc.id} className="documents-menu__item" data-selected={selected?.id === doc.id}>
                <button
                  type="button"
                  className="documents-menu__open"
                  disabled={doc.status !== 'ready'}
                  onClick={() => {
                    select(doc.id)
                    setOpen(false)
                  }}
                >
                  <span className="documents-menu__name">{doc.filename}</span>
                  <span className="documents-menu__meta">
                    <span className="documents-menu__status" data-status={doc.status}>
                      {t.documents.status[doc.status]}
                    </span>
                    {doc.status === 'ready' && <span>{t.documents.chunks(doc.chunkCount)}</span>}
                    <span>{expiryText(doc.expiresAt, language, t)}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="icon-button documents-menu__delete"
                  onClick={() => setConfirming(doc)}
                  aria-label={t.documents.delete(doc.filename)}
                  title={t.documents.delete(doc.filename)}
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirming && (
        <ConfirmDialog
          title={t.documents.confirmTitle(confirming.filename)}
          body={t.documents.confirmBody}
          confirmLabel={t.documents.confirm}
          cancelLabel={t.documents.cancel}
          busyLabel={t.documents.deleting}
          failedText={t.documents.deleteFailed}
          onConfirm={() => remove(confirming.id)}
          onClose={() => setConfirming(null)}
        />
      )}
    </div>
  )
}
