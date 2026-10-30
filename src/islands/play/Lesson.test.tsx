import { cleanup, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Toaster } from '../../components/ui/Toaster.tsx'
import { createSession } from '../../lib/lesson.ts'
import type { PlayRequest } from '../../lib/selection.ts'
import { freshState, replaceProgress } from '../../lib/store.ts'
import { showPendingToasts, toasts } from '../../lib/toast.ts'
import type { Question } from '../../lib/types.ts'

import { Lesson } from './Lesson.tsx'

let n = 0
function base() {
  n++
  return {
    id: `html-${String(900 + n)}`,
    module: 'html' as const,
    level: 1,
    topic: 'Topic',
    prompt: `Prompt ${n}`,
    hint: 'A hint',
    explain: 'An explanation',
  }
}
function single(): Question {
  return {
    ...base(),
    type: 'single',
    choices: ['alpha', 'bravo', 'charlie', 'delta'],
    answer: 2,
  }
}
const tf = (): Question => ({ ...base(), type: 'tf', answer: true })

const lesson: PlayRequest = { mode: 'lesson', mod: 'html', level: 1, lesson: 0 }

function setup(questions: Question[]) {
  const session = createSession(lesson, questions)
  const onFinish = vi.fn()
  const onLeave = vi.fn()
  render(<Lesson session={session} onFinish={onFinish} onLeave={onLeave} />)
  return { session, onFinish, onLeave }
}

function prompt(): HTMLElement {
  return screen.getByRole('heading', { level: 1 })
}

async function checkAndContinue(): Promise<void> {
  await userEvent.keyboard('{Enter}')
  await screen.findByRole('button', { name: 'Continue' })
  await userEvent.keyboard('{Enter}')
}

/** Picks the choice whose text is `text`, by its number key. */
async function pressKeyOf(text: string): Promise<void> {
  const radios = screen.getAllByRole('radio')
  const pos = radios.findIndex((r) => r.textContent.includes(text))
  await userEvent.keyboard(String(pos + 1))
}

describe('Lesson', () => {
  beforeEach(() => {
    sessionStorage.clear()
    replaceProgress(freshState())
  })
  afterEach(() => {
    cleanup()
    toasts.value = []
  })

  it('selects choices by number in display order, then Enter checks and continues', async () => {
    setup([single(), tf()])
    const radios = screen.getAllByRole('radio')
    await waitFor(() => expect(document.activeElement).toBe(prompt()))

    await userEvent.keyboard('3')
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual([
      'false',
      'false',
      'true',
      'false',
    ])
    await userEvent.keyboard('1')
    expect(radios[0].getAttribute('aria-checked')).toBe('true')
    expect(radios[2].getAttribute('aria-checked')).toBe('false')

    await userEvent.keyboard('{Enter}')
    const next = await screen.findByRole('button', { name: 'Continue' })
    await waitFor(() => expect(document.activeElement).toBe(next))
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(prompt().textContent).toBe('Prompt 2'))
  })

  it('answers true or false with T and F', async () => {
    setup([tf(), tf()])
    const [yes, no] = screen.getAllByRole('radio')
    await userEvent.keyboard('f')
    expect(no.getAttribute('aria-checked')).toBe('true')
    await userEvent.keyboard('t')
    expect(yes.getAttribute('aria-checked')).toBe('true')
    expect(no.getAttribute('aria-checked')).toBe('false')
    await userEvent.keyboard('{Enter}')
    expect(await screen.findByText('+10 XP')).toBeTruthy()
  })

  it('shows the correct answer after a miss and brings the question back as a second try', async () => {
    const { onFinish } = setup([single(), tf()])
    await pressKeyOf('bravo')
    await userEvent.keyboard('{Enter}')
    expect(await screen.findByText(/Correct answer:/)).toHaveProperty(
      'textContent',
      'Correct answer: charlie',
    )
    expect(screen.queryByText('Second try')).toBeNull()
    await userEvent.keyboard('{Enter}')

    await waitFor(() => expect(prompt().textContent).toBe(`Prompt ${n}`))
    await userEvent.keyboard('t')
    await checkAndContinue()

    await waitFor(() => expect(screen.getByText('Second try')).toBeTruthy())
    await pressKeyOf('charlie')
    await checkAndContinue()
    await waitFor(() => expect(onFinish).toHaveBeenCalledOnce())
  })

  it('leaves at once when nothing is answered yet', async () => {
    const { onLeave } = setup([single()])
    await userEvent.click(screen.getByRole('button', { name: 'Quit lesson' }))
    expect(onLeave).toHaveBeenCalledWith('/trail/html')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('asks before leaving after an answer, and celebrates held-back badges on the next page', async () => {
    replaceProgress({ ...freshState(), stats: { ...freshState().stats, answered: 99 } })
    const { onLeave } = setup([tf(), tf(), tf()])
    await userEvent.keyboard('t')
    await userEvent.keyboard('{Enter}')
    await screen.findByRole('button', { name: 'Continue' })

    await userEvent.click(screen.getByRole('button', { name: 'Quit lesson' }))
    const dialog = await screen.findByRole('dialog', { name: 'Take a break?' })
    expect(dialog.textContent).toContain('only 2 questions left')
    await userEvent.click(screen.getByRole('button', { name: 'Keep going' }))
    await waitFor(() => expect(dialog.matches('[open]')).toBe(false))
    expect(onLeave).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Quit lesson' }))
    await screen.findByRole('dialog', { name: 'Take a break?' })
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }))
    expect(onLeave).toHaveBeenCalledWith('/trail/html')

    // The next page shows the badge that the results screen would have shown.
    cleanup()
    render(<Toaster />)
    showPendingToasts()
    expect(await screen.findByText('Badge earned: Century')).toBeTruthy()
    showPendingToasts()
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(screen.getAllByText('Badge earned: Century')).toHaveLength(1)
  })

  it('keeps the focus on Continue when an answered question comes back after a reload', async () => {
    const session = createSession(lesson, [tf(), tf()])
    session.select(true)
    session.check()
    render(<Lesson session={session} onFinish={vi.fn()} onLeave={vi.fn()} />)
    const next = await screen.findByRole('button', { name: 'Continue' })
    await waitFor(() => expect(document.activeElement).toBe(next))
  })
})
