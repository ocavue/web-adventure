import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { createSession } from '../../lib/lesson.ts'
import { lkey } from '../../lib/progress.ts'
import { freshState, progress, replaceProgress } from '../../lib/store.ts'
import type { ServedBank, State } from '../../lib/types.ts'
import { todayStr } from '../../lib/utils.ts'

import type { TrailLevels } from './navigation.ts'
import { PlayApp } from './PlayApp.tsx'

const levels = {} as TrailLevels

function emptyBank(url: string): ServedBank {
  const mod = /questions\/(\w+)\.json/.exec(url)?.[1] as ServedBank['module']
  const level = { title: 'Level', blurb: 'Blurb' }
  return { module: mod, levels: [level, level, level, level, level], questions: [] }
}

function visit(search: string): void {
  history.replaceState(null, '', `/play${search}`)
}

function stubFetch() {
  const fetch = vi.fn((url: string) => Promise.resolve(Response.json(emptyBank(url))))
  vi.stubGlobal('fetch', fetch)
  return fetch
}

function setProgress(recipe: (s: State) => void): void {
  const s = freshState()
  recipe(s)
  replaceProgress(s)
}

describe('PlayApp', () => {
  beforeEach(() => {
    sessionStorage.clear()
    replaceProgress(freshState())
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('explains a broken link', async () => {
    visit('?mode=lesson&mod=html&level=9&lesson=0')
    render(<PlayApp levels={levels} />)
    expect(await screen.findByRole('heading', { name: 'This lesson link is broken' })).toBeTruthy()
  })

  it('offers a retry when the questions do not load', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError('offline'))
    fetch.mockImplementation((url: string) => Promise.resolve(Response.json(emptyBank(url))))
    vi.stubGlobal('fetch', fetch)
    setProgress((st) => {
      for (const i of [0, 1, 2]) st.lessons[lkey('git', 1, i)] = { stars: 2, at: 1 }
    })
    visit('?mode=practice&mod=git&level=1')
    render(<PlayApp levels={levels} />)
    await screen.findByRole('heading', { name: 'The trail map did not load' })

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'No questions here yet' })).toBeTruthy()
  })

  it('says so when there is nothing to review', async () => {
    vi.stubGlobal('fetch', (url: string) => Promise.resolve(Response.json(emptyBank(url))))
    visit('?mode=review')
    render(<PlayApp levels={levels} />)
    expect(await screen.findByRole('heading', { name: 'Nothing to review' })).toBeTruthy()
  })

  it('shows a locked screen for a lesson that is not open yet', async () => {
    const fetch = stubFetch()
    visit('?mode=lesson&mod=css&level=2&lesson=0')
    render(<PlayApp levels={levels} />)
    expect(await screen.findByRole('heading', { name: 'This lesson is still locked' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to the trail' }).getAttribute('href')).toBe(
      '/trail/css',
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('locks practice before the level is done, and a jump test once the level is open', async () => {
    stubFetch()
    visit('?mode=practice&mod=css&level=1')
    render(<PlayApp levels={levels} />)
    await screen.findByRole('heading', { name: 'Practice opens after level 1' })
    cleanup()

    setProgress((st) => {
      for (const i of [0, 1, 2]) st.lessons[lkey('css', 1, i)] = { stars: 2, at: 1 }
    })
    visit('?mode=jump&mod=css&level=2')
    render(<PlayApp levels={levels} />)
    expect(await screen.findByRole('heading', { name: 'Level 2 is already open' })).toBeTruthy()
  })

  it('plays the daily challenge once a day', async () => {
    const fetch = stubFetch()
    setProgress((st) => {
      st.challenges[todayStr()] = 3
    })
    visit('?mode=daily')
    render(<PlayApp levels={levels} />)
    expect(await screen.findByRole('heading', { name: 'Done for today!' })).toBeTruthy()
    expect(screen.getByText(/You got 3 of 5/)).toBeTruthy()
    expect(progress.value.challenges[todayStr()]).toBe(3)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('shows the same results again after a reload, but starts anew from a link', async () => {
    stubFetch()
    const request = { mode: 'lesson', mod: 'web', level: 1, lesson: 0 } as const
    const question = {
      id: 'web-999',
      module: 'web',
      level: 1,
      topic: 'Topic',
      prompt: 'Prompt',
      hint: 'Hint',
      explain: 'Explain',
      type: 'tf',
      answer: true,
    } as const
    const session = createSession(request, [question])
    session.select(true)
    session.check()
    session.next()
    visit('?mode=lesson&mod=web&level=1&lesson=0')
    render(<PlayApp levels={levels} navigationType="reload" />)
    expect(await screen.findByRole('heading', { name: 'Perfect lesson!' })).toBeTruthy()
    cleanup()

    render(<PlayApp levels={levels} navigationType="back_forward" />)
    expect(await screen.findByRole('heading', { name: 'Perfect lesson!' })).toBeTruthy()
    cleanup()

    render(<PlayApp levels={levels} navigationType="navigate" />)
    expect(await screen.findByRole('heading', { name: 'No questions here yet' })).toBeTruthy()
  })

  it('loads only the banks of the trails with mistakes for a review', async () => {
    const fetch = stubFetch()
    setProgress((st) => {
      st.seen['react-001'] = { c: 0, w: 1, miss: true }
      st.seen['react-002'] = { c: 0, w: 1, miss: true }
    })
    visit('?mode=review')
    render(<PlayApp levels={levels} />)
    await screen.findByRole('heading', { name: 'Nothing to review' })
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['/questions/react.json'])
  })
})
