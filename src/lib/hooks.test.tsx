import { act } from '@testing-library/preact'
import { hydrate, render } from 'preact'
import type { VNode } from 'preact'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TrailMap } from '../islands/trail/TrailMap.tsx'
import { TrailStats } from '../islands/trail/TrailStats.tsx'

import { lkey } from './progress.ts'
import { freshState, progress, progressReady, STORE_KEY } from './store.ts'
import type { LevelInfo } from './types.ts'

const levels: LevelInfo[] = [1, 2, 3, 4, 5].map((l) => ({ title: `T${l}`, blurb: `B${l}` }))

/** The HTML the server renders: the first render with a fresh state, before any effect runs. */
function serverHtml(vnode: VNode): string {
  const saved = progress.peek()
  progress.value = freshState()
  const box = document.createElement('div')
  render(vnode, box)
  const html = box.innerHTML
  render(null, box)
  progress.value = saved
  return html
}

function island(html: string): HTMLElement {
  const box = document.createElement('div')
  box.innerHTML = html
  document.body.append(box)
  return box
}

function lessonLabels(box: HTMLElement): (string | null)[] {
  return [...box.querySelectorAll('[data-node]')].map((n) => n.getAttribute('aria-label'))
}

describe('useProgressState', () => {
  beforeEach(() => {
    const stored = freshState()
    stored.onboarded = true
    for (let i = 0; i < 3; i++) stored.lessons[lkey('css', 1, i)] = { stars: 3, at: i }
    stored.lessons[lkey('css', 2, 0)] = { stars: 2, at: 9 }
    localStorage.setItem(STORE_KEY, JSON.stringify(stored))
    progress.value = freshState()
    progressReady.value = false
  })

  afterEach(() => {
    document.body.replaceChildren()
    localStorage.clear()
  })

  it('hydrates an island that mounts after the stored progress loaded', async () => {
    const stats = island(serverHtml(<TrailStats mod="css" />))
    const map = island(serverHtml(<TrailMap mod="css" levels={levels} />))
    expect(map.querySelectorAll('section')).toHaveLength(6)
    expect(map.querySelector('[data-pending]')).not.toBeNull()

    // The first island loads the stored progress. The second one hydrates after that.
    await act(() => hydrate(<TrailStats mod="css" />, stats))
    expect(progressReady.value).toBe(true)
    expect(stats.textContent).toContain('4/15 lessons')
    await act(() => hydrate(<TrailMap mod="css" levels={levels} />, map))

    // A client render from scratch is what the hydrated map must look like.
    const expected = document.createElement('div')
    await act(() => render(<TrailMap mod="css" levels={levels} />, expected))
    expect(lessonLabels(map)).toEqual(lessonLabels(expected))
    expect(lessonLabels(map)).toEqual([
      'Level 1 lesson 1, done, 3 stars',
      'Level 1 lesson 2, done, 3 stars',
      'Level 1 lesson 3, done, 3 stars',
      'Level 2 lesson 1, done, 2 stars',
      'Level 2 lesson 2, start here',
      'Level 2 lesson 3, locked',
    ])
    expect(map.querySelectorAll('section')).toHaveLength(6)
    expect(map.querySelector('[data-pending]')).toBeNull()
    expect(stats.querySelector('[data-pending]')).toBeNull()
    await act(() => render(null, expected))
  })
})
