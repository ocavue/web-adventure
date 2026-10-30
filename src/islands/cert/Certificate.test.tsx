import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { lkey } from '../../lib/progress.ts'
import { freshState, progressReady, replaceProgress } from '../../lib/store.ts'
import type { State } from '../../lib/types.ts'

import { Certificate } from './Certificate.tsx'

function setup(recipe: (s: State) => void) {
  const s = freshState()
  recipe(s)
  replaceProgress(s)
  render(<Certificate mod="css" questionCount={120} />)
}

function finishLessons(s: State, count: number) {
  for (let n = 0; n < count; n++) {
    const at = new Date(2026, 9, 1 + n, 12).getTime()
    s.lessons[lkey('css', Math.floor(n / 3) + 1, n % 3)] = { stars: n < 5 ? 2 : 3, at }
  }
}

describe('Certificate', () => {
  beforeEach(() => {
    progressReady.value = true
  })

  afterEach(() => {
    cleanup()
    replaceProgress(freshState())
  })

  it('points to the trail while lessons are left', () => {
    setup((s) => finishLessons(s, 14))
    expect(screen.queryByRole('article')).toBeNull()
    expect(screen.getByText(/You have finished 14 so far/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Go to the CSS trail' }).getAttribute('href')).toBe(
      '/trail/css',
    )
  })

  it('shows the certificate with the stars and the date of the last lesson', () => {
    setup((s) => {
      finishLessons(s, 15)
      s.name = 'Ada'
      s.lessons[lkey('html', 1, 0)] = { stars: 3, at: new Date(2026, 11, 25).getTime() }
    })
    const card = screen.getByRole('article', { name: 'CSS certificate' })
    expect(card.textContent).toContain('Ada')
    expect(card.textContent).toContain('answering 120 questions across 5 levels')
    expect(card.textContent).toContain('40 / 45 stars · October 15, 2026')
    expect(screen.getByText(/15 lessons, 120 questions, 40\/45 stars/)).toBeTruthy()
  })
})
