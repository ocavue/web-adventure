import { batch, signal } from '@preact/signals'
import * as v from 'valibot'

import { StateSchema } from './schema.ts'
import type { State } from './types.ts'

export const STORE_KEY = 'byte-trail:v1'
/** Where a stored value that cannot be read is kept, so the next save does not lose it silently. */
export const CORRUPT_KEY = 'byte-trail:v1:corrupt'

export function freshState(): State {
  return v.parse(StateSchema, { v: 1 })
}

/** Reads a progress state from untrusted JSON. Returns `null` when it is not one. */
export function parseState(json: string): State | null {
  try {
    const result = v.safeParse(StateSchema, JSON.parse(json))
    return result.success ? result.output : null
  } catch {
    return null
  }
}

function maxMap(x: Record<string, number>, y: Record<string, number>): Record<string, number> {
  const o = { ...x }
  for (const [k, n] of Object.entries(y)) o[k] = Math.max(o[k] ?? 0, n)
  return o
}

/** Field-by-field union of two progress states: nothing earned in one is lost. */
export function combineStates(a: State, b: State): State {
  const [older, newer] = a.updatedAt >= b.updatedAt ? [b, a] : [a, b]
  const lessons = { ...a.lessons }
  for (const [k, r] of Object.entries(b.lessons)) {
    const p = lessons[k]
    lessons[k] = p ? { stars: Math.max(p.stars, r.stars), at: Math.max(p.at, r.at) } : r
  }
  const seen = { ...a.seen }
  for (const [k, r] of Object.entries(b.seen)) {
    const p = seen[k]
    seen[k] = !p || r.c + r.w > p.c + p.w ? r : p
  }
  const badges = { ...b.badges }
  for (const [k, t] of Object.entries(a.badges)) badges[k] = Math.min(badges[k] ?? t, t)
  return {
    ...older,
    ...newer,
    xp: Math.max(a.xp, b.xp),
    name: newer.name || older.name,
    onboarded: a.onboarded || b.onboarded,
    lessons,
    seen,
    badges,
    jumps: maxMap(a.jumps, b.jumps),
    stats: maxMap(a.stats, b.stats) as State['stats'],
    week: maxMap(a.week, b.week),
    challenges: maxMap(a.challenges, b.challenges),
    streak: {
      ...(a.streak.last >= b.streak.last ? a.streak : b.streak),
      best: Math.max(a.streak.best, b.streak.best),
    },
    daily:
      a.daily.date === b.daily.date
        ? { date: a.daily.date, xp: Math.max(a.daily.xp, b.daily.xp) }
        : a.daily.date > b.daily.date
          ? a.daily
          : b.daily,
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  }
}

/**
 * Player progress. It starts as a fresh state, so server-rendered HTML and the first client render match.
 * `loadProgress()` then swaps in the stored state.
 */
export const progress = signal<State>(freshState())

/** `true` once the stored progress is loaded in the browser. */
export const progressReady = signal(false)

function readLocal(): State {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return freshState()
    const state = parseState(raw)
    if (state) return state
    localStorage.setItem(CORRUPT_KEY, raw)
  } catch {
    // Storage can be blocked, for example in some private windows.
  }
  return freshState()
}

function writeLocal(state: State): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state))
  } catch {
    // Progress then lives only in memory until the page closes.
  }
}

/** Loads the stored progress once, and keeps it in sync with other tabs. Call it after hydration. */
export function loadProgress(): void {
  if (progressReady.peek()) return
  batch(() => {
    progress.value = readLocal()
    progressReady.value = true
  })
  addEventListener('storage', (e) => {
    if (e.key !== STORE_KEY || !e.newValue) return
    const next = parseState(e.newValue)
    if (next) progress.value = next
  })
  // A page restored from the back/forward cache keeps its old signal. Another page may have saved
  // newer progress since, and the next save here must not overwrite it.
  addEventListener('pageshow', (e) => {
    if (e.persisted) progress.value = readLocal()
  })
}

/** Applies `recipe` to a copy of the progress, then saves it. */
export function updateProgress(recipe: (draft: State) => void): void {
  const draft = structuredClone(progress.peek())
  recipe(draft)
  draft.updatedAt = Date.now()
  progress.value = draft
  writeLocal(draft)
}

/** Replaces the whole progress, for example after a reset or a restored backup. */
export function replaceProgress(next: State): void {
  next.updatedAt = Date.now()
  progress.value = next
  writeLocal(next)
}
