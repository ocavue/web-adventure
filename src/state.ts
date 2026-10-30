interface LessonRecord {
  stars: number
  at: number
}

interface SeenRecord {
  /** Correct answers. */
  c: number
  /** Wrong answers. */
  w: number
  /** The last wrong answer has not been fixed in Review yet. */
  miss?: boolean
}

export interface Settings {
  sound: boolean
  calm: boolean
  theme: 'system' | 'light' | 'dark'
}

interface Stats {
  answered: number
  correct: number
  bestCombo: number
  lessons: number
  reviewCleared: number
  hints: number
  time: number
}

export interface State {
  v: 1
  name: string
  onboarded: boolean
  xp: number
  goal: number
  streak: { count: number; best: number; last: string }
  daily: { date: string; xp: number }
  /** XP per day for the last 14 days. */
  week: Record<string, number>
  lessons: Record<string, LessonRecord>
  /** The highest level that a passed jump test opened, per module. */
  jumps: Record<string, number>
  seen: Record<string, SeenRecord>
  /** When each badge was earned. */
  badges: Record<string, number>
  stats: Stats
  /** First-try score of the daily challenge, per day. */
  challenges: Record<string, number>
  settings: Settings
  updatedAt: number
  freezes?: number
  usedFreeze?: string
  freezeEarned?: string
  dailySeen?: { date: string; ids: string[] }
  dayLessons?: { date: string; n: number }
}

const STORE_KEY = 'byte-trail:v1'

export function freshState(): State {
  return {
    v: 1,
    name: '',
    onboarded: false,
    xp: 0,
    goal: 80,
    streak: { count: 0, best: 0, last: '' },
    daily: { date: '', xp: 0 },
    week: {},
    lessons: {},
    jumps: {},
    seen: {},
    badges: {},
    stats: {
      answered: 0,
      correct: 0,
      bestCombo: 0,
      lessons: 0,
      reviewCleared: 0,
      hints: 0,
      time: 0,
    },
    challenges: {},
    settings: { sound: true, calm: false, theme: 'system' },
    updatedAt: 0,
  }
}

/** Fills in missing fields of a stored state with defaults. */
function mergeState(s: Partial<State>): State {
  const base = freshState()
  return {
    ...base,
    ...s,
    streak: { ...base.streak, ...s.streak },
    daily: { ...base.daily, ...s.daily },
    stats: { ...base.stats, ...s.stats },
    settings: { ...base.settings, ...s.settings },
  }
}

function maxMap<T extends Record<string, number>>(x: T, y: T): T {
  const o: Record<string, number> = { ...x }
  for (const [k, v] of Object.entries(y)) o[k] = Math.max(o[k] ?? 0, v ?? 0)
  return o as T
}

/** Field-by-field union of two progress states: nothing earned in one is lost. */
export function combineStates(a: State, b: State): State {
  const [older, newer] = a.updatedAt >= b.updatedAt ? [b, a] : [a, b]
  const out = mergeState({ ...older, ...newer })
  out.xp = Math.max(a.xp, b.xp)
  out.name = newer.name || older.name || ''
  out.onboarded = a.onboarded || b.onboarded
  out.lessons = { ...a.lessons }
  for (const [k, r] of Object.entries(b.lessons)) {
    const p = out.lessons[k]
    out.lessons[k] = p
      ? { stars: Math.max(p.stars, r.stars), at: Math.max(p.at ?? 0, r.at ?? 0) }
      : r
  }
  out.seen = { ...a.seen }
  for (const [k, r] of Object.entries(b.seen)) {
    const p = out.seen[k]
    out.seen[k] = !p ? r : r.c + r.w > p.c + p.w ? r : p
  }
  out.badges = { ...b.badges }
  for (const [k, t] of Object.entries(a.badges)) out.badges[k] = Math.min(out.badges[k] ?? t, t)
  out.jumps = maxMap(a.jumps, b.jumps)
  out.stats = maxMap({ ...a.stats }, { ...b.stats })
  out.week = maxMap(a.week, b.week)
  out.challenges = maxMap(a.challenges, b.challenges)
  out.streak = {
    ...(a.streak.last >= b.streak.last ? a.streak : b.streak),
    best: Math.max(a.streak.best, b.streak.best),
  }
  out.daily =
    a.daily.date === b.daily.date
      ? { date: a.daily.date, xp: Math.max(a.daily.xp, b.daily.xp) }
      : a.daily.date > b.daily.date
        ? a.daily
        : b.daily
  out.updatedAt = Math.max(a.updatedAt, b.updatedAt)
  return out
}

/** Reads a progress state from untrusted JSON. Returns `null` when it is not one. */
export function parseState(json: string): State | null {
  try {
    const data: unknown = JSON.parse(json)
    if (!data || typeof data !== 'object' || (data as { v?: unknown }).v !== 1) return null
    return mergeState(data)
  } catch {
    return null
  }
}

function loadLocal(): State {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return parseState(raw) ?? freshState()
  } catch {
    // Storage can be blocked, for example in some private windows.
  }
  return freshState()
}

export let state: State = loadLocal()

export function setState(next: State): void {
  state = next
}

export function save(): void {
  state.updatedAt = Date.now()
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state))
  } catch {
    // Progress then lives only in memory until the page closes.
  }
}
