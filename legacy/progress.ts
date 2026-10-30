import { qById } from './bank.ts'
import { LESSONS_PER_LEVEL, LEVELS, MODULES, RANKS } from './constants.ts'
import { state } from './state.ts'
import type { ModuleId } from './types.ts'
import { dayDiff, todayStr } from './utils.ts'

export interface LessonRef {
  mod: ModuleId
  level: number
  lesson: number
}

export function lkey(mod: ModuleId, level: number, lesson: number): string {
  return `${mod}:${level}:${lesson}`
}

export function lessonDone(mod: ModuleId, level: number, lesson: number): boolean {
  return Object.hasOwn(state.lessons, lkey(mod, level, lesson))
}

export function levelDone(mod: ModuleId, level: number): boolean {
  for (let i = 0; i < LESSONS_PER_LEVEL; i++) if (!lessonDone(mod, level, i)) return false
  return true
}

export function levelUnlocked(mod: ModuleId, level: number): boolean {
  if (level === 1) return true
  if ((state.jumps[mod] ?? 1) >= level) return true
  return levelDone(mod, level - 1)
}

export function lessonUnlocked(mod: ModuleId, level: number, lesson: number): boolean {
  if (!levelUnlocked(mod, level)) return false
  return lesson === 0 || lessonDone(mod, level, lesson - 1)
}

/** The first open lesson that is not done, starting from the level a jump test reached. */
export function nextLesson(mod: ModuleId): LessonRef | null {
  const from = state.jumps[mod] ?? 1
  const order = [
    ...Array.from({ length: LEVELS - from + 1 }, (_, i) => from + i),
    ...Array.from({ length: from - 1 }, (_, i) => i + 1),
  ]
  for (const level of order) {
    for (let i = 0; i < LESSONS_PER_LEVEL; i++) {
      if (!lessonDone(mod, level, i) && lessonUnlocked(mod, level, i))
        return { mod, level, lesson: i }
    }
  }
  return null
}

export function modStats(mod: ModuleId): { done: number; stars: number; total: number } {
  let done = 0
  let stars = 0
  for (let l = 1; l <= LEVELS; l++) {
    for (let i = 0; i < LESSONS_PER_LEVEL; i++) {
      const r = state.lessons[lkey(mod, l, i)]
      if (r) {
        done++
        stars += r.stars
      }
    }
  }
  return { done, stars, total: LEVELS * LESSONS_PER_LEVEL }
}

export function modComplete(mod: ModuleId): boolean {
  return modStats(mod).done === LEVELS * LESSONS_PER_LEVEL
}

export function summitCount(): number {
  return MODULES.filter((m) => modComplete(m.id)).length
}

export interface Rank {
  name: string
  index: number
  min: number
  next: number | null
  nextName: string | null
}

export function rankOf(xp: number): Rank {
  let i = 0
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1][0]) i++
  const [min, name] = RANKS[i]
  const next = RANKS[i + 1]
  return { name, index: i, min, next: next ? next[0] : null, nextName: next ? next[1] : null }
}

export function currentStreak(): number {
  if (!state.streak.last) return 0
  const d = dayDiff(state.streak.last, todayStr())
  return (d >= 0 && d <= 1) || (d === 2 && (state.freezes ?? 0) > 0) ? state.streak.count : 0
}

export function dailyXp(): number {
  return state.daily.date === todayStr() ? state.daily.xp : 0
}

export function lastPlayed(): ModuleId | null {
  let best: { k: string; at: number } | null = null
  for (const [k, r] of Object.entries(state.lessons)) {
    if (!best || (r.at ?? 0) > best.at) best = { k, at: r.at ?? 0 }
  }
  return best ? (best.k.split(':')[0] as ModuleId) : null
}

/** Ids of questions the player missed and has not fixed in Review yet. */
export function mistakes(): string[] {
  return Object.entries(state.seen)
    .filter(([id, s]) => s.miss && qById(id))
    .map(([id]) => id)
}

/** Adds XP. Returns `true` when this reaches the daily goal. */
export function addXp(n: number): boolean {
  state.xp += n
  const t = todayStr()
  if (state.daily.date !== t) state.daily = { date: t, xp: 0 }
  const before = state.daily.xp
  state.daily.xp += n
  state.week[t] = (state.week[t] ?? 0) + n
  const keys = Object.keys(state.week).sort()
  while (keys.length > 14) delete state.week[keys.shift()!]
  return before < state.goal && state.daily.xp >= state.goal
}

/** Counts today toward the streak. A freeze covers one missed day. */
export function touchStreak(): boolean {
  const t = todayStr()
  if (state.streak.last === t) return false
  const d = state.streak.last ? dayDiff(state.streak.last, t) : 99
  if (d === 2 && (state.freezes ?? 0) > 0) {
    state.freezes = (state.freezes ?? 0) - 1
    state.streak.count++
    state.usedFreeze = t
  } else {
    state.streak.count = d === 1 ? state.streak.count + 1 : 1
  }
  if (state.streak.count > 0 && state.streak.count % 7 === 0 && (state.freezes ?? 0) < 2) {
    state.freezes = (state.freezes ?? 0) + 1
    state.freezeEarned = t
  }
  state.streak.last = t
  state.streak.best = Math.max(state.streak.best, state.streak.count)
  return true
}
