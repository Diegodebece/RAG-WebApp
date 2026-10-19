import { useEffect, useId, useRef, useState } from 'react'
import { useLanguage } from '../i18n/language.ts'
import { LINKS } from '../links.ts'
import { ChevronIcon, GitHubIcon } from './icons.tsx'
import './InfoTab.css'

// A mustard tab hanging from the bottom of the header. A click unfolds a panel over the page with what the
// project is, how it works and how it is built; the tab rides along the panel's bottom edge to fold it back.
export function InfoTab() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  // closes on Escape or on a click outside it
  useEffect(() => {
    if (!open) {
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
  }, [open])

  return (
    <div className="info" ref={rootRef} data-open={open}>
      <div id={panelId} className="info__panel" inert={!open}>
        <div className="info__content">
          <section>
            <h2>{t.info.whatTitle}</h2>
            {t.info.what.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <ul className="info__repos">
              <li>
                <a href={LINKS.frontendRepo} target="_blank" rel="noopener noreferrer">
                  <GitHubIcon />
                  {t.info.frontendRepo}
                </a>
              </li>
              <li>
                <a href={LINKS.apiRepo} target="_blank" rel="noopener noreferrer">
                  <GitHubIcon />
                  {t.info.apiRepo}
                </a>
              </li>
            </ul>
          </section>
          <section>
            <h2>{t.info.howTitle}</h2>
            <ol>
              {t.info.how.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
          <section>
            <h2>{t.info.techTitle}</h2>
            <dl className="info__stack">
              {t.info.stack.map(({ layer, items }) => (
                <div key={layer}>
                  <dt>{layer}</dt>
                  <dd>{items}</dd>
                </div>
              ))}
            </dl>
            <h2>{t.info.devTitle}</h2>
            {t.info.dev.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        </div>
      </div>
      <button type="button" className="info__tab" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((current) => !current)}>
        {t.info.tab}
        <ChevronIcon />
      </button>
    </div>
  )
}
