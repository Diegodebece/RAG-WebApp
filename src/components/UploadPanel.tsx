import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useAuth } from '../auth/auth.ts'
import { useLanguage } from '../i18n/language.ts'
import type { Language, Messages } from '../i18n/messages.ts'
import { BUSY_PHASES, useUpload, type UploadPhase } from '../upload/useUpload.ts'
import { ConfirmDialog } from './ConfirmDialog.tsx'
import { FileUploadIcon } from './icons.tsx'
import './UploadPanel.css'

// Extensions rather than MIME types: Windows often reports .txt and .docx with an empty or generic type.
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt']
const ACCEPT = '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'

const isAccepted = (file: File) => ACCEPTED_EXTENSIONS.some((extension) => file.name.toLowerCase().endsWith(extension))

function formatSize(bytes: number, locale: string): string {
  const format = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 1 })
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${format(bytes / 1024)} KB`
  }
  return `${format(bytes / (1024 * 1024))} MB`
}

// The guidelines, the drop zone, and under it where the upload stands: reading the file, checking it, sending
// it and following its indexing. The zone is one big button, so it also works by click and keyboard.
export function UploadPanel() {
  const { language, t } = useLanguage()
  const { session, openDialog } = useAuth()
  const { file, phase, read, send } = useUpload()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmingScan, setConfirmingScan] = useState(false)
  const busy = BUSY_PHASES.includes(phase.name)

  // A file dropped outside the zone would make the browser open it and leave the app.
  useEffect(() => {
    const preventOpening = (event: globalThis.DragEvent) => event.preventDefault()
    addEventListener('dragover', preventOpening)
    addEventListener('drop', preventOpening)
    return () => {
      removeEventListener('dragover', preventOpening)
      removeEventListener('drop', preventOpening)
    }
  }, [])

  const choose = (files: FileList | null) => {
    const first = files?.[0]
    if (!first || busy) {
      return
    }
    if (!isAccepted(first)) {
      setNotice(t.upload.wrongType)
      return
    }
    setNotice(files.length > 1 ? t.upload.oneFile : null)
    void read(first)
  }

  // Uploading needs a session: without one, the login dialog opens and the file stays chosen.
  const upload = () => {
    if (!session) {
      openDialog('logIn')
    } else if ((phase.name === 'read' || phase.name === 'rejected') && phase.scanned) {
      setConfirmingScan(true)
    } else {
      void send()
    }
  }

  const onDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = busy ? 'none' : 'copy'
    setDragging(!busy)
  }

  // dragleave also fires when the pointer moves onto a child, so only leaving the zone itself counts
  const onDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDragging(false)
    }
  }

  const onDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setDragging(false)
    choose(event.dataTransfer.files)
  }

  return (
    <section className="upload" aria-labelledby="upload-title">
      <h2 id="upload-title" className="upload__title">
        {t.upload.guidelinesTitle}
      </h2>
      <ul className="upload__guidelines">
        {t.upload.guidelines.map((guideline) => (
          <li key={guideline}>{guideline}</li>
        ))}
      </ul>

      <button
        type="button"
        className="upload__zone"
        data-dragging={dragging}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <span className="upload__icon">
          <FileUploadIcon />
        </span>
        {file ? (
          <>
            <span className="upload__primary">{file.name}</span>
            <span className="upload__secondary">
              {formatSize(file.size, language)}
              {!busy && ` · ${t.upload.change}`}
            </span>
          </>
        ) : (
          <>
            <span className="upload__primary">{dragging ? t.upload.dropping : t.upload.drop}</span>
            <span className="upload__secondary">{t.upload.choose}</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(event) => {
          choose(event.currentTarget.files)
          // lets the same file be chosen again after a change
          event.currentTarget.value = ''
        }}
      />

      <div className="upload__status" role="status">
        {notice && <p className="upload__notice">{notice}</p>}
        <PhaseView phase={phase} language={language} t={t} loggedIn={session !== null} onUpload={upload} />
      </div>

      {confirmingScan && (
        <ConfirmDialog
          title={t.upload.scannedTitle}
          body={phase.name === 'read' || phase.name === 'rejected' ? t.upload.scannedBody(phase.extracted.text.trim().length, phase.extracted.pages ?? 0) : ''}
          confirmLabel={t.upload.uploadAnyway}
          cancelLabel={t.documents.cancel}
          busyLabel={t.upload.sending}
          failedText={t.upload.errors.unexpected}
          onConfirm={async () => {
            setConfirmingScan(false)
            await send()
          }}
          onClose={() => setConfirmingScan(false)}
        />
      )}
    </section>
  )
}

type PhaseViewProps = {
  phase: UploadPhase
  language: Language
  t: Messages
  loggedIn: boolean
  onUpload: () => void
}

function PhaseView({ phase, language, t, loggedIn, onUpload }: PhaseViewProps) {
  const number = (value: number) => value.toLocaleString(language)
  const u = t.upload

  switch (phase.name) {
    case 'idle':
      return null
    case 'reading':
      return (
        <Progress
          label={phase.page && phase.pages ? u.readingPage(phase.page, phase.pages) : u.reading}
          value={phase.page && phase.pages ? phase.page / phase.pages : null}
        />
      )
    case 'read':
    case 'rejected':
      return (
        <>
          <p className="upload__summary">
            {[phase.extracted.pages !== null && u.pages(phase.extracted.pages), u.characters(number(phase.extracted.text.length))]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {phase.scanned && <p className="upload__notice">{u.scannedHint}</p>}
          {phase.name === 'rejected' && <p className="upload__notice">{phase.message}</p>}
          <button type="button" className="button button--primary upload__send" onClick={onUpload}>
            {!loggedIn ? u.logInToUpload : phase.name === 'rejected' ? u.retry : u.upload}
          </button>
        </>
      )
    case 'unreadable':
      return <p className="upload__notice">{u.unreadable}</p>
    case 'empty':
      return <p className="upload__notice">{u.empty}</p>
    case 'tooLong':
      return <p className="upload__notice">{u.tooLong(number(phase.length))}</p>
    case 'sending':
      return <Progress label={u.sending} value={null} />
    case 'queued':
      return <Progress label={phase.position ? u.queued(phase.position) : u.waiting} value={null} />
    case 'indexing':
      return (
        <Progress
          label={phase.done !== null && phase.total ? u.indexing(phase.done, phase.total) : u.indexingStarted}
          value={phase.done !== null && phase.total ? phase.done / phase.total : null}
        />
      )
    case 'ready':
      return <p className="upload__done">{u.ready}</p>
    case 'indexFailed':
      return <p className="upload__notice">{phase.error ? u.indexFailedBecause(phase.error) : u.indexFailed}</p>
  }
}

// A label with a bar under it: filled to the value, or moving back and forth when the value is unknown.
function Progress({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="upload__progress">
      <span>{label}</span>
      <span className="upload__bar" data-indeterminate={value === null} aria-hidden="true">
        <span style={value === null ? undefined : { width: `${Math.round(value * 100)}%` }} />
      </span>
    </div>
  )
}
