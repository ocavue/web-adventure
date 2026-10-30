import { computed, signal, type ReadonlySignal } from '@preact/signals'
import * as v from 'valibot'

import { isCaseSlip, isCorrect } from './answer.ts'
import { banks } from './bank.ts'
import { LEVELS, MODULES } from './constants.ts'
import {
  addXp,
  currentStreak,
  lessonDone,
  levelDone,
  lkey,
  modComplete,
  modStats,
  summitCount,
  touchStreak,
} from './progress.ts'
import { ModuleIdSchema } from './schema.ts'
import {
  findQuestion,
  modulesOf,
  playHref,
  questionsFor,
  type Banks,
  type PlayRequest,
  type SessionKind,
} from './selection.ts'
import { progress, updateProgress } from './store.ts'
import type { ModuleId, Question, Selection, State } from './types.ts'
import { shuffle, todayStr } from './utils.ts'

/** Correct first tries a jump test needs. */
const JUMP_PASS = 8
/** Saved sessions older than this start over. */
const MAX_AGE_MS = 6 * 60 * 60 * 1000
const STORAGE_PREFIX = 'byte-trail:session:'
const RESULT_PREFIX = 'byte-trail:result:'

const int = v.pipe(v.number(), v.integer(), v.minValue(0))

const SelectionSchema = v.union([
  v.boolean(),
  v.number(),
  v.array(v.number()),
  v.string(),
  v.null(),
])

const KindSchema = v.picklist(['lesson', 'jump', 'practice', 'daily', 'review'])

const SessionMetaSchema = v.object({
  mod: v.optional(ModuleIdSchema),
  level: v.optional(int),
  lesson: v.optional(int),
  replay: v.optional(v.boolean()),
  /** The day a daily challenge belongs to. */
  date: v.optional(v.string()),
})

const SessionItemSchema = v.object({
  id: v.string(),
  order: v.optional(v.array(int)),
  retry: v.optional(v.boolean()),
})

const AnswerResultSchema = v.object({
  id: v.string(),
  ok: v.boolean(),
  first: v.boolean(),
  retry: v.boolean(),
})

const LastAnswerSchema = v.object({ ok: v.boolean(), xp: int, caseSlip: v.boolean() })

const SessionStateSchema = v.object({
  kind: KindSchema,
  meta: SessionMetaSchema,
  queue: v.pipe(v.array(SessionItemSchema), v.minLength(1)),
  idx: int,
  /** Questions at the start, before any wrong answer comes back. */
  total: v.pipe(int, v.minValue(1)),
  selection: SelectionSchema,
  answered: v.boolean(),
  last: v.nullable(LastAnswerSchema),
  combo: int,
  bestCombo: int,
  /** The `idx` of the question whose hint is open. */
  hintShown: v.nullable(int),
  hints: int,
  firstTry: v.record(v.string(), v.boolean()),
  results: v.array(AnswerResultSchema),
  fixed: int,
  xp: int,
  started: int,
  xpBefore: int,
  badges0: v.array(v.string()),
  freezes0: int,
  goalHit: v.boolean(),
  /** Questions the player had missed before this session, for the "Second chance" tag. */
  missed0: v.array(v.string()),
  status: v.picklist(['active', 'finished', 'quit']),
})

const SavedSessionSchema = v.object({ savedAt: int, state: SessionStateSchema })

const LessonResultSchema = v.object({
  kind: KindSchema,
  meta: SessionMetaSchema,
  firstOk: int,
  firstTotal: int,
  acc: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  secs: int,
  xp: int,
  xpBefore: int,
  bestCombo: int,
  fixed: int,
  results: v.array(AnswerResultSchema),
  newBadges: v.array(v.string()),
  stars: v.optional(v.pipe(int, v.minValue(1), v.maxValue(3))),
  firstClear: v.optional(v.boolean()),
  campCleared: v.optional(int),
  summit: v.optional(v.boolean()),
  passed: v.optional(v.boolean()),
  goalHit: v.optional(v.boolean()),
  streak: int,
  freezeEarned: v.boolean(),
})

const SavedResultSchema = v.object({ savedAt: int, result: LessonResultSchema })

export type SessionMeta = v.InferOutput<typeof SessionMetaSchema>
/** A question in the session queue. `order` is the shuffled order of its choices. */
type SessionItem = v.InferOutput<typeof SessionItemSchema>
/** The outcome of the last `check()`. */
export type LastAnswer = v.InferOutput<typeof LastAnswerSchema>
/** Everything about a running session. Plain JSON, so it can be saved and restored. */
export type SessionState = v.InferOutput<typeof SessionStateSchema>

/** The question on screen. */
export interface SessionQuestion {
  question: Question
  /** Choice indexes in display order. Empty for true/false and fill questions. */
  order: number[]
  /** A wrong answer from this session that came back. Shown as "Second try". */
  retry: boolean
  /** Missed in an earlier session. Shown as "Second chance" outside lessons. */
  missedBefore: boolean
}

/** The outcome of a finished session, shown on the results screen. */
export type LessonResult = v.InferOutput<typeof LessonResultSchema>

export interface Session {
  readonly request: PlayRequest
  /** The `/play` URL of this session. */
  readonly href: string
  /** "Lesson", "Daily challenge", and so on. */
  readonly title: string
  /** Wrong answers come back at the end. */
  readonly requeues: boolean
  readonly state: ReadonlySignal<SessionState>
  /** `null` once the session has ended. */
  readonly current: ReadonlySignal<SessionQuestion | null>
  /** From 0 to 1. Sessions that requeue count only correct answers. */
  readonly progress: ReadonlySignal<number>
  readonly canCheck: ReadonlySignal<boolean>
  /** The hint of the current question can still be opened. */
  readonly canHint: ReadonlySignal<boolean>
  /** The hint of the current question is open. */
  readonly hintVisible: ReadonlySignal<boolean>
  /** Questions left in the queue, without the one just answered. */
  readonly remaining: ReadonlySignal<number>
  /** Set once the session finishes. */
  readonly result: ReadonlySignal<LessonResult | null>
  /** Replaces the selection. Ignored after `check()`. */
  select: (value: Selection) => void
  /** Toggles a choice of a multi question, or picks a choice of a single question. */
  toggleChoice: (ci: number) => void
  setFill: (text: string) => void
  /** Handles 1-4, T, F, and H. Returns `true` when the key did something. */
  selectByKey: (key: string) => boolean
  showHint: () => void
  /** Checks the selection and saves the progress. Returns `null` when there is nothing to check. */
  check: () => LastAnswer | null
  /** Moves past an answered question. Returns `true` when the session finished. */
  next: () => boolean
  /** Ends a session whose questions are all answered. Calling it again returns the same result. */
  finish: () => LessonResult
  /** Ends the session early. Returns the badges earned in it, held back until now. */
  quit: () => string[]
}

export function sessionTitle(kind: SessionKind, meta: SessionMeta): string {
  switch (kind) {
    case 'daily':
      return 'Daily challenge'
    case 'review':
      return 'Review'
    case 'jump':
      return `Jump test: level ${meta.level}`
    case 'practice':
      return 'Practice'
    case 'lesson':
      return `Level ${meta.level} · Lesson ${(meta.lesson ?? 0) + 1}`
  }
}

function sessionRequeues(kind: SessionKind): boolean {
  return kind === 'lesson' || kind === 'practice' || kind === 'review'
}

function prepItem(q: Question): SessionItem {
  if (q.type === 'single' || q.type === 'multi') {
    return { id: q.id, order: shuffle(q.choices.map((_, i) => i)) }
  }
  return { id: q.id }
}

function award(d: State, id: string): void {
  if (!Object.hasOwn(d.badges, id)) d.badges[id] = Date.now()
}

function hasSelection(sel: Selection): boolean {
  return (
    sel !== null &&
    !(Array.isArray(sel) && sel.length === 0) &&
    !(typeof sel === 'string' && !sel.trim())
  )
}

function newBadges(st: SessionState, s: State): string[] {
  const before = new Set(st.badges0)
  return Object.keys(s.badges).filter((b) => !before.has(b))
}

function storageKey(href: string): string {
  return STORAGE_PREFIX + href
}

function resultKey(href: string): string {
  return RESULT_PREFIX + href
}

/** Starts a session with these questions, in this order. */
export function createSession(
  request: PlayRequest,
  questions: Question[],
  options: { replay?: boolean } = {},
): Session {
  if (questions.length === 0) throw new Error('A session needs at least one question')
  const s = progress.peek()
  const meta: SessionMeta = {}
  if (request.mode === 'lesson' || request.mode === 'jump' || request.mode === 'practice') {
    meta.mod = request.mod
    meta.level = request.level
  }
  if (request.mode === 'lesson') {
    meta.lesson = request.lesson
    meta.replay = options.replay ?? false
  }
  if (request.mode === 'daily') meta.date = todayStr()
  const state: SessionState = {
    kind: request.mode,
    meta,
    queue: questions.map((q) => prepItem(q)),
    idx: 0,
    total: questions.length,
    selection: null,
    answered: false,
    last: null,
    combo: 0,
    bestCombo: 0,
    hintShown: null,
    hints: 0,
    firstTry: {},
    results: [],
    fixed: 0,
    xp: 0,
    started: Date.now(),
    xpBefore: s.xp,
    badges0: Object.keys(s.badges),
    freezes0: s.freezes ?? 0,
    goalHit: false,
    missed0: questions.filter((q) => s.seen[q.id]?.miss).map((q) => q.id),
    status: 'active',
  }
  // A new session replaces the results of the last one at this URL.
  removeItem(resultKey(playHref(request)))
  return buildSession(request, state, new Map(questions.map((q) => [q.id, q])))
}

/**
 * Picks the questions for a request and starts a session. Returns `null` when there are no
 * questions, for example a review with nothing to review. Load the banks from `banksFor()` and the
 * stored progress first.
 */
export function startSession(
  request: PlayRequest,
  s: State = progress.peek(),
  b: Banks = banks.peek(),
): Session | null {
  const questions = questionsFor(request, s, b)
  if (questions.length === 0) return null
  const replay =
    request.mode === 'lesson' && lessonDone(request.mod, request.level, request.lesson, s)
  return createSession(request, questions, { replay })
}

function buildSession(
  request: PlayRequest,
  initial: SessionState,
  questions: Map<string, Question>,
): Session {
  const state = signal(initial)
  const result = signal<LessonResult | null>(null)
  const href = playHref(request)
  const requeues = sessionRequeues(initial.kind)

  const questionAt = (st: SessionState): Question | undefined => {
    const item = st.queue[st.idx]
    return item && questions.get(item.id)
  }

  const current = computed((): SessionQuestion | null => {
    const st = state.value
    const item = st.queue[st.idx]
    const question = questionAt(st)
    if (st.status !== 'active' || !item || !question) return null
    return {
      question,
      order: item.order ?? [],
      retry: item.retry ?? false,
      missedBefore: st.kind !== 'lesson' && st.missed0.includes(item.id),
    }
  })

  const progressFraction = computed(() => {
    const st = state.value
    const done = requeues ? st.results.filter((r) => r.ok).length : st.results.length
    return Math.min(1, done / st.total)
  })

  const active = (st: SessionState) => st.status === 'active' && st.idx < st.queue.length

  const canCheck = computed(() => {
    const st = state.value
    return active(st) && !st.answered && hasSelection(st.selection)
  })

  const hintVisible = computed(() => {
    const st = state.value
    return active(st) && st.hintShown === st.idx
  })

  const canHint = computed(() => {
    const st = state.value
    return active(st) && !st.answered && st.hintShown !== st.idx
  })

  const remaining = computed(() => {
    const st = state.value
    return Math.max(0, st.queue.length - st.idx - (st.answered ? 1 : 0))
  })

  const update = (recipe: (draft: SessionState) => void): void => {
    const draft = structuredClone(state.peek())
    recipe(draft)
    state.value = draft
  }

  const select = (value: Selection): void => {
    const st = state.peek()
    if (!active(st) || st.answered) return
    update((d) => {
      d.selection = value
    })
    save()
  }

  const toggleChoice = (ci: number): void => {
    const st = state.peek()
    const q = questionAt(st)
    if (!q || (q.type !== 'single' && q.type !== 'multi')) return
    if (!Number.isSafeInteger(ci) || ci < 0 || ci >= q.choices.length) return
    if (q.type === 'single') return select(ci)
    const picked = new Set(Array.isArray(st.selection) ? st.selection : [])
    if (picked.has(ci)) picked.delete(ci)
    else picked.add(ci)
    select([...picked])
  }

  const setFill = (text: string): void => {
    if (questionAt(state.peek())?.type === 'fill') select(text)
  }

  const showHint = (): void => {
    if (!canHint.peek()) return
    update((d) => {
      d.hintShown = d.idx
      d.hints++
    })
    updateProgress((d) => {
      d.stats.hints++
    })
    save()
  }

  const selectByKey = (key: string): boolean => {
    const st = state.peek()
    const q = questionAt(st)
    if (!q || !active(st) || st.answered) return false
    const k = key.toLowerCase()
    if (k === 'h') {
      if (!canHint.peek()) return false
      showHint()
      return true
    }
    if (q.type === 'tf' && (k === 't' || k === 'f')) {
      select(k === 't')
      return true
    }
    if ((q.type === 'single' || q.type === 'multi') && /^[1-4]$/.test(k)) {
      const ci = st.queue[st.idx].order?.[Number(k) - 1]
      if (ci === undefined) return false
      toggleChoice(ci)
      return true
    }
    return false
  }

  const check = (): LastAnswer | null => {
    if (!canCheck.peek()) return null
    const next = structuredClone(state.peek())
    const item = next.queue[next.idx]
    const q = questions.get(item.id)
    if (!q) return null
    const kind = next.kind
    const ok = isCorrect(q, next.selection)
    const caseSlip = isCaseSlip(q, next.selection)
    let xp = 0
    updateProgress((d) => {
      touchStreak(d)
      const today = todayStr()
      const dailyRepeat =
        kind === 'daily' && d.dailySeen?.date === today && d.dailySeen.ids.includes(q.id)
      if (kind === 'daily') {
        if (d.dailySeen?.date !== today) d.dailySeen = { date: today, ids: [] }
        if (!dailyRepeat) d.dailySeen.ids.push(q.id)
      }
      const first = !Object.hasOwn(next.firstTry, q.id)
      if (first) next.firstTry[q.id] = ok
      const seen = d.seen[q.id] ?? { c: 0, w: 0 }
      if (ok) {
        next.combo++
        next.bestCombo = Math.max(next.bestCombo, next.combo)
        xp = questionXp(next, item, seen.c > 0, dailyRepeat)
        if (item.retry) {
          next.fixed++
          award(d, 'comeback')
        }
      } else {
        next.combo = 0
        if (requeues) next.queue.push({ ...prepItem(q), retry: true })
      }
      next.xp += xp
      next.answered = true
      next.last = { ok, xp, caseSlip }
      next.results.push({ id: q.id, ok, first, retry: item.retry ?? false })

      d.stats.answered++
      if (ok) d.stats.correct++
      d.stats.bestCombo = Math.max(d.stats.bestCombo, next.combo)
      if (ok) seen.c++
      else seen.w++
      if (!ok && kind !== 'jump') seen.miss = true
      if (ok && kind === 'review' && seen.miss) {
        seen.miss = false
        d.stats.reviewCleared++
      }
      d.seen[q.id] = seen
      if (xp && addXp(d, xp)) next.goalHit = true
      if (next.combo === 5) award(d, 'combo5')
      if (next.combo === 12) award(d, 'combo12')
      if (d.stats.answered >= 100) award(d, 'q100')
      if (d.stats.answered >= 500) award(d, 'q500')
      if (d.stats.reviewCleared >= 10) award(d, 'reviewer')
    })
    state.value = next
    save()
    return next.last
  }

  const finish = (): LessonResult => {
    const cached = result.peek()
    if (cached) return cached
    const st = structuredClone(state.peek())
    if (st.status !== 'active' || st.idx < st.queue.length) {
      throw new Error('The session still has questions to answer')
    }
    const firstTotal = Object.keys(st.firstTry).length
    const firstOk = Object.values(st.firstTry).filter(Boolean).length
    const acc = firstTotal ? firstOk / firstTotal : 0
    // A clock moved back must not make the play time negative.
    const secs = Math.max(0, Math.round((Date.now() - st.started) / 1000))
    const res: LessonResult = {
      kind: st.kind,
      meta: st.meta,
      firstOk,
      firstTotal,
      acc,
      secs,
      xp: st.xp,
      xpBefore: st.xpBefore,
      bestCombo: st.bestCombo,
      fixed: st.fixed,
      results: st.results,
      newBadges: [],
      streak: 0,
      freezeEarned: false,
    }
    updateProgress((d) => {
      d.stats.time += secs
      if (request.mode === 'lesson') {
        finishLesson(d, st, res, request)
      } else if (request.mode === 'jump') {
        res.passed = firstOk >= JUMP_PASS
        if (res.passed) {
          d.jumps[request.mod] = Math.max(d.jumps[request.mod] ?? 1, request.level)
          award(d, 'jumper')
          st.xp += 30
          addXp(d, 30)
        }
      } else if (request.mode === 'daily') {
        const today = todayStr()
        // A second try the same day keeps the best score.
        d.challenges[today] = Math.max(d.challenges[today] ?? 0, firstOk)
        const keys = Object.keys(d.challenges).sort()
        while (keys.length > 30) delete d.challenges[keys.shift() ?? '']
        award(d, 'daily')
      }
      res.xp = st.xp
      const h = new Date().getHours()
      if (d.stats.lessons >= 3 && (h >= 22 || h < 4)) award(d, 'owl')
      if (d.stats.lessons >= 3 && h >= 4 && h < 8) award(d, 'lark')
      if (
        st.goalHit ||
        (d.daily.date === todayStr() && d.daily.xp >= d.goal && d.daily.xp - st.xp < d.goal)
      ) {
        res.goalHit = true
      }
      const streak = currentStreak(d)
      if (streak >= 3) award(d, 'streak3')
      if (streak >= 7) award(d, 'streak7')
      res.newBadges = newBadges(st, d)
      res.streak = streak
      res.freezeEarned = (d.freezes ?? 0) > st.freezes0
    })
    st.status = 'finished'
    state.value = st
    result.value = res
    clearSession(request)
    saveResult(href, res)
    return res
  }

  const next = (): boolean => {
    const st = state.peek()
    if (!active(st) || !st.answered) return false
    update((d) => {
      d.idx++
      d.answered = false
      d.selection = null
      d.last = null
    })
    if (state.peek().idx >= state.peek().queue.length) {
      finish()
      return true
    }
    save()
    return false
  }

  const quit = (): string[] => {
    const st = state.peek()
    if (st.status !== 'active') return []
    update((d) => {
      d.status = 'quit'
    })
    clearSession(request)
    return newBadges(st, progress.peek())
  }

  const session: Session = {
    request,
    href,
    title: sessionTitle(initial.kind, initial.meta),
    requeues,
    state,
    current,
    progress: progressFraction,
    canCheck,
    canHint,
    hintVisible,
    remaining,
    result,
    select,
    toggleChoice,
    setFill,
    selectByKey,
    showHint,
    check,
    next,
    finish,
    quit,
  }
  const save = () => saveSession(session)
  return session
}

function questionXp(
  st: SessionState,
  item: SessionItem,
  mastered: boolean,
  dailyRepeat: boolean,
): number {
  const usedHint = st.hintShown === st.idx
  let xp = item.retry ? 4 : usedHint ? 6 : 10
  if (st.combo >= 5) xp += 2
  if (mastered && st.kind !== 'review') xp = 2
  if (st.kind === 'daily') xp = dailyRepeat ? 2 : 20
  if (st.kind === 'jump') xp = mastered ? 0 : 5
  return xp
}

function finishLesson(
  d: State,
  st: SessionState,
  res: LessonResult,
  req: Extract<PlayRequest, { mode: 'lesson' }>,
): void {
  const { mod, level, lesson } = req
  const stars = res.acc >= 0.99 ? 3 : res.acc >= 0.7 ? 2 : 1
  const bonus = st.meta.replay ? 0 : stars * 5
  res.stars = stars
  st.xp += bonus
  if (bonus) addXp(d, bonus)
  const k = lkey(mod, level, lesson)
  const prev = d.lessons[k]
  res.firstClear = !prev
  d.lessons[k] = { stars: Math.max(stars, prev?.stars ?? 0), at: Date.now() }
  d.stats.lessons++
  award(d, 'first')
  if (stars === 3) award(d, 'perfect')
  if (st.hints === 0 && d.stats.lessons >= 3) award(d, 'nohint')
  const t = todayStr()
  d.dayLessons = d.dayLessons?.date === t ? { date: t, n: d.dayLessons.n + 1 } : { date: t, n: 1 }
  if (d.dayLessons.n >= 3) award(d, 'speedy')
  if (!prev && levelDone(mod, level, d)) {
    award(d, 'camp')
    if (level < LEVELS) {
      res.campCleared = level
      st.xp += 25
      addXp(d, 25)
    }
  }
  if (MODULES.filter((m) => modStats(m.id, d).done > 0).length >= 4) award(d, 'explorer')
  if (modComplete(mod, d)) {
    award(d, 'summit')
    res.summit = !prev
    if (res.summit) {
      st.xp += 100
      addXp(d, 100)
    }
  }
  if (summitCount(d) === MODULES.length) award(d, 'allsummits')
}

/** Saves a running session to `sessionStorage`, so a reload of its `/play` URL resumes it. */
function saveSession(session: Session): void {
  const state = session.state.peek()
  if (state.status !== 'active') return
  try {
    sessionStorage.setItem(storageKey(session.href), JSON.stringify({ savedAt: Date.now(), state }))
  } catch {
    // Storage can be blocked or full. The session then does not survive a reload.
  }
}

function removeItem(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // Nothing was saved.
  }
}

/** Forgets the saved session of a request. */
export function clearSession(request: PlayRequest): void {
  removeItem(storageKey(playHref(request)))
}

function readItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

/** Saves a finished session's result, so a reload or Back / Forward shows it again. */
function saveResult(href: string, result: LessonResult): void {
  try {
    sessionStorage.setItem(resultKey(href), JSON.stringify({ savedAt: Date.now(), result }))
  } catch {
    // Storage can be blocked or full. A reload then starts a new session.
  }
}

function matchesMeta(kind: SessionKind, meta: SessionMeta, req: PlayRequest): boolean {
  if (kind !== req.mode) return false
  if (req.mode === 'lesson' && meta.lesson !== req.lesson) return false
  if (req.mode === 'lesson' || req.mode === 'jump' || req.mode === 'practice') {
    return meta.mod === req.mod && meta.level === req.level
  }
  return true
}

function fresh(savedAt: number): boolean {
  const age = Date.now() - savedAt
  return age >= 0 && age <= MAX_AGE_MS
}

/**
 * The result of the last finished session of a request, saved in this tab. Returns `null`, and
 * forgets the saved data, when there is none, it is invalid, or it is older than a few hours.
 */
export function restoreResult(request: PlayRequest): LessonResult | null {
  const key = resultKey(playHref(request))
  const raw = readItem(key)
  if (raw === null) return null
  const parsed = v.safeParse(SavedResultSchema, parseJson(raw))
  if (
    parsed.success &&
    fresh(parsed.output.savedAt) &&
    matchesMeta(parsed.output.result.kind, parsed.output.result.meta, request)
  ) {
    return parsed.output.result
  }
  removeItem(key)
  return null
}

/** The modules of the questions in the saved session of a request, so their banks load first. */
export function savedModules(request: PlayRequest): ModuleId[] {
  const raw = readItem(storageKey(playHref(request)))
  if (raw === null) return []
  const parsed = v.safeParse(SavedSessionSchema, parseJson(raw))
  return parsed.success ? modulesOf(parsed.output.state.queue.map((item) => item.id)) : []
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function validOrder(q: Question, order: number[] | undefined): boolean {
  if (q.type !== 'single' && q.type !== 'multi') return order === undefined
  if (order?.length !== q.choices.length) return false
  return new Set(order).size === order.length && order.every((ci) => ci < q.choices.length)
}

/**
 * Resumes the saved session of a request. Returns `null`, and forgets the saved data, when there
 * is none, it is invalid or older than a few hours, or its questions are not in the loaded banks.
 */
export function restoreSession(request: PlayRequest, b: Banks = banks.peek()): Session | null {
  const href = playHref(request)
  const raw = readItem(storageKey(href))
  if (raw === null) return null
  const parsed = v.safeParse(SavedSessionSchema, parseJson(raw))
  const restored = parsed.success ? resume(request, parsed.output, b) : null
  if (!restored) clearSession(request)
  return restored
}

function resume(
  request: PlayRequest,
  saved: v.InferOutput<typeof SavedSessionSchema>,
  b: Banks,
): Session | null {
  const { state, savedAt } = saved
  if (!fresh(savedAt)) return null
  if (state.status !== 'active' || state.idx >= state.queue.length) return null
  if (!matchesMeta(state.kind, state.meta, request)) return null
  // A daily challenge from yesterday must not count for today.
  if (state.kind === 'daily' && state.meta.date !== todayStr()) return null
  const questions = new Map<string, Question>()
  for (const item of state.queue) {
    const q = questions.get(item.id) ?? findQuestion(item.id, b)
    if (!q || !validOrder(q, item.order)) return null
    questions.set(q.id, q)
  }
  return buildSession(request, state, questions)
}
