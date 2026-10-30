import { MODULES } from '../../lib/constants.ts'
import { currentStreak, dailyXp, lastPlayed, modStats, nextLesson } from '../../lib/progress.ts'
import type { LessonRef } from '../../lib/progress.ts'
import type { ModuleId, State } from '../../lib/types.ts'
import { todayStr } from '../../lib/utils.ts'

export function greeting(now: Date = new Date()): string {
  const hour = now.getHours()
  return hour < 5
    ? 'Still up'
    : hour < 12
      ? 'Good morning'
      : hour < 18
        ? 'Good afternoon'
        : 'Good evening'
}

/** `true` once the player has finished any lesson. */
export function hasStarted(s: State): boolean {
  return Object.keys(s.lessons).length > 0
}

/** What Bit says on the home page. `tip` is the line for a day with nothing special to say. */
export function buddyLine(s: State, tip: string): string {
  const streak = currentStreak(s)
  if (!hasStarted(s))
    return 'Pick any trail below. Every one starts with the very basics, so you cannot pick wrong.'
  if (dailyXp(s) >= s.goal)
    return `Daily goal done! You are on a ${streak}-day streak. Anything more is a bonus.`
  if (s.usedFreeze === todayStr())
    return `A streak freeze saved your ${streak}-day streak. Welcome back!`
  if (streak > 1) return `${streak} days in a row! Keep the flame alive today.`
  if (s.streak.best > 1 && streak === 0) {
    return `A new streak starts today. Your best so far is ${s.streak.best} days. Let's beat it!`
  }
  return tip
}

/** The lesson the "Continue" card offers: the next one on the last trail played, else the first open one. */
export function continueTarget(s: State): LessonRef | null {
  const last = lastPlayed(s)
  const fromLast = last ? nextLesson(last, s) : null
  if (fromLast) return fromLast
  for (const m of MODULES) {
    const ref = nextLesson(m.id, s)
    if (ref) return ref
  }
  return null
}

/** The status line of a trail card. `titles` are the trail's level titles. */
export function trailStatus(mod: ModuleId, titles: string[], s: State): string {
  const st = modStats(mod, s)
  if (st.done === st.total) return 'Summit reached!'
  const next = nextLesson(mod, s)
  return next ? `Level ${next.level}: ${titles[next.level - 1]}` : ''
}
