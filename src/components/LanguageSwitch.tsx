import { useLanguage } from '../i18n/language.ts'
import { LANGUAGES, LANGUAGE_NAMES } from '../i18n/messages.ts'
import './LanguageSwitch.css'

const FLAGS = { en: '/flags/gb.svg', es: '/flags/es.svg' }

// A two-option slider: one button per language, and a thumb that slides behind the chosen one.
// Flags are SVG images because Windows shows flag emoji as two letters.
export function LanguageSwitch() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <div className="language-switch" data-language={language} role="group" aria-label={t.header.language}>
      <span className="language-switch__thumb" aria-hidden="true" />
      {LANGUAGES.map((option) => (
        <button
          key={option}
          type="button"
          className="language-switch__option"
          aria-pressed={language === option}
          onClick={() => setLanguage(option)}
          title={LANGUAGE_NAMES[option]}
          lang={option}
        >
          <img src={FLAGS[option]} alt="" width="22" height="15" />
          <span className="visually-hidden">{LANGUAGE_NAMES[option]}</span>
        </button>
      ))}
    </div>
  )
}
