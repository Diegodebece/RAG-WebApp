import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { fetchHealth, type Health } from '../api/health.ts'
import { HealthContext } from './health.ts'

// The API allows 30 health checks per minute per address and reuses its answer for 10 seconds, so the app
// checks once a minute while the tab is visible, and never twice within 10 seconds.
const POLL_INTERVAL = 60_000
const MIN_INTERVAL = 10_000

export function HealthProvider({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<Health | null>(null)
  const [checkedAt, setCheckedAt] = useState<number | null>(null)
  const [checking, setChecking] = useState(false)
  const lastStart = useRef(0)

  const run = useCallback(() => {
    if (Date.now() - lastStart.current < MIN_INTERVAL) {
      return
    }
    lastStart.current = Date.now()
    setChecking(true)
    void fetchHealth().then((result) => {
      setHealth(result)
      setCheckedAt(Date.now())
      setChecking(false)
    })
  }, [])

  useEffect(() => {
    const first = setTimeout(run, 0)
    const timer = setInterval(() => {
      if (!document.hidden) {
        run()
      }
    }, POLL_INTERVAL)
    // coming back to the tab after a while checks again
    const onVisible = () => {
      if (!document.hidden && Date.now() - lastStart.current >= POLL_INTERVAL) {
        run()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [run])

  const state = useMemo(() => ({ health, checkedAt, checking, check: run }), [health, checkedAt, checking, run])

  return <HealthContext value={state}>{children}</HealthContext>
}
