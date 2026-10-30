import { MOD } from '../../lib/constants.ts'
import { mistakes } from '../../lib/progress.ts'
import { findQuestion } from '../../lib/selection.ts'
import type { Banks } from '../../lib/selection.ts'
import type { ModuleId, State } from '../../lib/types.ts'
import { todayStr } from '../../lib/utils.ts'

export interface DayXp {
  /** `YYYY-MM-DD`. */
  date: string
  xp: number
}

/** XP earned on each of the last 7 days, oldest first, ending today. */
export function weekXp(s: State, today: Date = new Date()): DayXp[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const date = todayStr(d)
    return { date, xp: s.week[date] ?? 0 }
  })
}

/** The share of correct answers in one trail, from 0 to 1. `null` when there are no answers yet. */
export function trailAccuracy(mod: ModuleId, s: State): number | null {
  let correct = 0
  let total = 0
  for (const [id, r] of Object.entries(s.seen)) {
    if (!id.startsWith(mod + '-')) continue
    correct += r.c
    total += r.c + r.w
  }
  return total ? correct / total : null
}

export interface TopicGroup {
  mod: ModuleId
  topic: string
  count: number
}

/** Missed questions grouped by trail and topic, most missed first. Questions not in `b` are skipped. */
export function topicGroups(s: State, b: Banks, limit = 6): TopicGroup[] {
  const groups = new Map<string, TopicGroup>()
  for (const id of mistakes(s)) {
    const q = findQuestion(id, b)
    if (!q) continue
    const key = `${q.module}|${q.topic}`
    const group = groups.get(key)
    if (group) group.count++
    else groups.set(key, { mod: q.module, topic: q.topic, count: 1 })
  }
  return [...groups.values()].sort((x, y) => y.count - x.count).slice(0, limit)
}

/** Trails that have missed questions, so their banks can load. */
export function mistakeTrails(s: State): ModuleId[] {
  const mods = new Set(mistakes(s).map((id) => id.split('-')[0]))
  return [...mods].filter((m): m is ModuleId => Object.hasOwn(MOD, m))
}

/** Time on the trail, such as `45s`, `12m`, or `1h 32m`. */
export function timeText(secs: number): string {
  const hours = Math.floor(secs / 3600)
  const mins = Math.round((secs % 3600) / 60)
  if (hours) return `${hours}h ${mins}m`
  return secs < 60 ? `${secs}s` : `${mins}m`
}
