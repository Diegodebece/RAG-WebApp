import { useEffect, useRef, useState } from 'react'
import './ConfirmDialog.css'

type ConfirmDialogProps = {
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  busyLabel: string
  failedText: string
  // rejects when the action fails; the dialog then stays open and says so
  onConfirm: () => Promise<void>
  onClose: () => void
}

// A confirmation before an action that cannot be undone. It opens when it mounts; the parent unmounts it to
// close it. Cancel has the focus, so Enter never deletes by accident.
export function ConfirmDialog({ title, body, confirmLabel, cancelLabel, busyLabel, failedText, onConfirm, onClose }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    ref.current?.showModal()
    cancelRef.current?.focus()
  }, [])

  const confirm = async () => {
    setBusy(true)
    setFailed(false)
    try {
      await onConfirm()
      onClose()
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <dialog ref={ref} className="confirm-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-body" onClose={onClose}>
      <h2 id="confirm-title" className="confirm-dialog__title">
        {title}
      </h2>
      <p id="confirm-body" className="confirm-dialog__body">
        {body}
      </p>
      <p className="confirm-dialog__error" role="alert">
        {failed ? failedText : null}
      </p>
      <div className="confirm-dialog__actions">
        <button ref={cancelRef} type="button" className="button" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </button>
        <button type="button" className="button button--danger" onClick={confirm} disabled={busy}>
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
