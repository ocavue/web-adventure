import { describe, expect, it } from 'vitest'

import { lkey } from '../../lib/progress.ts'
import { freshState } from '../../lib/store.ts'
import type { State } from '../../lib/types.ts'
import { todayStr } from '../../lib/utils.ts'

import { buddyLine, continueTarget, greeting, trailStatus } from './rules.ts'

const TIP = 'tip'

function stateWith(recipe: (s: State) => void): State {
  const s = freshState()
  recipe(s)
  return s
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return todayStr(d)
}

function started(s: State) {
  s.lessons[lkey('html', 1, 0)] = { stars: 3, at: 1 }
}

describe('greeting', () => {
  it('follows the time of day', () => {
    const at = (h: number) => greeting(new Date(2026, 0, 1, h))
    expect([at(2), at(9), at(14), at(21)]).toEqual([
      'Still up',
      'Good morning',
      'Good afternoon',
      'Good evening',
    ])
  })
})

describe('buddyLine', () => {
  it('welcomes a new player', () => {
    expect(buddyLine(freshState(), TIP)).toMatch(/^Pick any trail/)
  })

  it('celebrates the daily goal before anything else', () => {
    const s = stateWith((s) => {
      started(s)
      s.daily = { date: todayStr(), xp: s.goal }
      s.streak = { count: 4, best: 4, last: todayStr() }
      s.usedFreeze = todayStr()
    })
    expect(buddyLine(s, TIP)).toBe(
      'Daily goal done! You are on a 4-day streak. Anything more is a bonus.',
    )
  })

  it('mentions a freeze used today', () => {
    const s = stateWith((s) => {
      started(s)
      s.streak = { count: 6, best: 6, last: todayStr() }
      s.usedFreeze = todayStr()
    })
    expect(buddyLine(s, TIP)).toMatch(/^A streak freeze saved your 6-day streak/)
  })

  it('cheers a running streak', () => {
    const s = stateWith((s) => {
      started(s)
      s.streak = { count: 3, best: 3, last: daysAgo(1) }
    })
    expect(buddyLine(s, TIP)).toMatch(/^3 days in a row!/)
  })

  it('asks to beat the best streak after a broken one', () => {
    const s = stateWith((s) => {
      started(s)
      s.streak = { count: 5, best: 5, last: daysAgo(4) }
    })
    expect(buddyLine(s, TIP)).toMatch(/Your best so far is 5 days/)
  })

  it('falls back to the tip', () => {
    const s = stateWith((s) => {
      started(s)
      s.streak = { count: 1, best: 1, last: todayStr() }
    })
    expect(buddyLine(s, TIP)).toBe(TIP)
  })
})

describe('continueTarget', () => {
  it('starts a new player on the first trail', () => {
    expect(continueTarget(freshState())).toEqual({ mod: 'html', level: 1, lesson: 0 })
  })

  it('continues the trail played last', () => {
    const s = stateWith((s) => {
      s.lessons[lkey('html', 1, 0)] = { stars: 3, at: 1 }
      s.lessons[lkey('css', 1, 0)] = { stars: 2, at: 2 }
      s.lessons[lkey('css', 1, 1)] = { stars: 2, at: 3 }
    })
    expect(continueTarget(s)).toEqual({ mod: 'css', level: 1, lesson: 2 })
  })

  it('moves to another trail when the last one is finished', () => {
    const s = stateWith((s) => {
      for (let l = 1; l <= 5; l++)
        for (let i = 0; i < 3; i++) s.lessons[lkey('css', l, i)] = { stars: 3, at: l * 10 + i }
    })
    expect(continueTarget(s)).toEqual({ mod: 'html', level: 1, lesson: 0 })
  })
})

describe('trailStatus', () => {
  const titles = ['One', 'Two', 'Three', 'Four', 'Five']

  it('names the level of the next lesson, or the summit', () => {
    const s = stateWith((s) => {
      for (let i = 0; i < 3; i++) s.lessons[lkey('js', 1, i)] = { stars: 3, at: i }
      for (let l = 1; l <= 5; l++)
        for (let i = 0; i < 3; i++) s.lessons[lkey('git', l, i)] = { stars: 3, at: i }
    })
    expect(trailStatus('js', titles, s)).toBe('Level 2: Two')
    expect(trailStatus('git', titles, s)).toBe('Summit reached!')
  })
})
