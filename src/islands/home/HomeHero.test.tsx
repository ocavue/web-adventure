import { act, cleanup, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { MODULES } from '../../lib/constants.ts'
import { lkey } from '../../lib/progress.ts'
import { freshState, replaceProgress } from '../../lib/store.ts'
import type { ModuleId } from '../../lib/types.ts'
import { todayStr } from '../../lib/utils.ts'

import { HomeHero } from './HomeHero.tsx'

const titles = Object.fromEntries(
  MODULES.map((m) => [m.id, ['L1', 'L2', 'L3', 'L4', 'L5']]),
) as Record<ModuleId, string[]>
const questionIds = 'css-001 css-002 html-001'

describe('HomeHero', () => {
  beforeEach(() => {
    localStorage.clear()
    replaceProgress(freshState())
  })
  afterEach(cleanup)

  it('shows how it works and no review to a new player', () => {
    render(<HomeHero titles={titles} questionIds={questionIds} />)
    expect(screen.getByRole('heading', { name: 'How it works' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Review' })).toBeNull()
    expect(screen.getByRole('link', { name: /^Go/ }).getAttribute('href')).toBe(
      '/play/?mode=lesson&mod=html&level=1&lesson=0',
    )
  })

  it('shows the rank, review, and a finished daily challenge to a returning player', async () => {
    const s = freshState()
    s.xp = 420
    s.lessons[lkey('css', 1, 0)] = { stars: 3, at: 1 }
    s.challenges[todayStr()] = 5
    s.seen['css-001'] = { c: 0, w: 1, miss: true }
    // A question that is no longer in any bank does not count.
    s.seen['css-999'] = { c: 0, w: 1, miss: true }
    await act(() => replaceProgress(s))
    render(<HomeHero titles={titles} questionIds={questionIds} />)

    expect(screen.getByRole('heading', { name: 'Bug Spotter' })).toBeTruthy()
    expect(screen.getByText('1 question to lock in. Practice makes them stick.')).toBeTruthy()
    expect(screen.getByRole('link', { name: /^Practice/ }).getAttribute('href')).toBe(
      '/play/?mode=review',
    )
    const daily = screen.getByRole('button', { name: 'Daily challenge done' })
    expect(daily.hasAttribute('disabled')).toBe(true)
    expect(screen.getByText(/^Continue$/i)).toBeTruthy()
  })
})
