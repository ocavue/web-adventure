import { useEffect } from 'preact/hooks'

import { loadProgress, progress } from './store.ts'
import type { State } from './types.ts'

/**
 * Returns the player progress and subscribes to it. The first render uses a fresh state to match the
 * server-rendered HTML, then the stored progress loads.
 */
export function useProgress(): State {
  useEffect(loadProgress, [])
  return progress.value
}
