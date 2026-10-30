import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { freshState, replaceProgress } from '../../lib/store.ts'
import type { ServedBank } from '../../lib/types.ts'

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
    expect(await screen.findByRole('heading', { name: 'This trail does not exist' })).toBeTruthy()
  })

  it('offers a retry when the questions do not load', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError('offline'))
    fetch.mockImplementation((url: string) => Promise.resolve(Response.json(emptyBank(url))))
    vi.stubGlobal('fetch', fetch)
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
})
