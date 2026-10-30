import { cleanup, render, screen, waitFor } from '@testing-library/preact'
import { useState } from 'preact/hooks'
import { afterEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Dialog } from './Dialog.tsx'

function Harness({ dismissible }: { dismissible: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} dismissible={dismissible} title="Hello">
        <button type="button" onClick={() => setOpen(false)}>
          Finish
        </button>
      </Dialog>
    </>
  )
}

describe('Dialog', () => {
  afterEach(cleanup)

  it('opens as a modal and returns focus to the opener on close', async () => {
    render(<Harness dismissible />)
    const opener = screen.getByRole('button', { name: 'Open' })
    await userEvent.click(opener)
    const dialog = await screen.findByRole('dialog', { name: 'Hello' })
    await waitFor(() => expect(dialog.matches(':modal')).toBe(true))
    expect(dialog.contains(document.activeElement)).toBe(true)

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(dialog.matches('[open]')).toBe(false))
    expect(document.activeElement).toBe(opener)
  })

  it('ignores Esc when it is not dismissible', async () => {
    render(<Harness dismissible={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    const dialog = await screen.findByRole('dialog', { name: 'Hello' })
    await waitFor(() => expect(dialog.matches(':modal')).toBe(true))
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()

    await userEvent.keyboard('{Escape}')
    await userEvent.keyboard('{Escape}')
    expect(dialog.matches(':modal')).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Finish' }))
    await waitFor(() => expect(dialog.matches('[open]')).toBe(false))
  })
})
