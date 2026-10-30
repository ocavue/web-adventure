import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  combineStates,
  CORRUPT_KEY,
  freshState,
  loadProgress,
  parseState,
  progress,
  progressReady,
  STORE_KEY,
  updateProgress,
} from './store.ts'

function parse(data: Record<string, unknown>) {
  return parseState(JSON.stringify({ v: 1, ...data }))
}

describe('combineStates', () => {
  it('keeps everything earned in either state', () => {
    const a = freshState()
    a.updatedAt = 1
    a.xp = 120
    a.lessons = { 'html:1:0': { stars: 2, at: 10 } }
    a.badges = { first: 50 }
    a.seen = { 'html-001': { c: 1, w: 0 } }
    a.stats.answered = 30

    const b = freshState()
    b.updatedAt = 2
    b.name = 'Mia'
    b.xp = 90
    b.lessons = { 'html:1:0': { stars: 3, at: 5 }, 'css:1:0': { stars: 1, at: 20 } }
    b.badges = { first: 40, daily: 60 }
    b.seen = { 'html-001': { c: 2, w: 1, miss: true } }
    b.stats.answered = 12

    const out = combineStates(a, b)
    expect(out.name).toBe('Mia')
    expect(out.xp).toBe(120)
    expect(out.lessons).toEqual({
      'html:1:0': { stars: 3, at: 10 },
      'css:1:0': { stars: 1, at: 20 },
    })
    expect(out.badges).toEqual({ first: 40, daily: 60 })
    expect(out.seen['html-001']).toEqual({ c: 2, w: 1, miss: true })
    expect(out.stats.answered).toBe(30)
    expect(out.updatedAt).toBe(2)
  })

  it('keeps the newer streak and the best streak of both', () => {
    const a = freshState()
    a.streak = { count: 9, best: 9, last: '2026-10-01' }
    const b = freshState()
    b.streak = { count: 2, best: 4, last: '2026-10-20' }
    expect(combineStates(a, b).streak).toEqual({ count: 2, best: 9, last: '2026-10-20' })
  })
})

describe('parseState', () => {
  it('fills in missing fields', () => {
    const s = parseState(JSON.stringify({ v: 1, xp: 42, settings: { sound: false } }))
    expect(s?.xp).toBe(42)
    expect(s?.settings).toEqual({ sound: false, calm: false, theme: 'system' })
    expect(s?.lessons).toEqual({})
  })

  it('rejects files that are not a progress backup', () => {
    expect(parseState('not json')).toBeNull()
    expect(parseState('[]')).toBeNull()
    expect(parseState('null')).toBeNull()
    expect(parseState(JSON.stringify({ xp: 10 }))).toBeNull()
    expect(parseState(JSON.stringify({ v: 2, xp: 10 }))).toBeNull()
  })

  it('keeps the other fields when one field is invalid', () => {
    const s = parse({ xp: 'lots', lessons: { 'html:1:0': { stars: 3, at: 5 } }, onboarded: 1 })
    expect(s?.xp).toBe(0)
    expect(s?.onboarded).toBe(false)
    expect(s?.lessons).toEqual({ 'html:1:0': { stars: 3, at: 5 } })
  })

  it('drops only the invalid entries of a record', () => {
    const s = parse({
      lessons: { 'html:1:0': { stars: 2, at: 1 }, 'html:1:1': { stars: 'x' }, 'html:1:2': null },
      seen: { 'html-001': { c: 1, w: 2, miss: true }, 'html-002': 'oops' },
      badges: { first: 10, bad: 'x' },
      week: { '2026-10-30': 40, '2026-10-29': null },
    })
    expect(s?.lessons).toEqual({ 'html:1:0': { stars: 2, at: 1 } })
    expect(s?.seen).toEqual({ 'html-001': { c: 1, w: 2, miss: true } })
    expect(s?.badges).toEqual({ first: 10 })
    expect(s?.week).toEqual({ '2026-10-30': 40 })
  })

  it('replaces records and objects of the wrong type with defaults', () => {
    const s = parse({
      lessons: 'none',
      streak: 7,
      settings: [],
      stats: { answered: 'x', correct: 4 },
    })
    expect(s?.lessons).toEqual({})
    expect(s?.streak).toEqual({ count: 0, best: 0, last: '' })
    expect(s?.settings).toEqual({ sound: true, calm: false, theme: 'system' })
    expect(s?.stats.answered).toBe(0)
    expect(s?.stats.correct).toBe(4)
  })

  it('truncates a long name', () => {
    expect(parse({ name: 'A'.repeat(30) })?.name).toBe('A'.repeat(24))
  })

  it('clamps negative counters to 0', () => {
    const s = parse({ xp: -5, streak: { count: -1, best: 3, last: '2026-10-30' }, freezes: -2 })
    expect(s?.xp).toBe(0)
    expect(s?.streak).toEqual({ count: 0, best: 3, last: '2026-10-30' })
    expect(s?.freezes).toBe(0)
  })

  it('turns null optional fields into undefined', () => {
    const s = parse({ freezes: null, usedFreeze: null, dailySeen: null })
    expect(s?.freezes).toBeUndefined()
    expect(s?.usedFreeze).toBeUndefined()
    expect(s?.dailySeen).toBeUndefined()
  })

  it('reads the old `auto` theme as `system`', () => {
    expect(parse({ settings: { theme: 'auto', sound: false } })?.settings).toEqual({
      sound: false,
      calm: false,
      theme: 'system',
    })
    expect(parse({ settings: { theme: 'neon' } })?.settings.theme).toBe('system')
  })

  it('accepts numeric strings and falls back for other values', () => {
    expect(parse({ goal: '80' })?.goal).toBe(80)
    expect(parse({ goal: '120', xp: '42' })?.xp).toBe(42)
    expect(parse({ goal: 'big' })?.goal).toBe(80)
    expect(parse({ goal: 0 })?.goal).toBe(80)
  })

  it('gives every fresh state its own records', () => {
    const a = freshState()
    a.lessons['html:1:0'] = { stars: 1, at: 1 }
    expect(freshState().lessons).toEqual({})
  })
})

describe('loadProgress', () => {
  let items: Map<string, string>
  let window: EventTarget

  beforeEach(() => {
    items = new Map()
    window = new EventTarget()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => items.set(key, value),
    })
    vi.stubGlobal('addEventListener', window.addEventListener.bind(window))
    progress.value = freshState()
    progressReady.value = false
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps a copy of stored progress that it cannot read', () => {
    items.set(STORE_KEY, '{"v":1,"xp":')
    loadProgress()
    updateProgress((d) => {
      d.xp = 10
    })
    expect(items.get(CORRUPT_KEY)).toBe('{"v":1,"xp":')
    expect(parseState(items.get(STORE_KEY) ?? '')?.xp).toBe(10)
  })

  it('reads the storage again when the page comes back from the back/forward cache', () => {
    const stored = freshState()
    stored.xp = 10
    items.set(STORE_KEY, JSON.stringify(stored))
    loadProgress()
    expect(progress.value.xp).toBe(10)

    // Another page saves more progress while this one sits in the cache.
    stored.xp = 50
    items.set(STORE_KEY, JSON.stringify(stored))
    window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: false }))
    expect(progress.value.xp).toBe(10)
    window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }))
    expect(progress.value.xp).toBe(50)
  })
})
