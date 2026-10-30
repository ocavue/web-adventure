import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { LessonResult } from '../../lib/lesson.ts'
import { freshState, replaceProgress } from '../../lib/store.ts'
import css from '../../questions/css.json' with { type: 'json' }
import git from '../../questions/git.json' with { type: 'json' }
import html from '../../questions/html.json' with { type: 'json' }
import js from '../../questions/js.json' with { type: 'json' }
import react from '../../questions/react.json' with { type: 'json' }
import ts from '../../questions/ts.json' with { type: 'json' }
import web from '../../questions/web.json' with { type: 'json' }

import type { TrailLevels } from './navigation.ts'
import { Results } from './Results.tsx'

const levels: TrailLevels = {
  html: html.levels,
  css: css.levels,
  js: js.levels,
  ts: ts.levels,
  web: web.levels,
  react: react.levels,
  git: git.levels,
}

function result(extra: Partial<LessonResult>): LessonResult {
  return {
    kind: 'lesson',
    meta: { mod: 'html', level: 1, lesson: 0 },
    firstOk: 8,
    firstTotal: 8,
    acc: 1,
    secs: 75,
    xp: 95,
    xpBefore: 0,
    bestCombo: 8,
    fixed: 0,
    results: [],
    newBadges: [],
    streak: 1,
    freezeEarned: false,
    ...extra,
  }
}

function title(): string {
  return screen.getByRole('heading', { level: 1 }).textContent
}

describe('Results', () => {
  beforeEach(() => replaceProgress({ ...freshState(), xp: 95 }))
  afterEach(cleanup)

  it('celebrates a 3-star lesson and links to the next lesson', () => {
    render(<Results result={result({ stars: 3 })} levels={levels} />)
    expect(title()).toBe('Perfect lesson!')
    expect(screen.getByRole('img', { name: '3 of 3 stars' })).toBeTruthy()
    expect(screen.getByText('1:15')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Next lesson' }).getAttribute('href')).toBe(
      '/play?mode=lesson&mod=html&level=1&lesson=0',
    )
  })

  it('names the camp and the next level when a level is cleared', () => {
    render(<Results result={result({ stars: 2, campCleared: 1 })} levels={levels} />)
    expect(title()).toBe('Pine Camp reached!')
    expect(screen.getByText(new RegExp(`Next up: ${levels.html[1].title}`))).toBeTruthy()
  })

  it('offers another try after a failed jump test', () => {
    const r = result({
      kind: 'jump',
      meta: { mod: 'css', level: 3 },
      firstOk: 7,
      firstTotal: 10,
      acc: 0.7,
      passed: false,
    })
    render(<Results result={r} levels={levels} />)
    expect(title()).toBe('Almost there! 7/10')
    expect(screen.getByRole('link', { name: 'Try again' }).getAttribute('href')).toBe(
      '/play?mode=jump&mod=css&level=3',
    )
    expect(screen.getByRole('link', { name: 'Back to trail' }).getAttribute('href')).toBe(
      '/trail/css',
    )
  })
})
