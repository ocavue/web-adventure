import { act, cleanup, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { lkey } from '../../lib/progress.ts'
import { freshState, replaceProgress } from '../../lib/store.ts'
import { toasts } from '../../lib/toast.ts'
import type { LevelInfo } from '../../lib/types.ts'

import { TrailMap } from './TrailMap.tsx'

const levels: LevelInfo[] = [1, 2, 3, 4, 5].map((l) => ({
  title: `Title ${l}`,
  blurb: `Blurb ${l}`,
}))

describe('TrailMap', () => {
  beforeEach(() => {
    localStorage.clear()
    replaceProgress(freshState())
  })
  afterEach(() => {
    cleanup()
    toasts.value = []
  })

  it('shows done, current, and locked lessons for the stored progress', async () => {
    const s = freshState()
    s.lessons[lkey('css', 1, 0)] = { stars: 2, at: 1 }
    s.lessons[lkey('css', 1, 1)] = { stars: 3, at: 2 }
    s.lessons[lkey('css', 1, 2)] = { stars: 1, at: 3 }
    s.lessons[lkey('css', 2, 0)] = { stars: 3, at: 4 }
    await act(() => replaceProgress(s))
    render(<TrailMap mod="css" levels={levels} />)

    const lessons = screen.getByRole('list', { name: 'Level 2 lessons' })
    const links = lessons.querySelectorAll('a')
    expect([...links].map((a) => a.getAttribute('aria-label'))).toEqual([
      'Level 2 lesson 1, done, 3 stars',
      'Level 2 lesson 2, start here',
    ])
    expect(links[1].getAttribute('href')).toBe('/play?mode=lesson&mod=css&level=2&lesson=1')
    expect(screen.getByRole('link', { name: 'Practice level 1' }).getAttribute('href')).toBe(
      '/play?mode=practice&mod=css&level=1',
    )
    // Level 3 and up are locked, so they offer a jump test instead of lessons.
    expect(screen.getAllByRole('button', { name: 'Jump here' })).toHaveLength(3)
    expect(screen.queryByText(/Already know some/)).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Level 2 lesson 3, locked' }))
    expect(toasts.value.map((t) => t.content)).toEqual([
      'Finish the lesson before this one to unlock it.',
    ])
  })

  it('explains the jump test and links to it', async () => {
    render(<TrailMap mod="js" levels={levels} />)
    expect(screen.getByText(/Already know some JavaScript/)).toBeTruthy()
    const jumps = screen.getAllByRole('button', { name: 'Jump here' })
    await userEvent.click(jumps[1])
    const dialog = await screen.findByRole('dialog', { name: 'Jump to level 3?' })
    expect(dialog.textContent).toContain('levels 1 to 2')
    const start = screen.getByRole('link', { name: 'Start the test' })
    expect(start.getAttribute('href')).toBe('/play?mode=jump&mod=js&level=3')
    await waitFor(() => expect(document.activeElement).toBe(start))
  })

  it('links to the certificate at the summit', async () => {
    const s = freshState()
    for (let l = 1; l <= 5; l++)
      for (let i = 0; i < 3; i++) s.lessons[lkey('git', l, i)] = { stars: 3, at: i }
    await act(() => replaceProgress(s))
    render(<TrailMap mod="git" levels={levels} />)
    expect(screen.getByRole('heading', { name: 'Summit reached!' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'View certificate' }).getAttribute('href')).toBe(
      '/cert/git',
    )
  })
})
