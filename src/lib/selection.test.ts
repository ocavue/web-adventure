import { describe, expect, it } from 'vitest'

import { MODULES } from './constants.ts'
import { lkey } from './progress.ts'
import {
  banksFor,
  dailySet,
  jumpSet,
  lessonSet,
  parsePlayParams,
  playAllowed,
  playHref,
  practiceSet,
  questionsFor,
  reviewSet,
  type Banks,
  type PlayRequest,
} from './selection.ts'
import { freshState } from './store.ts'
import type { BankFile, ModuleId, Question, State } from './types.ts'

const files = import.meta.glob<BankFile>('../questions/*.json', { eager: true, import: 'default' })

function loadBanks(mods: ModuleId[] = MODULES.map((m) => m.id)): Banks {
  const out: Banks = {}
  for (const mod of mods) {
    const all = files[`../questions/${mod}.json`].questions.map((q): Question => ({
      ...q,
      module: mod,
    }))
    out[mod] = { all, byLevel: [1, 2, 3, 4, 5].map((l) => all.filter((q) => q.level === l)) }
  }
  return out
}

const all = loadBanks()

function stateWith(recipe: (s: State) => void): State {
  const s = freshState()
  recipe(s)
  return s
}

const ids = (qs: Question[]) => qs.map((q) => q.id)

describe('lessonSet', () => {
  it('splits a level into consecutive lessons in file order', () => {
    const level = all.css?.byLevel[1] ?? []
    const lessons = [0, 1, 2].map((i) => lessonSet('css', 2, i, all))
    expect(lessons.flat()).toEqual(level)
    for (const lesson of lessons) expect(lesson).toHaveLength(8)
  })

  it('is empty when the bank is not loaded or the level does not exist', () => {
    expect(lessonSet('css', 1, 0, {})).toEqual([])
    expect(lessonSet('css', 9, 0, all)).toEqual([])
  })
})

describe('jumpSet', () => {
  it('takes ten questions from the lower levels, without fill questions, sorted by level', () => {
    const qs = jumpSet('js', 4, freshState(), all)
    expect(qs).toHaveLength(10)
    expect(new Set(ids(qs)).size).toBe(10)
    expect(qs.every((q) => q.type !== 'fill')).toBe(true)
    expect(new Set(qs.map((q) => q.level))).toEqual(new Set([1, 2, 3]))
    expect(qs.map((q) => q.level)).toEqual(qs.map((q) => q.level).sort())
  })

  it('prefers questions the player has not seen', () => {
    const candidates = (all.html?.byLevel[0] ?? []).filter((q) => q.type !== 'fill')
    const unseen = candidates.slice(0, 10)
    const s = stateWith((st) => {
      for (const q of candidates.slice(10)) st.seen[q.id] = { c: 1, w: 0 }
    })
    expect(new Set(ids(jumpSet('html', 2, s, all)))).toEqual(new Set(ids(unseen)))
  })

  it('stops when the lower levels run out of questions', () => {
    const tiny = all.html?.byLevel[0].filter((q) => q.type !== 'fill').slice(0, 3) ?? []
    const b: Banks = { html: { all: tiny, byLevel: [tiny] } }
    expect(jumpSet('html', 2, freshState(), b)).toHaveLength(3)
  })

  it('is empty for level 1', () => {
    expect(jumpSet('html', 1, freshState(), all)).toEqual([])
  })
})

describe('practiceSet', () => {
  it('takes eight different questions from the level', () => {
    const qs = practiceSet('git', 3, all)
    expect(qs).toHaveLength(8)
    expect(new Set(ids(qs)).size).toBe(8)
    expect(qs.every((q) => q.module === 'git' && q.level === 3)).toBe(true)
  })
})

describe('dailySet', () => {
  it('picks the same five questions all day, and others the next day', () => {
    const s = freshState()
    const today = dailySet('2026-10-30', s, all)
    expect(today).toHaveLength(5)
    expect(ids(dailySet('2026-10-30', s, all))).toEqual(ids(today))
    expect(ids(dailySet('2026-10-31', s, all))).not.toEqual(ids(today))
  })

  it('favors level 1 for a new player', () => {
    expect(dailySet('2026-10-30', freshState(), all).every((q) => q.level === 1)).toBe(true)
  })

  it('favors the trails the player started, at the level reached and the one below', () => {
    const s = stateWith((st) => {
      for (const level of [1, 2]) {
        for (const i of [0, 1, 2]) st.lessons[lkey('ts', level, i)] = { stars: 3, at: 1 }
      }
    })
    for (const date of ['2026-10-01', '2026-10-02', '2026-10-03']) {
      const qs = dailySet(date, s, all)
      expect(qs.every((q) => q.module === 'ts' && (q.level === 2 || q.level === 3))).toBe(true)
    }
  })

  it('uses every trail when the started ones have too few questions', () => {
    const s = stateWith((st) => {
      st.lessons[lkey('git', 1, 0)] = { stars: 3, at: 1 }
    })
    const qs = dailySet('2026-10-30', s, loadBanks(['html']))
    expect(qs).toHaveLength(5)
    expect(qs.every((q) => q.module === 'html')).toBe(true)
  })
})

describe('reviewSet', () => {
  it('takes up to eight missed questions and skips ones that no longer exist', () => {
    const missed = (all.react?.all ?? []).slice(0, 10)
    const s = stateWith((st) => {
      for (const q of missed) st.seen[q.id] = { c: 0, w: 1, miss: true }
      st.seen['react-999'] = { c: 0, w: 1, miss: true }
      st.seen['nope-001'] = { c: 0, w: 1, miss: true }
      st.seen['html-001'] = { c: 1, w: 1, miss: false }
    })
    const qs = reviewSet(s, all)
    expect(qs).toHaveLength(8)
    expect(ids(qs).every((id) => ids(missed).includes(id))).toBe(true)
  })

  it('is empty with no mistakes', () => {
    expect(reviewSet(freshState(), all)).toEqual([])
  })
})

describe('parsePlayParams', () => {
  const parse = (query: string) => parsePlayParams(new URLSearchParams(query))

  it('reads every mode', () => {
    expect(parse('mode=lesson&mod=js&level=1&lesson=0')).toEqual({
      mode: 'lesson',
      mod: 'js',
      level: 1,
      lesson: 0,
    })
    expect(parse('mode=jump&mod=css&level=5')).toEqual({ mode: 'jump', mod: 'css', level: 5 })
    expect(parse('mode=practice&mod=git&level=3')).toEqual({
      mode: 'practice',
      mod: 'git',
      level: 3,
    })
    expect(parse('mode=daily')).toEqual({ mode: 'daily' })
    expect(parse('mode=review&utm_source=x')).toEqual({ mode: 'review' })
  })

  it('rejects anything else', () => {
    for (const query of [
      '',
      'mode=quiz',
      'mod=js&level=1&lesson=0',
      'mode=lesson&mod=js&level=1',
      'mode=lesson&mod=php&level=1&lesson=0',
      'mode=lesson&mod=js&level=0&lesson=0',
      'mode=lesson&mod=js&level=6&lesson=0',
      'mode=lesson&mod=js&level=1&lesson=3',
      'mode=lesson&mod=js&level=1.5&lesson=0',
      'mode=lesson&mod=js&level=%201&lesson=0',
      'mode=lesson&mod=js&level=-1&lesson=0',
      'mode=jump&mod=js&level=1',
      'mode=practice&mod=js',
    ]) {
      expect(parse(query), query).toBeNull()
    }
  })
})

describe('playHref', () => {
  it('builds a URL that parses back to the same request', () => {
    const requests: PlayRequest[] = [
      { mode: 'lesson', mod: 'web', level: 2, lesson: 1 },
      { mode: 'jump', mod: 'ts', level: 3 },
      { mode: 'practice', mod: 'html', level: 4 },
      { mode: 'daily' },
      { mode: 'review' },
    ]
    for (const req of requests) {
      const url = new URL(playHref(req), 'https://example.com')
      expect(url.pathname).toBe('/play/')
      expect(parsePlayParams(url.searchParams)).toEqual(req)
    }
    expect(playHref({ mode: 'lesson', mod: 'js', level: 1, lesson: 0 })).toBe(
      '/play/?mode=lesson&mod=js&level=1&lesson=0',
    )
  })
})

describe('banksFor', () => {
  it('needs one bank for a trail, every bank for the daily, and the missed trails for review', () => {
    const s = freshState()
    expect(banksFor({ mode: 'practice', mod: 'css', level: 1 }, s)).toEqual(['css'])
    expect(banksFor({ mode: 'daily' }, s)).toHaveLength(MODULES.length)
    expect(banksFor({ mode: 'review' }, s)).toEqual([])
    const missed = stateWith((st) => {
      st.seen['js-001'] = { c: 0, w: 1, miss: true }
      st.seen['git-002'] = { c: 0, w: 1, miss: true }
      st.seen['js-003'] = { c: 0, w: 1, miss: true }
      st.seen['css-004'] = { c: 1, w: 1 }
    })
    expect(banksFor({ mode: 'review' }, missed).toSorted()).toEqual(['git', 'js'])
  })
})

describe('playAllowed', () => {
  const done = (st: State, mod: ModuleId, level: number, lessons: number) => {
    for (let i = 0; i < lessons; i++) st.lessons[lkey(mod, level, i)] = { stars: 2, at: 1 }
  }

  it('opens a lesson only after the one before it, and replays finished lessons', () => {
    const s = stateWith((st) => done(st, 'js', 1, 1))
    expect(playAllowed({ mode: 'lesson', mod: 'js', level: 1, lesson: 0 }, s)).toBe(true)
    expect(playAllowed({ mode: 'lesson', mod: 'js', level: 1, lesson: 1 }, s)).toBe(true)
    expect(playAllowed({ mode: 'lesson', mod: 'js', level: 1, lesson: 2 }, s)).toBe(false)
    expect(playAllowed({ mode: 'lesson', mod: 'js', level: 2, lesson: 0 }, s)).toBe(false)
  })

  it('opens practice only for a finished level', () => {
    const s = stateWith((st) => done(st, 'js', 1, 3))
    expect(playAllowed({ mode: 'practice', mod: 'js', level: 1 }, s)).toBe(true)
    expect(playAllowed({ mode: 'practice', mod: 'js', level: 2 }, s)).toBe(false)
  })

  it('offers a jump test only for a level that is still locked', () => {
    const s = stateWith((st) => {
      done(st, 'js', 1, 3)
      st.jumps.css = 3
    })
    expect(playAllowed({ mode: 'jump', mod: 'js', level: 2 }, s)).toBe(false)
    expect(playAllowed({ mode: 'jump', mod: 'js', level: 3 }, s)).toBe(true)
    expect(playAllowed({ mode: 'jump', mod: 'css', level: 3 }, s)).toBe(false)
    expect(playAllowed({ mode: 'jump', mod: 'css', level: 4 }, s)).toBe(true)
  })

  it('always opens the daily challenge and review', () => {
    expect(playAllowed({ mode: 'daily' }, freshState())).toBe(true)
    expect(playAllowed({ mode: 'review' }, freshState())).toBe(true)
  })
})

describe('questionsFor', () => {
  it('picks the questions of each mode', () => {
    const s = freshState()
    expect(questionsFor({ mode: 'lesson', mod: 'js', level: 1, lesson: 2 }, s, all)).toEqual(
      lessonSet('js', 1, 2, all),
    )
    expect(questionsFor({ mode: 'jump', mod: 'js', level: 3 }, s, all)).toHaveLength(10)
    expect(questionsFor({ mode: 'practice', mod: 'js', level: 3 }, s, all)).toHaveLength(8)
    expect(questionsFor({ mode: 'daily' }, s, all)).toHaveLength(5)
    expect(questionsFor({ mode: 'review' }, s, all)).toEqual([])
  })
})
