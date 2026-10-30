import { LESSONS_PER_LEVEL, LEVELS, MODULES, RANKS } from './constants.ts'
import { progress } from './store.ts'
import type { ModuleId, State } from './types.ts'
import { dayDiff, todayStr } from './utils.ts'

export interface LessonRef {
  mod: ModuleId
  level: number
  lesson: number
}

export function lkey(mod: ModuleId, level: number, lesson: number): string {
  return `${mod}:${level}:${lesson}`
}

export function lessonDone(
  mod: ModuleId,
  level: number,
  lesson: number,
  s: State = progress.value,
): boolean {
  return Object.hasOwn(s.lessons, lkey(mod, level, lesson))
}

export function levelDone(mod: ModuleId, level: number, s: State = progress.value): boolean {
  for (let i = 0; i < LESSONS_PER_LEVEL; i++) if (!lessonDone(mod, level, i, s)) return false
  return true
}

export function levelUnlocked(mod: ModuleId, level: number, s: State = progress.value): boolean {
  if (level === 1) return true
  if ((s.jumps[mod] ?? 1) >= level) return true
  return levelDone(mod, level - 1, s)
}

export function lessonUnlocked(
  mod: ModuleId,
  level: number,
  lesson: number,
  s: State = progress.value,
): boolean {
  if (!levelUnlocked(mod, level, s)) return false
  return lesson === 0 || lessonDone(mod, level, lesson - 1, s)
}

/** The first open lesson that is not done, starting from the level a jump test reached. */
export function nextLesson(mod: ModuleId, s: State = progress.value): LessonRef | null {
  const from = s.jumps[mod] ?? 1
  const order = [
    ...Array.from({ length: LEVELS - from + 1 }, (_, i) => from + i),
    ...Array.from({ length: from - 1 }, (_, i) => i + 1),
  ]
  for (const level of order) {
    for (let i = 0; i < LESSONS_PER_LEVEL; i++) {
      if (!lessonDone(mod, level, i, s) && lessonUnlocked(mod, level, i, s))
        return { mod, level, lesson: i }
    }
  }
  return null
}

export function modStats(
  mod: ModuleId,
  s: State = progress.value,
): { done: number; stars: number; total: number } {
  let done = 0
  let stars = 0
  for (let l = 1; l <= LEVELS; l++) {
    for (let i = 0; i < LESSONS_PER_LEVEL; i++) {
      const r = s.lessons[lkey(mod, l, i)]
      if (r) {
        done++
        stars += r.stars
      }
    }
  }
  return { done, stars, total: LEVELS * LESSONS_PER_LEVEL }
}

export function modComplete(mod: ModuleId, s: State = progress.value): boolean {
  return modStats(mod, s).done === LEVELS * LESSONS_PER_LEVEL
}

export function summitCount(s: State = progress.value): number {
  return MODULES.filter((m) => modComplete(m.id, s)).length
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

export function currentStreak(s: State = progress.value): number {
  if (!s.streak.last) return 0
  const d = dayDiff(s.streak.last, todayStr())
  return (d >= 0 && d <= 1) || (d === 2 && (s.freezes ?? 0) > 0) ? s.streak.count : 0
}

export function dailyXp(s: State = progress.value): number {
  return s.daily.date === todayStr() ? s.daily.xp : 0
}

export function lastPlayed(s: State = progress.value): ModuleId | null {
  let best: { k: string; at: number } | null = null
  for (const [k, r] of Object.entries(s.lessons)) {
    if (!best || (r.at ?? 0) > best.at) best = { k, at: r.at ?? 0 }
  }
  return best ? (best.k.split(':')[0] as ModuleId) : null
}

/** Ids of questions the player missed and has not fixed in Review yet. */
export function mistakes(s: State = progress.value): string[] {
  return Object.entries(s.seen)
    .filter(([, r]) => r.miss)
    .map(([id]) => id)
}

/** Adds XP to a draft state. Returns `true` when this reaches the daily goal. */
export function addXp(s: State, n: number): boolean {
  s.xp += n
  const t = todayStr()
  if (s.daily.date !== t) s.daily = { date: t, xp: 0 }
  const before = s.daily.xp
  s.daily.xp += n
  s.week[t] = (s.week[t] ?? 0) + n
  const keys = Object.keys(s.week).sort()
  while (keys.length > 14) delete s.week[keys.shift()!]
  return before < s.goal && s.daily.xp >= s.goal
}

/** Counts today toward the streak in a draft state. A freeze covers one missed day. */
export function touchStreak(s: State): boolean {
  const t = todayStr()
  if (s.streak.last === t) return false
  const d = s.streak.last ? dayDiff(s.streak.last, t) : 99
  if (d === 2 && (s.freezes ?? 0) > 0) {
    s.freezes = (s.freezes ?? 0) - 1
    s.streak.count++
    s.usedFreeze = t
  } else {
    s.streak.count = d === 1 ? s.streak.count + 1 : 1
  }
  if (s.streak.count > 0 && s.streak.count % 7 === 0 && (s.freezes ?? 0) < 2) {
    s.freezes = (s.freezes ?? 0) + 1
    s.freezeEarned = t
  }
  s.streak.last = t
  s.streak.best = Math.max(s.streak.best, s.streak.count)
  return true
}
