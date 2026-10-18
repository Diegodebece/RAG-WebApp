import { createContext, useContext } from 'react'
import type { Health } from '../api/health.ts'

export type HealthState = {
  // null until the first answer arrives
  health: Health | null
  checkedAt: number | null
  checking: boolean
  check: () => void
}

export const HealthContext = createContext<HealthState | null>(null)

export function useHealth(): HealthState {
  const state = useContext(HealthContext)
  if (!state) {
    throw new Error('useHealth must be used inside HealthProvider')
  }
  return state
}
