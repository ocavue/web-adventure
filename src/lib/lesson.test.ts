import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { banks } from './bank.ts'
import {
  createSession,
  restoreResult,
  restoreSession,
  savedModules,
  sessionTitle,
  startSession,
  type Session,
  type SessionState,
} from './lesson.ts'
import { lkey } from './progress.ts'
import type { PlayRequest } from './selection.ts'
import { freshState, progress, replaceProgress } from './store.ts'
import type { ModuleId, Question, Selection, State } from './types.ts'

class MemoryStorage {
  private items = new Map<string, string>()
  get length(): number {
    return this.items.size
  }
  clear(): void {
    this.items.clear()
  }
  getItem(key: string): string | null {
    return this.items.get(key) ?? null
  }
  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null
  }
  removeItem(key: string): void {
    this.items.delete(key)
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value)
  }
}

let n = 0
function base(mod: ModuleId) {
  n++
  return {
    id: `${mod}-${String(n).padStart(3, '0')}`,
    module: mod,
    level: 1,
    topic: 'Topic',
    prompt: `Prompt ${n}`,
    hint: 'A hint',
    explain: 'An explanation',
  }
}
const tf = (mod: ModuleId = 'html'): Question => ({ ...base(mod), type: 'tf', answer: true })
function single(mod: ModuleId = 'html'): Question {
  return {
    ...base(mod),
    type: 'single',
    choices: ['a', 'b', 'c', 'd'],
    answer: 2,
  }
}
function multi(mod: ModuleId = 'html'): Question {
  return {
    ...base(mod),
    type: 'multi',
    choices: ['a', 'b', 'c', 'd'],
    answer: [0, 3],
  }
}
function fill(mod: ModuleId = 'html', answer = 'main'): Question {
  return {
    ...base(mod),
    type: 'fill',
    answer: [answer],
  }
}
function many(count: number, make: () => Question = tf): Question[] {
  return Array.from({ length: count }, make)
}

function selectionFor(q: Question, ok: boolean): Selection {
  switch (q.type) {
    case 'tf':
      return ok ? q.answer : !q.answer
    case 'single':
      return ok ? q.answer : (q.answer + 1) % q.choices.length
    case 'multi':
      return ok ? q.answer : [q.answer[0]]
    case 'fill':
      return ok ? q.answer[0] : 'something else'
  }
}

/** Answers the current question and moves on. Returns the XP it earned. */
function answer(session: Session, ok: boolean): number {
  const q = session.current.value?.question
  if (!q) throw new Error('No current question')
  session.select(selectionFor(q, ok))
  const xp = session.check()?.xp ?? 0
  session.next()
  return xp
}

function answerAll(session: Session, pattern: boolean[]): number[] {
  return pattern.map((ok) => answer(session, ok))
}

/** Answers until the session ends, correctly unless `pattern` says otherwise. */
function play(session: Session, pattern: boolean[] = []): void {
  for (let i = 0; session.current.value; i++) answer(session, pattern[i] ?? true)
}

function lessonReq(
  mod: ModuleId = 'html',
  level = 1,
  lesson = 0,
): Extract<PlayRequest, { mode: 'lesson' }> {
  return { mode: 'lesson', mod, level, lesson }
}

function setProgress(recipe: (s: State) => void): void {
  const s = freshState()
  recipe(s)
  replaceProgress(s)
}

/** Every lesson of a trail is done, except the ones listed. */
function doneExcept(s: State, mod: ModuleId, missing: [number, number][]): void {
  for (let level = 1; level <= 5; level++) {
    for (let lesson = 0; lesson < 3; lesson++) {
      if (missing.some(([l, i]) => l === level && i === lesson)) continue
      s.lessons[lkey(mod, level, lesson)] = { stars: 2, at: 1 }
    }
  }
}

function useBank(questions: Question[]): void {
  const byMod: Partial<Record<ModuleId, Question[]>> = {}
  for (const q of questions) (byMod[q.module] ??= []).push(q)
  banks.value = Object.fromEntries(
    Object.entries(byMod).map(([mod, all]) => [mod, { byLevel: [all], all }]),
  )
}

const day = (d: number, h = 12) => new Date(2026, 9, d, h)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(day(30))
  vi.stubGlobal('sessionStorage', new MemoryStorage())
  vi.stubGlobal('localStorage', new MemoryStorage())
  replaceProgress(freshState())
  banks.value = {}
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('answering', () => {
  it('rewards a correct answer and records it', () => {
    const qs = many(4)
    const s = createSession(lessonReq(), qs)
    expect(s.canCheck.value).toBe(false)
    s.select(true)
    expect(s.canCheck.value).toBe(true)
    const last = s.check()
    expect(last).toEqual({ ok: true, xp: 10, caseSlip: false })
    expect(s.canCheck.value).toBe(false)
    expect(s.state.value.answered).toBe(true)
    expect(progress.value.xp).toBe(10)
    expect(progress.value.seen[qs[0].id]).toEqual({ c: 1, w: 0 })
    expect(progress.value.stats.answered).toBe(1)
    expect(progress.value.stats.correct).toBe(1)
    expect(s.progress.value).toBe(0.25)
    expect(s.next()).toBe(false)
    expect(s.current.value?.question).toBe(qs[1])
  })

  it('ignores a check without a selection and a blank fill answer', () => {
    const s = createSession(lessonReq(), [fill()])
    expect(s.check()).toBeNull()
    s.setFill('   ')
    expect(s.check()).toBeNull()
    expect(progress.value.stats.answered).toBe(0)
  })

  it('brings a wrong answer back at the end as a second try worth less XP', () => {
    const qs = many(2)
    const s = createSession(lessonReq(), qs)
    expect(answer(s, false)).toBe(0)
    expect(progress.value.seen[qs[0].id]).toEqual({ c: 0, w: 1, miss: true })
    expect(s.state.value.queue).toHaveLength(3)
    expect(s.progress.value).toBe(0)
    expect(s.remaining.value).toBe(2)
    answer(s, true)
    expect(s.progress.value).toBe(0.5)
    expect(s.current.value).toMatchObject({ question: qs[0], retry: true })
    expect(answer(s, true)).toBe(4)
    expect(s.state.value.fixed).toBe(1)
    expect(progress.value.badges).toHaveProperty('comeback')
    const res = s.result.value
    expect(res?.fixed).toBe(1)
    expect(res?.firstOk).toBe(1)
    expect(res?.firstTotal).toBe(2)
    expect(res?.newBadges).toContain('comeback')
  })

  it('keeps asking until a requeued question is answered', () => {
    const s = createSession(lessonReq(), many(1))
    answerAll(s, [false, false, false])
    expect(s.current.value?.retry).toBe(true)
    answer(s, true)
    expect(s.current.value).toBeNull()
    expect(s.result.value?.results.map((r) => [r.ok, r.first, r.retry])).toEqual([
      [false, true, false],
      [false, false, true],
      [false, false, true],
      [true, false, true],
    ])
  })

  it('does not requeue in jump tests and daily challenges', () => {
    for (const req of [{ mode: 'jump', mod: 'html', level: 2 }, { mode: 'daily' }] as const) {
      const s = createSession(req, many(2))
      answer(s, false)
      expect(s.state.value.queue).toHaveLength(2)
      expect(s.progress.value).toBe(0.5)
    }
  })

  it('adds a combo bonus from the fifth correct answer in a row', () => {
    const s = createSession(lessonReq(), many(8))
    const xp = answerAll(s, [true, true, true, true, true, true, false, true])
    expect(xp.slice(0, 7)).toEqual([10, 10, 10, 10, 12, 12, 0])
    expect(xp[7]).toBe(10)
    expect(s.state.value.bestCombo).toBe(6)
    expect(progress.value.stats.bestCombo).toBe(6)
    expect(progress.value.badges).toHaveProperty('combo5')
  })

  it('gives little XP for questions answered correctly before, except in review', () => {
    const qs = many(2)
    setProgress((st) => {
      for (const q of qs) st.seen[q.id] = { c: 1, w: 0, miss: true }
    })
    const lesson = createSession(lessonReq(), [qs[0]])
    expect(answer(lesson, true)).toBe(2)
    const review = createSession({ mode: 'review' }, [qs[1]])
    expect(answer(review, true)).toBe(10)
  })

  it('reports a fill answer that is wrong only by letter case', () => {
    const s = createSession(lessonReq('js'), [fill('js', 'addEventListener')])
    s.setFill('addeventlistener')
    expect(s.check()).toEqual({ ok: false, xp: 0, caseSlip: true })
  })
})

describe('hints', () => {
  it('lowers the XP of a correct answer after a hint', () => {
    const s = createSession(lessonReq(), many(2))
    expect(s.canHint.value).toBe(true)
    s.showHint()
    expect(s.hintVisible.value).toBe(true)
    expect(s.canHint.value).toBe(false)
    s.showHint()
    expect(progress.value.stats.hints).toBe(1)
    expect(answer(s, true)).toBe(6)
    expect(s.hintVisible.value).toBe(false)
    expect(s.canHint.value).toBe(true)
    expect(answer(s, true)).toBe(10)
  })

  it('cannot open a hint after the answer is checked', () => {
    const s = createSession(lessonReq(), many(1))
    s.select(true)
    s.check()
    expect(s.canHint.value).toBe(false)
    s.showHint()
    expect(s.state.value.hints).toBe(0)
  })
})

describe('keys', () => {
  it('picks choices in display order with 1-4', () => {
    const q = single()
    const s = createSession(lessonReq(), [q])
    const order = s.current.value?.order ?? []
    expect([...order].sort()).toEqual([0, 1, 2, 3])
    expect(s.selectByKey('3')).toBe(true)
    expect(s.state.value.selection).toBe(order[2])
    expect(s.selectByKey('t')).toBe(false)
  })

  it('toggles multi choices', () => {
    const q = multi()
    const s = createSession(lessonReq(), [q])
    const order = s.current.value?.order ?? []
    s.selectByKey(String(order.indexOf(0) + 1))
    s.selectByKey(String(order.indexOf(3) + 1))
    s.selectByKey(String(order.indexOf(1) + 1))
    s.selectByKey(String(order.indexOf(1) + 1))
    expect(s.check()?.ok).toBe(true)
  })

  it('answers true or false with T and F, and opens the hint with H', () => {
    const s = createSession(lessonReq(), [tf()])
    expect(s.selectByKey('F')).toBe(true)
    expect(s.state.value.selection).toBe(false)
    expect(s.selectByKey('t')).toBe(true)
    expect(s.state.value.selection).toBe(true)
    expect(s.selectByKey('h')).toBe(true)
    expect(s.hintVisible.value).toBe(true)
    expect(s.selectByKey('h')).toBe(false)
    expect(s.selectByKey('5')).toBe(false)
    s.check()
    expect(s.selectByKey('f')).toBe(false)
    expect(s.state.value.selection).toBe(true)
  })
})

describe('lesson results', () => {
  it('gives stars by first-try accuracy and a bonus for a new clear', () => {
    const cases: [boolean[], number][] = [
      [[true, true, true, true, true, true, true, true], 3],
      [[true, true, true, true, true, true, false, false], 2],
      [[true, true, true, true, true, false, false, false], 1],
    ]
    for (const [pattern, stars] of cases) {
      replaceProgress(freshState())
      const s = createSession(lessonReq(), many(8))
      play(s, pattern)
      const res = s.result.value
      expect(res?.stars).toBe(stars)
      expect(res?.firstClear).toBe(true)
      expect(res?.xp).toBe(progress.value.xp)
      expect(progress.value.lessons[lkey('html', 1, 0)].stars).toBe(stars)
    }
  })

  it('pays the star bonus only once and keeps the best stars on a replay', () => {
    // Real levels hold three lessons, so the bank holds three lessons' worth of questions.
    const qs = many(24)
    play(createSession(lessonReq(), qs.slice(0, 8)))
    const replay = startSession(lessonReq(), progress.value, {
      html: { byLevel: [qs], all: qs },
    })
    expect(replay?.state.value.meta.replay).toBe(true)
    if (!replay) return
    const xpBefore = progress.value.xp
    play(replay, [false])
    const res = replay.result.value
    expect(res?.firstClear).toBe(false)
    expect(res?.stars).toBe(2)
    // Every question is mastered now, so each correct answer earns the mastered XP and nothing more.
    const correct = res?.results.filter((r) => r.ok).length ?? 0
    expect(res?.xp).toBe(2 * correct)
    expect(progress.value.xp - xpBefore).toBe(res?.xp)
    expect(progress.value.lessons[lkey('html', 1, 0)].stars).toBe(3)
  })

  /** The XP of a perfect first clear of an 8-question lesson that completes nothing. */
  function plainXp(): number {
    replaceProgress(freshState())
    const s = createSession(lessonReq('js', 2, 0), many(8))
    play(s)
    replaceProgress(freshState())
    return s.result.value?.xp ?? 0
  }

  it('pays a camp bonus for the last lesson of a level', () => {
    const plain = plainXp()
    setProgress((st) => {
      st.lessons[lkey('css', 1, 0)] = { stars: 3, at: 1 }
      st.lessons[lkey('css', 1, 1)] = { stars: 3, at: 1 }
    })
    const s = createSession(lessonReq('css', 1, 2), many(8))
    play(s)
    const res = s.result.value
    expect(res?.campCleared).toBe(1)
    expect(res?.summit).toBeUndefined()
    expect(res?.newBadges).toContain('camp')
    expect(res?.xp).toBe(plain + 25)
  })

  it('does not pay the camp bonus again for a replayed lesson', () => {
    setProgress((st) => {
      for (let i = 0; i < 3; i++) st.lessons[lkey('css', 1, i)] = { stars: 1, at: 1 }
    })
    const s = createSession(lessonReq('css', 1, 2), many(8), { replay: true })
    play(s)
    expect(s.result.value?.campCleared).toBeUndefined()
  })

  it('pays a summit bonus for the last lesson of a trail', () => {
    const plain = plainXp()
    setProgress((st) => doneExcept(st, 'git', [[5, 2]]))
    const s = createSession(lessonReq('git', 5, 2), many(8))
    play(s)
    const res = s.result.value
    expect(res?.summit).toBe(true)
    // The top level has no camp bonus, the summit is the reward.
    expect(res?.campCleared).toBeUndefined()
    expect(res?.newBadges).toEqual(expect.arrayContaining(['camp', 'summit']))
    expect(res?.xp).toBe(plain + 100)
  })

  it('awards first and perfect lesson badges', () => {
    const s = createSession(lessonReq(), many(8))
    play(s)
    expect(s.result.value?.newBadges).toEqual(expect.arrayContaining(['first', 'perfect']))
  })

  it('awards nohint from the third lesson, and speedy for three lessons in a day', () => {
    const hinted = createSession(lessonReq('html', 1, 0), many(2))
    hinted.showHint()
    play(hinted)
    play(createSession(lessonReq('html', 1, 1), many(2)))
    expect(progress.value.badges).not.toHaveProperty('nohint')
    expect(progress.value.badges).not.toHaveProperty('speedy')
    const third = createSession(lessonReq('html', 1, 2), many(2))
    play(third)
    expect(third.result.value?.newBadges).toEqual(expect.arrayContaining(['nohint', 'speedy']))
  })

  it('counts lessons per day for speedy', () => {
    setProgress((st) => {
      st.dayLessons = { date: '2026-10-29', n: 2 }
    })
    play(createSession(lessonReq(), many(1)))
    expect(progress.value.dayLessons).toEqual({ date: '2026-10-30', n: 1 })
    expect(progress.value.badges).not.toHaveProperty('speedy')
  })

  it('awards explorer after four different trails', () => {
    setProgress((st) => {
      for (const mod of ['html', 'css', 'js'] as const)
        st.lessons[lkey(mod, 1, 0)] = { stars: 1, at: 1 }
    })
    const s = createSession(lessonReq('git'), many(2))
    play(s)
    expect(s.result.value?.newBadges).toContain('explorer')
  })

  it('awards night owl late in the evening from the third lesson on', () => {
    vi.setSystemTime(day(30, 23))
    setProgress((st) => {
      st.stats.lessons = 2
    })
    const s = createSession(lessonReq(), many(1))
    play(s)
    expect(s.result.value?.newBadges).toContain('owl')
  })
})

describe('jump tests', () => {
  const jumpReq = { mode: 'jump', mod: 'react', level: 3 } as const

  it('gives XP only for questions not mastered yet', () => {
    const qs = many(2, () => tf('react'))
    setProgress((st) => {
      st.seen[qs[1].id] = { c: 2, w: 0 }
    })
    const s = createSession(jumpReq, qs)
    expect(answerAll(s, [true, true])).toEqual([5, 0])
  })

  it('does not mark wrong answers as mistakes', () => {
    const qs = many(1, () => tf('react'))
    play(createSession(jumpReq, qs), [false])
    expect(progress.value.seen[qs[0].id]).toEqual({ c: 0, w: 1 })
  })

  it('opens the level after 8 of 10 correct answers', () => {
    const s = createSession(
      jumpReq,
      many(10, () => tf('react')),
    )
    play(s, [false, false])
    const res = s.result.value
    expect(res?.passed).toBe(true)
    expect(progress.value.jumps.react).toBe(3)
    expect(res?.newBadges).toContain('jumper')
    expect(res?.xp).toBe(8 * 5 + 30)
    expect(progress.value.xp).toBe(res?.xp)
  })

  it('changes nothing after 7 of 10 correct answers', () => {
    const s = createSession(
      jumpReq,
      many(10, () => tf('react')),
    )
    play(s, [false, false, false])
    expect(s.result.value?.passed).toBe(false)
    expect(progress.value.jumps).toEqual({})
    expect(s.result.value?.xp).toBe(7 * 5)
  })

  it('never lowers a level reached before', () => {
    setProgress((st) => {
      st.jumps.react = 5
    })
    play(
      createSession(
        jumpReq,
        many(10, () => tf('react')),
      ),
    )
    expect(progress.value.jumps.react).toBe(5)
  })
})

describe('daily challenges', () => {
  it('pays well the first time each day and little for a repeat', () => {
    const qs = many(2)
    const first = createSession({ mode: 'daily' }, qs)
    expect(answerAll(first, [true, false])).toEqual([20, 0])
    expect(progress.value.dailySeen).toEqual({ date: '2026-10-30', ids: qs.map((q) => q.id) })
    const repeat = createSession({ mode: 'daily' }, qs)
    expect(answerAll(repeat, [true, true])).toEqual([2, 2])
    expect(progress.value.dailySeen?.ids).toHaveLength(2)
    vi.setSystemTime(day(31))
    const tomorrow = createSession({ mode: 'daily' }, qs)
    expect(answer(tomorrow, true)).toBe(20)
    expect(progress.value.dailySeen).toEqual({ date: '2026-10-31', ids: [qs[0].id] })
  })

  it('records the score and keeps only the last 30 days', () => {
    setProgress((st) => {
      for (let d = 1; d <= 30; d++) st.challenges[`2026-09-${String(d).padStart(2, '0')}`] = 5
    })
    const s = createSession({ mode: 'daily' }, many(3))
    play(s, [true, false, true])
    expect(progress.value.challenges['2026-10-30']).toBe(2)
    expect(Object.keys(progress.value.challenges)).toHaveLength(30)
    expect(progress.value.challenges).not.toHaveProperty('2026-09-01')
    expect(s.result.value?.newBadges).toContain('daily')
  })

  it('keeps the best score of the day', () => {
    const qs = many(3)
    play(createSession({ mode: 'daily' }, qs), [true, true, false])
    expect(progress.value.challenges['2026-10-30']).toBe(2)
    play(createSession({ mode: 'daily' }, qs), [false, false, true])
    expect(progress.value.challenges['2026-10-30']).toBe(2)
    play(createSession({ mode: 'daily' }, qs), [true, true, true])
    expect(progress.value.challenges['2026-10-30']).toBe(3)
  })
})

describe('review', () => {
  it('clears fixed mistakes and awards reviewer after ten', () => {
    const qs = many(2)
    setProgress((st) => {
      st.stats.reviewCleared = 8
      for (const q of qs) st.seen[q.id] = { c: 0, w: 1, miss: true }
    })
    const s = createSession({ mode: 'review' }, qs)
    expect(s.current.value?.missedBefore).toBe(true)
    answer(s, true)
    expect(progress.value.seen[qs[0].id].miss).toBe(false)
    expect(progress.value.badges).not.toHaveProperty('reviewer')
    answer(s, true)
    expect(progress.value.stats.reviewCleared).toBe(10)
    expect(s.result.value?.newBadges).toContain('reviewer')
  })

  it('starts nothing when there is nothing to review', () => {
    expect(startSession({ mode: 'review' })).toBeNull()
  })
})

describe('daily goal', () => {
  it('reports the goal reached by an answer', () => {
    setProgress((st) => {
      st.goal = 40
      st.daily = { date: '2026-10-30', xp: 35 }
    })
    const s = createSession({ mode: 'practice', mod: 'html', level: 1 }, many(1))
    play(s)
    expect(s.state.value.goalHit).toBe(true)
    expect(s.result.value?.goalHit).toBe(true)
  })

  it('reports the goal reached by the lesson bonus', () => {
    setProgress((st) => {
      st.goal = 40
      st.daily = { date: '2026-10-30', xp: 25 }
    })
    const s = createSession(lessonReq(), many(1))
    play(s)
    expect(s.state.value.goalHit).toBe(false)
    expect(s.result.value?.goalHit).toBe(true)
  })

  it('does not report a goal reached before the session', () => {
    setProgress((st) => {
      st.goal = 40
      st.daily = { date: '2026-10-30', xp: 50 }
    })
    const s = createSession(lessonReq(), many(1))
    play(s)
    expect(s.result.value?.goalHit).toBeUndefined()
  })
})

describe('streaks', () => {
  it('starts a streak with the first answer of the day', () => {
    const s = createSession(lessonReq(), many(1))
    s.select(false)
    s.check()
    expect(progress.value.streak).toEqual({ count: 1, best: 1, last: '2026-10-30' })
  })

  it('continues from yesterday and awards streak badges', () => {
    setProgress((st) => {
      st.streak = { count: 2, best: 2, last: '2026-10-29' }
    })
    const s = createSession(lessonReq(), many(1))
    play(s)
    expect(s.result.value?.streak).toBe(3)
    expect(s.result.value?.newBadges).toContain('streak3')
  })

  it('uses a freeze to cover one missed day', () => {
    setProgress((st) => {
      st.streak = { count: 4, best: 4, last: '2026-10-28' }
      st.freezes = 1
    })
    const s = createSession(lessonReq(), many(1))
    play(s)
    expect(progress.value.streak.count).toBe(5)
    expect(progress.value.freezes).toBe(0)
    expect(progress.value.usedFreeze).toBe('2026-10-30')
    expect(s.result.value?.freezeEarned).toBe(false)
  })

  it('restarts after a gap with no freeze', () => {
    setProgress((st) => {
      st.streak = { count: 4, best: 4, last: '2026-10-28' }
    })
    play(createSession(lessonReq(), many(1)))
    expect(progress.value.streak).toEqual({ count: 1, best: 4, last: '2026-10-30' })
  })

  it('earns a freeze on every seventh day', () => {
    setProgress((st) => {
      st.streak = { count: 6, best: 6, last: '2026-10-29' }
    })
    const s = createSession(lessonReq(), many(1))
    play(s)
    expect(s.result.value?.freezeEarned).toBe(true)
    expect(s.result.value?.newBadges).toContain('streak7')
  })
})

describe('session lifecycle', () => {
  it('finishes when the last question is passed', () => {
    const s = createSession(lessonReq(), many(1))
    expect(() => s.finish()).toThrow()
    s.select(true)
    s.check()
    expect(s.result.value).toBeNull()
    expect(s.next()).toBe(true)
    const res = s.result.value
    expect(res).not.toBeNull()
    expect(s.finish()).toBe(res)
    expect(s.state.value.status).toBe('finished')
    expect(s.current.value).toBeNull()
    expect(s.next()).toBe(false)
  })

  it('measures the time spent', () => {
    const s = createSession(lessonReq(), many(1))
    vi.setSystemTime(Date.now() + 42_000)
    play(s)
    expect(s.result.value?.secs).toBe(42)
    expect(progress.value.stats.time).toBe(42)
  })

  it('never counts negative time when the clock moves back', () => {
    const s = createSession(lessonReq(), many(1))
    vi.setSystemTime(Date.now() - 60_000)
    play(s)
    expect(s.result.value?.secs).toBe(0)
    expect(progress.value.stats.time).toBe(0)
  })

  it('returns badges earned before quitting, and keeps the progress', () => {
    const s = createSession(lessonReq(), many(8))
    answerAll(s, [true, true, true, true, true])
    expect(s.remaining.value).toBe(3)
    const xp = progress.value.xp
    expect(s.quit()).toEqual(['combo5'])
    expect(s.state.value.status).toBe('quit')
    expect(s.current.value).toBeNull()
    expect(progress.value.xp).toBe(xp)
    expect(progress.value.lessons).toEqual({})
    s.select(true)
    expect(s.check()).toBeNull()
    expect(s.quit()).toEqual([])
  })

  it('records the progress before a session as its starting point', () => {
    setProgress((st) => {
      st.xp = 300
      st.badges = { first: 1 }
    })
    const s = createSession(lessonReq(), many(8))
    play(s)
    expect(s.result.value?.xpBefore).toBe(300)
    expect(s.result.value?.newBadges).not.toContain('first')
  })

  it('names sessions', () => {
    expect(sessionTitle('lesson', { level: 2, lesson: 1 })).toBe('Level 2 · Lesson 2')
    expect(sessionTitle('jump', { level: 4 })).toBe('Jump test: level 4')
    expect(createSession({ mode: 'daily' }, many(1)).title).toBe('Daily challenge')
  })

  it('needs at least one question', () => {
    expect(() => createSession(lessonReq(), [])).toThrow()
  })
})

describe('saving and restoring', () => {
  const req = lessonReq()

  function started(): { session: Session; qs: Question[] } {
    const qs = [single(), multi(), tf(), fill()]
    useBank(qs)
    const session = createSession(req, qs)
    answer(session, false)
    return { session, qs }
  }

  it('resumes a session after a reload, with the picked but unchecked answer', () => {
    const { session } = started()
    session.toggleChoice(1)
    const restored = restoreSession(req)
    expect(restored?.state.value).toEqual(session.state.value)
    expect(restored?.state.value.selection).toEqual([1])
    expect(restored?.current.value).toEqual(session.current.value)
    if (!restored) return
    play(restored)
    expect(restored.result.value?.firstTotal).toBe(4)
    expect(restoreSession(req)).toBeNull()
  })

  it('resumes an answered question with its feedback', () => {
    const { session } = started()
    session.select(true)
    session.check()
    expect(restoreSession(req)?.state.value.last).toEqual(session.state.value.last)
  })

  it('keeps sessions of different URLs apart', () => {
    started()
    expect(restoreSession(lessonReq('html', 1, 1))).toBeNull()
    expect(restoreSession(req)).not.toBeNull()
  })

  it('forgets a session after it is quit', () => {
    const { session } = started()
    session.quit()
    expect(restoreSession(req)).toBeNull()
  })

  it('discards a session saved hours ago', () => {
    started()
    vi.setSystemTime(Date.now() + 7 * 60 * 60 * 1000)
    expect(restoreSession(req)).toBeNull()
  })

  it('discards a session whose questions are gone', () => {
    started()
    useBank([tf()])
    expect(restoreSession(req)).toBeNull()
  })

  it('discards corrupt data', () => {
    const { session } = started()
    const key = 'web-adventure:session:' + session.href
    const good = sessionStorage.getItem(key) ?? ''
    const parsed = JSON.parse(good) as { savedAt: number; state: SessionState }
    const [first, ...rest] = parsed.state.queue
    const broken = [
      'not json',
      '{}',
      JSON.stringify({ ...parsed, state: { ...parsed.state, idx: -1 } }),
      JSON.stringify({ ...parsed, state: { ...parsed.state, idx: 99 } }),
      JSON.stringify({ ...parsed, state: { ...parsed.state, kind: 'daily' } }),
      JSON.stringify({ ...parsed, state: { ...parsed.state, xp: 'lots' } }),
      JSON.stringify({
        ...parsed,
        state: { ...parsed.state, queue: [{ ...first, order: [0, 0, 1, 2] }, ...rest] },
      }),
      JSON.stringify({ ...parsed, savedAt: Date.now() + 60_000 }),
    ]
    for (const raw of broken) {
      sessionStorage.setItem(key, raw)
      expect(restoreSession(req)).toBeNull()
      expect(sessionStorage.getItem(key)).toBeNull()
    }
    sessionStorage.setItem(key, good)
    expect(restoreSession(req)).not.toBeNull()
  })

  it('does not resume a daily challenge from yesterday', () => {
    const qs = many(3)
    useBank(qs)
    vi.setSystemTime(day(29, 23))
    const s = createSession({ mode: 'daily' }, qs)
    answer(s, true)
    expect(restoreSession({ mode: 'daily' })).not.toBeNull()
    vi.setSystemTime(day(30, 0))
    expect(restoreSession({ mode: 'daily' })).toBeNull()
  })

  it('lists the modules of a saved session, so their banks load first', () => {
    const qs = [tf('css'), tf('git'), tf('css')]
    useBank(qs)
    answer(createSession({ mode: 'review' }, qs), true)
    expect(savedModules({ mode: 'review' })).toEqual(['css', 'git'])
    expect(savedModules({ mode: 'daily' })).toEqual([])
  })

  it('keeps the result of a finished session until a new session starts', () => {
    const { session } = started()
    play(session)
    const result = session.result.value
    expect(restoreResult(req)).toEqual(result)
    expect(restoreResult(lessonReq('html', 1, 1))).toBeNull()
    createSession(req, many(1))
    expect(restoreResult(req)).toBeNull()
  })

  it('discards an old or corrupt result', () => {
    const { session } = started()
    play(session)
    const key = 'web-adventure:result:' + session.href
    const good = sessionStorage.getItem(key) ?? ''
    const parsed = JSON.parse(good) as { savedAt: number; result: { kind: string } }
    for (const raw of [
      'not json',
      JSON.stringify({ ...parsed, result: { ...parsed.result, kind: 'daily' } }),
      JSON.stringify({ ...parsed, result: { ...parsed.result, acc: 2 } }),
    ]) {
      sessionStorage.setItem(key, raw)
      expect(restoreResult(req)).toBeNull()
      expect(sessionStorage.getItem(key)).toBeNull()
    }
    sessionStorage.setItem(key, good)
    vi.setSystemTime(Date.now() + 7 * 60 * 60 * 1000)
    expect(restoreResult(req)).toBeNull()
  })

  it('works without storage', () => {
    vi.stubGlobal('sessionStorage', undefined)
    const s = createSession(req, many(1))
    play(s)
    expect(s.result.value).not.toBeNull()
    expect(restoreSession(req)).toBeNull()
  })
})
