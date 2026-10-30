import { describe, expect, it } from 'vitest'

import { combineStates, freshState, parseState } from './state.ts'

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
    expect(parseState(JSON.stringify({ xp: 10 }))).toBeNull()
  })
})
