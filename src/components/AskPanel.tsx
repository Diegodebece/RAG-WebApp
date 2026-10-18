import { Fragment, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ApiError } from '../api/client.ts'
import { askDocument, type Answer, type RagDocument, type Source } from '../api/documents.ts'
import { useAuth } from '../auth/auth.ts'
import { askErrorMessage } from '../documents/askErrors.ts'
import { useDocuments } from '../documents/documents.ts'
import { useLanguage } from '../i18n/language.ts'
import { CloseIcon } from './icons.tsx'
import './AskPanel.css'

const MAX_QUESTION = 1000
const CITATION = /(\[F\d+\])/

type Asked = { question: string; answer: Answer }

// Asking about one document: the question box, and under it the answer with its sources. Everything the
// server returns is rendered as text, never as HTML: documents can contain anything, markup included.
export function AskPanel({ doc }: { doc: RagDocument }) {
  const { session, expire } = useAuth()
  const { select, refresh } = useDocuments()
  const { language, t } = useLanguage()
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [asked, setAsked] = useState<Asked | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [highlighted, setHighlighted] = useState<string | null>(null)

  const submit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    const text = question.trim()
    if (!session || asking) {
      return
    }
    if (!text || text.length > MAX_QUESTION) {
      setError(t.ask.errors.length)
      return
    }
    setAsking(true)
    setError(null)
    try {
      // the answer comes in the interface's language
      const answer = await askDocument(session.token, doc.id, text, language)
      setAsked({ question: text, answer })
      setHighlighted(null)
      setQuestion('')
    } catch (caught) {
      if (caught instanceof ApiError && caught.fromApi && caught.status === 401) {
        expire()
      }
      if (caught instanceof ApiError && caught.fromApi && caught.status === 404) {
        void refresh()
      }
      setError(askErrorMessage(caught, t))
    } finally {
      setAsking(false)
    }
  }

  // Enter sends the question; Shift+Enter starts a new line.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void submit()
    }
  }

  const showSource = (id: string) => {
    setHighlighted(id)
    document.getElementById(`source-${id}`)?.scrollIntoView({ block: 'nearest' })
  }

  return (
    <section className="ask" aria-labelledby="ask-title">
      <div className="ask__header">
        <h2 id="ask-title" className="ask__title" title={doc.filename}>
          {doc.filename}
        </h2>
        <button type="button" className="icon-button ask__close" onClick={() => select(null)} aria-label={t.ask.close} title={t.ask.close}>
          <CloseIcon />
        </button>
      </div>

      <form className="ask__form" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="ask-question">
          {t.ask.label}
        </label>
        <textarea
          id="ask-question"
          className="ask__question field__input"
          rows={3}
          maxLength={MAX_QUESTION}
          placeholder={t.ask.placeholder}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="ask__actions">
          <span className="ask__count" aria-hidden="true">
            {question.length}/{MAX_QUESTION}
          </span>
          <button type="submit" className="button button--primary" disabled={asking}>
            {asking ? t.ask.thinking : t.ask.submit}
          </button>
        </div>
      </form>

      <p className="ask__error" role="alert">
        {error}
      </p>

      <div className="ask__result" aria-live="polite" aria-busy={asking}>
        {asked && <AnswerView asked={asked} highlighted={highlighted} onCite={showSource} />}
      </div>
    </section>
  )
}

function AnswerView({ asked, highlighted, onCite }: { asked: Asked; highlighted: string | null; onCite: (id: string) => void }) {
  const { language, t } = useLanguage()
  const { answer } = asked
  const seconds = (answer.timings.totalMs / 1000).toLocaleString(language, { maximumFractionDigits: 1 })

  return (
    <>
      <p className="ask__asked">
        <span className="ask__caption">{t.ask.you}</span>
        {asked.question}
      </p>

      <div className="ask__answer">
        <span className="ask__caption">{t.ask.answerTitle}</span>
        {answer.status === 'answered' ? (
          <AnswerText text={answer.answer} citations={answer.citations} onCite={onCite} />
        ) : (
          // the API's fixed sentence is in English; the interface says it in its own language
          <p className="ask__empty">{answer.status === 'no_match' ? t.ask.noMatch : t.ask.insufficient}</p>
        )}
        <span className="ask__timing">{t.ask.answeredIn(seconds)}</span>
      </div>

      {answer.sources.length > 0 && (
        <div className="ask__sources">
          <h3 className="ask__caption">{t.ask.sources}</h3>
          <ol>
            {answer.sources.map((source) => (
              <SourceItem key={source.id} source={source} highlighted={source.id === highlighted} />
            ))}
          </ol>
        </div>
      )}
    </>
  )
}

// The answer's text, with each [F1] that names a real source turned into a button that shows the passage.
// An id the model invented stays as plain text.
function AnswerText({ text, citations, onCite }: { text: string; citations: string[]; onCite: (id: string) => void }) {
  return (
    <p className="ask__text">
      {text.split(CITATION).map((part, index) => {
        const id = part.slice(1, -1)
        if (CITATION.test(part) && citations.includes(id)) {
          return (
            <button key={index} type="button" className="ask__citation" onClick={() => onCite(id)}>
              {id}
            </button>
          )
        }
        return <Fragment key={index}>{part}</Fragment>
      })}
    </p>
  )
}

function SourceItem({ source, highlighted }: { source: Source; highlighted: boolean }) {
  const { language, t } = useLanguage()
  const kind =
    source.retrieval === 'match' && source.score !== undefined
      ? t.ask.similarity(source.score.toLocaleString(language, { maximumFractionDigits: 2 }))
      : t.ask.context

  return (
    <li id={`source-${source.id}`} className="ask__source" data-highlighted={highlighted} data-retrieval={source.retrieval}>
      <span className="ask__source-meta">
        <strong>{source.id}</strong> · {t.ask.passage(source.chunkNumber)} · {kind}
      </span>
      <p>{source.text}</p>
    </li>
  )
}
