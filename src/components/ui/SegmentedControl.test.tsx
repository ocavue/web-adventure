import { render, screen } from '@testing-library/preact'
import { useState } from 'preact/hooks'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { SegmentedControl } from './SegmentedControl.tsx'

describe('SegmentedControl', () => {
  it('presses exactly the picked option', async () => {
    const onChange = vi.fn<(v: number) => void>()
    function Harness() {
      const [value, setValue] = useState(1)
      return (
        <SegmentedControl
          options={[
            { value: 1, label: 'One' },
            { value: 2, label: 'Two' },
          ]}
          value={value}
          onChange={(v) => {
            onChange(v)
            setValue(v)
          }}
        />
      )
    }
    render(<Harness />)
    const one = screen.getByRole('button', { name: 'One' })
    const two = screen.getByRole('button', { name: 'Two' })
    expect(one.getAttribute('aria-pressed')).toBe('true')
    expect(two.getAttribute('aria-pressed')).toBe('false')

    await userEvent.click(two)
    expect(onChange).toHaveBeenCalledWith(2)
    expect(one.getAttribute('aria-pressed')).toBe('false')
    expect(two.getAttribute('aria-pressed')).toBe('true')
  })
})
