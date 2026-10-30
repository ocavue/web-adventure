import { render, screen } from '@testing-library/preact'
import { useState } from 'preact/hooks'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Switch } from './Switch.tsx'

describe('Switch', () => {
  it('toggles its checked state', async () => {
    function Harness() {
      const [on, setOn] = useState(false)
      return <Switch label="Sound effects" checked={on} onChange={setOn} />
    }
    render(<Harness />)
    const sw = screen.getByRole('switch', { name: 'Sound effects' })
    expect(sw.getAttribute('aria-checked')).toBe('false')
    await userEvent.click(sw)
    expect(sw.getAttribute('aria-checked')).toBe('true')
    await userEvent.keyboard(' ')
    expect(sw.getAttribute('aria-checked')).toBe('false')
  })
})
