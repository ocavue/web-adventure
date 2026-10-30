import { cleanup, render, screen, within } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { banks } from '../../lib/bank.ts'
import { freshState, progressReady, replaceProgress } from '../../lib/store.ts'
import type { Question, State } from '../../lib/types.ts'
import { todayStr } from '../../lib/utils.ts'

import { Profile } from './Profile.tsx'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return todayStr(d)
}

function question(id: string, topic: string): Question {
  return {
    id,
    module: id.startsWith('js-') ? 'js' : 'css',
    level: 1,
    topic,
    prompt: 'Prompt',
    hint: 'Hint',
    explain: 'Explain',
    type: 'tf',
    answer: true,
  }
}

function setup(recipe: (s: State) => void) {
  const s = freshState()
  recipe(s)
  replaceProgress(s)
  render(<Profile />)
}

describe('Profile', () => {
  beforeEach(() => {
    progressReady.value = true
  })

  afterEach(() => {
    cleanup()
    banks.value = {}
    replaceProgress(freshState())
  })

  it('lists the XP of the last 7 days for screen readers, with the goal days marked', () => {
    setup((s) => {
      s.goal = 50
      s.week = { [daysAgo(0)]: 60, [daysAgo(2)]: 20, [daysAgo(9)]: 300 }
    })
    const list = screen.getByRole('list', { name: 'XP earned each of the last 7 days' })
    const items = within(list)
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(items).toHaveLength(7)
    expect(items[6]).toMatch(/: 60 XP, goal met$/)
    expect(items[4]).toMatch(/: 20 XP$/)
    expect(items.filter((t) => t?.endsWith(': 0 XP'))).toHaveLength(5)
  })

  it('shows the accuracy of each trail from its answers only', () => {
    setup((s) => {
      s.seen = {
        'css-001': { c: 3, w: 1 },
        'css-002': { c: 0, w: 0 },
        'js-001': { c: 1, w: 2 },
      }
    })
    const rows = screen.getAllByRole('listitem').filter((li) => li.textContent?.includes('/15'))
    const text = (name: string) => rows.find((r) => r.textContent?.includes(name))?.textContent
    expect(text('CSS')).toContain('75% accuracy')
    expect(text('JavaScript')).toContain('33% accuracy')
    expect(text('HTML')).not.toContain('accuracy')
  })

  it('groups missed questions by trail and topic, most missed first', () => {
    banks.value = {
      js: {
        byLevel: [],
        all: [
          question('js-001', 'Arrays'),
          question('js-002', 'Arrays'),
          question('js-003', 'Loops'),
        ],
      },
      css: { byLevel: [], all: [question('css-001', 'Arrays')] },
    }
    setup((s) => {
      s.seen = {
        'js-001': { c: 0, w: 1, miss: true },
        'js-002': { c: 0, w: 1, miss: true },
        'js-003': { c: 1, w: 0 },
        'css-001': { c: 0, w: 1, miss: true },
        'js-999': { c: 0, w: 1, miss: true },
      }
    })
    const section = screen.getByRole('region', { name: 'Topics to grow' })
    const tags = within(section)
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(tags).toEqual(['JavaScript · Arrays 2 missed', 'CSS · Arrays 1 missed'])
    expect(within(section).getByRole('link', { name: 'Practice these' }).getAttribute('href')).toBe(
      '/play?mode=review',
    )
  })

  it('hides the topics when nothing was missed', () => {
    setup((s) => {
      s.seen = { 'js-001': { c: 1, w: 0 } }
    })
    expect(screen.queryByRole('region', { name: 'Topics to grow' })).toBeNull()
  })
})
