import * as v from 'valibot'

import { banks, lessonQuestions } from './bank.ts'
import { LESSONS_PER_LEVEL, LEVELS, MODULES, Q_PER_LESSON } from './constants.ts'
import { mistakes, modStats, nextLesson } from './progress.ts'
import { ModuleIdSchema } from './schema.ts'
import { progress } from './store.ts'
import type { ModuleId, Question, State } from './types.ts'
import { seeded, shuffle, todayStr } from './utils.ts'

/** The question banks loaded so far, by module. */
export type Banks = (typeof banks)['value']

/** Questions in a jump test. */
const JUMP_SIZE = 10
/** Questions in a daily challenge. */
const DAILY_SIZE = 5

/** The questions of one lesson, in file order. Empty when the bank is not loaded. */
export function lessonSet(
  mod: ModuleId,
  level: number,
  lesson: number,
  b: Banks = banks.value,
): Question[] {
  const bank = b[mod]
  if (!bank || level < 1 || level > bank.byLevel.length) return []
  return lessonQuestions(bank, level, lesson, LESSONS_PER_LEVEL)
}

/**
 * Ten questions from the levels below `level`, taken from each level in turn. Questions the player
 * has not seen come first. Fill questions are left out. The result is sorted by level.
 */
export function jumpSet(
  mod: ModuleId,
  level: number,
  s: State = progress.value,
  b: Banks = banks.value,
): Question[] {
  const bank = b[mod]
  if (!bank || level < 2) return []
  // Each pool ends with the unseen questions, so `pop()` takes those first.
  const pools = bank.byLevel.slice(0, level - 1).map((list) => {
    return shuffle(list.filter((q) => q.type !== 'fill')).sort(
      (x, y) => Number(Object.hasOwn(s.seen, y.id)) - Number(Object.hasOwn(s.seen, x.id)),
    )
  })
  const qs: Question[] = []
  for (let k = 0; qs.length < JUMP_SIZE && pools.some((p) => p.length > 0); k++) {
    const q = pools[k % pools.length].pop()
    if (q) qs.push(q)
  }
  return qs.sort((x, y) => x.level - y.level)
}

/** Eight random questions from one level. */
export function practiceSet(mod: ModuleId, level: number, b: Banks = banks.value): Question[] {
  return shuffle(b[mod]?.byLevel[level - 1] ?? []).slice(0, Q_PER_LESSON)
}

/**
 * Five questions seeded by `date`, from the level each trail has reached and the level below it.
 * Trails the player has started are favored. With no started trail, level 1 questions are favored.
 * When the favored pool is too small, the whole pool is used.
 */
export function dailySet(
  date: string = todayStr(),
  s: State = progress.value,
  b: Banks = banks.value,
): Question[] {
  const rnd = seeded('daily-' + date)
  const pool: Question[] = []
  for (const m of MODULES) {
    const bank = b[m.id]
    if (!bank) continue
    const maxL = nextLesson(m.id, s)?.level ?? LEVELS
    for (let l = Math.max(1, maxL - 1); l <= maxL; l++) pool.push(...(bank.byLevel[l - 1] ?? []))
  }
  const started = new Set(MODULES.filter((m) => modStats(m.id, s).done > 0).map((m) => m.id))
  const favored =
    started.size > 0 ? pool.filter((q) => started.has(q.module)) : pool.filter((q) => q.level === 1)
  return shuffle(favored.length >= DAILY_SIZE ? favored : pool, rnd).slice(0, DAILY_SIZE)
}

/** Finds a question in `b`. */
export function findQuestion(id: string, b: Banks = banks.value): Question | undefined {
  const mod = v.safeParse(ModuleIdSchema, id.split('-')[0])
  if (!mod.success) return undefined
  return b[mod.output]?.all.find((q) => q.id === id)
}

/** Up to eight questions the player missed and has not fixed yet. Unknown ids are skipped. */
export function reviewSet(s: State = progress.value, b: Banks = banks.value): Question[] {
  return shuffle(mistakes(s))
    .map((id) => findQuestion(id, b))
    .filter((q) => q !== undefined)
    .slice(0, Q_PER_LESSON)
}

function digits(min: number, max: number) {
  return v.pipe(
    v.string(),
    v.regex(/^\d+$/),
    v.transform(Number),
    v.integer(),
    v.minValue(min),
    v.maxValue(max),
  )
}

const LevelParam = digits(1, LEVELS)

const PlayParamsSchema = v.variant('mode', [
  v.object({
    mode: v.literal('lesson'),
    mod: ModuleIdSchema,
    level: LevelParam,
    lesson: digits(0, LESSONS_PER_LEVEL - 1),
  }),
  v.object({ mode: v.literal('jump'), mod: ModuleIdSchema, level: digits(2, LEVELS) }),
  v.object({ mode: v.literal('practice'), mod: ModuleIdSchema, level: LevelParam }),
  v.object({ mode: v.literal('daily') }),
  v.object({ mode: v.literal('review') }),
])

/** What `/play` is asked to run. */
export type PlayRequest = v.InferOutput<typeof PlayParamsSchema>

/** The session kinds, one per `/play` mode. */
export type SessionKind = PlayRequest['mode']

/** Reads the `/play` query. Returns `null` when it does not describe a session. */
export function parsePlayParams(search: URLSearchParams): PlayRequest | null {
  const result = v.safeParse(PlayParamsSchema, Object.fromEntries(search))
  return result.success ? result.output : null
}

/** The `/play` URL of a request. Equal requests always give the same URL. */
export function playHref(req: PlayRequest): string {
  const params: [string, string][] = [['mode', req.mode]]
  if (req.mode === 'lesson' || req.mode === 'jump' || req.mode === 'practice') {
    params.push(['mod', req.mod], ['level', String(req.level)])
  }
  if (req.mode === 'lesson') params.push(['lesson', String(req.lesson)])
  return `/play?${new URLSearchParams(params).toString()}`
}

/** The question banks to load before a request can start. */
export function banksFor(req: PlayRequest): ModuleId[] {
  return req.mode === 'daily' || req.mode === 'review' ? MODULES.map((m) => m.id) : [req.mod]
}

/** Picks the questions for a request. */
export function questionsFor(
  req: PlayRequest,
  s: State = progress.value,
  b: Banks = banks.value,
): Question[] {
  switch (req.mode) {
    case 'lesson':
      return lessonSet(req.mod, req.level, req.lesson, b)
    case 'jump':
      return jumpSet(req.mod, req.level, s, b)
    case 'practice':
      return practiceSet(req.mod, req.level, b)
    case 'daily':
      return dailySet(todayStr(), s, b)
    case 'review':
      return reviewSet(s, b)
  }
}
