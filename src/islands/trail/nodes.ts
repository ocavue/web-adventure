import { LESSONS_PER_LEVEL } from '../../lib/constants.ts'
import { lessonUnlocked, levelDone, levelUnlocked, lkey, nextLesson } from '../../lib/progress.ts'
import type { ModuleId, State } from '../../lib/types.ts'

export interface LessonNode {
  lesson: number
  status: 'done' | 'open' | 'locked'
  /** The lesson the trail suggests next. It gets the "Start" tag. */
  current: boolean
  /** Stars earned, when done. */
  stars: number
}

export interface Camp {
  level: number
  unlocked: boolean
  /** `jump` offers a jump test, `practice` offers practice on a finished level. */
  action: 'jump' | 'practice' | null
  nodes: LessonNode[]
}

/** The state of one camp (level) of a trail map. */
export function campOf(mod: ModuleId, level: number, s: State): Camp {
  const unlocked = levelUnlocked(mod, level, s)
  const next = nextLesson(mod, s)
  const nodes = Array.from({ length: LESSONS_PER_LEVEL }, (_, lesson): LessonNode => {
    const record = s.lessons[lkey(mod, level, lesson)]
    return {
      lesson,
      status: record ? 'done' : lessonUnlocked(mod, level, lesson, s) ? 'open' : 'locked',
      current: next !== null && next.level === level && next.lesson === lesson,
      stars: record?.stars ?? 0,
    }
  })
  const action = !unlocked ? 'jump' : levelDone(mod, level, s) ? 'practice' : null
  return { level, unlocked, action, nodes }
}

/** The toast for a tap on a locked lesson. */
export function lockedMessage(mod: ModuleId, level: number, s: State): string {
  return levelUnlocked(mod, level, s)
    ? 'Finish the lesson before this one to unlock it.'
    : `Finish level ${level - 1} first, or use "Jump here" to test out.`
}

/** The SVG path of the trail line through the centers of the lesson nodes. */
export function trailPath(points: readonly (readonly [number, number])[]): string {
  if (points.length < 2) return ''
  const [x0, y0] = points[0]
  let d = `M${x0} ${y0 - 40}L${x0} ${y0}`
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1]
    const [bx, by] = points[i]
    const midY = (ay + by) / 2
    d += `C${ax} ${midY} ${bx} ${midY} ${bx} ${by}`
  }
  return d
}
