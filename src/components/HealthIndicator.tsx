import { useEffect, useRef, useState } from 'react'
import type { PartStatus } from '../api/health.ts'
import { useHealth } from '../health/health.ts'
import { useLanguage } from '../i18n/language.ts'
import { CloseIcon } from './icons.tsx'
import './HealthIndicator.css'

// A dot and a word next to the brand saying whether the server is up. A click opens a dialog with each part's
// state; how the project works is in the info tab under the header.
export function HealthIndicator() {
  const { health, checking } = useHealth()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const state = health?.status ?? 'checking'

  return (
    <>
      <button
        type="button"
        className="health"
        data-state={state}
        onClick={() => setOpen(true)}
        aria-label={`${t.health.title}: ${t.health.states[state]}`}
        title={t.health.title}
      >
        <span className="health__dot" data-pulsing={checking} aria-hidden="true" />
        <span className="health__label">{t.health.states[state]}</span>
      </button>
      {open && <HealthDialog onClose={() => setOpen(false)} />}
    </>
  )
}

function HealthDialog({ onClose }: { onClose: () => void }) {
  const { health, checkedAt, checking, check } = useHealth()
  const { language, t } = useLanguage()
  const ref = useRef<HTMLDialogElement>(null)
  const state = health?.status ?? 'checking'

  // Opening the dialog is a good moment for a fresh answer (the provider skips it if one is under 10 s old).
  useEffect(() => {
    ref.current?.showModal()
    check()
  }, [check])

  const parts: { name: string; status: PartStatus | null }[] = [
    { name: t.health.parts.api, status: health?.api ?? null },
    { name: t.health.parts.database, status: health?.database ?? null },
    { name: t.health.parts.models, status: health?.ollama ?? null },
  ]

  return (
    <dialog
      ref={ref}
      className="health-dialog"
      aria-labelledby="health-title"
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="health-dialog__body">
        <button type="button" className="icon-button health-dialog__close" onClick={onClose} aria-label={t.auth.close} title={t.auth.close}>
          <CloseIcon />
        </button>
        <h2 id="health-title" className="health-dialog__title">
          {t.health.title}
        </h2>

        <div className="health-dialog__status" data-state={state}>
          <span className="health__dot" data-pulsing={checking} aria-hidden="true" />
          <div>
            <strong>{t.health.states[state]}</strong>
            <p>{t.health.explanations[state]}</p>
          </div>
        </div>

        <ul className="health-dialog__parts">
          {parts.map(({ name, status }) => (
            <li key={name} data-state={status ?? 'unknown'}>
              <span>{name}</span>
              <span>{status ? t.health.part[status] : t.health.part.unknown}</span>
            </li>
          ))}
        </ul>

        <div className="health-dialog__check">
          <span>{checkedAt ? t.health.checkedAt(new Date(checkedAt).toLocaleTimeString(language)) : t.health.states.checking}</span>
          <button type="button" className="button" onClick={check} disabled={checking}>
            {checking ? t.health.states.checking : t.health.checkAgain}
          </button>
        </div>
      </div>
    </dialog>
  )
}
