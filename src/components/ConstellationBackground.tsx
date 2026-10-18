import { useEffect, useRef, useState } from 'react'
import { startConstellations, type Constellations } from '../background/constellations.ts'
import { useLanguage } from '../i18n/language.ts'
import { PauseIcon, PlayIcon } from './icons.tsx'
import './ConstellationBackground.css'

// The animated sky behind every page, with a small button to pause it: moving content that starts on its
// own must be possible to stop (WCAG 2.2.2).
export function ConstellationBackground() {
  const { t } = useLanguage()
  const skyRef = useRef<HTMLCanvasElement>(null)
  const cruxRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Constellations | null>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!skyRef.current || !cruxRef.current) {
      return
    }
    const engine = startConstellations(skyRef.current, cruxRef.current)
    engineRef.current = engine
    return () => {
      engine.destroy()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    engineRef.current?.setPaused(paused)
  }, [paused])

  return (
    <>
      <div className="constellations" aria-hidden="true">
        <canvas ref={skyRef} />
        <canvas ref={cruxRef} />
      </div>
      <button
        type="button"
        className="icon-button constellations__toggle"
        onClick={() => setPaused((current) => !current)}
        aria-label={paused ? t.background.play : t.background.pause}
        title={paused ? t.background.play : t.background.pause}
      >
        {paused ? <PlayIcon /> : <PauseIcon />}
      </button>
    </>
  )
}
