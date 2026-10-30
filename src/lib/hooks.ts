import { useEffect, useState } from 'preact/hooks'

import { freshState, loadProgress, progress } from './store.ts'
import type { State } from './types.ts'

/** The state that server-rendered HTML shows. */
const SERVER_STATE: State = freshState()

export interface ProgressState {
  /** The fresh state until this component has mounted, then the stored progress. */
  state: State
  /** `true` once `state` is the stored progress. */
  ready: boolean
  /**
   * Spread on elements that show progress. Until `ready`, they are hidden for a returning player
   * (see `data-pending` in `global.css`).
   */
  pending: { 'data-pending'?: '' }
}

const READY_ATTRS = {}
const PENDING_ATTRS = { 'data-pending': '' } as const

/**
 * Returns the player progress for an island that renders on the server, and subscribes to it.
 *
 * Islands hydrate one after another, and the first one to mount loads the stored progress. Preact
 * hydration does not fix a DOM that differs from the first render, so every component renders the
 * fresh state (what the server rendered) until its own mount effect has run.
 */
export function useProgressState(): ProgressState {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    loadProgress()
    setMounted(true)
  }, [])
  // Read the signal on every render, so the component subscribes to it from the start.
  const live = progress.value
  return mounted
    ? { state: live, ready: true, pending: READY_ATTRS }
    : { state: SERVER_STATE, ready: false, pending: PENDING_ATTRS }
}

/**
 * Returns the stored player progress and subscribes to it. Only for `client:only` islands (the
 * lesson page), which have no server HTML to match. Islands that render on the server use
 * `useProgressState()`.
 */
export function useProgress(): State {
  useEffect(loadProgress, [])
  return progress.value
}
