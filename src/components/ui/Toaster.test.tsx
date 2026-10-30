import { act, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { toast, toasts } from '../../lib/toast.ts'

import { Toaster } from './Toaster.tsx'

describe('Toaster', () => {
  afterEach(() => {
    vi.useRealTimers()
    toasts.value = []
  })

  it('shows two toasts at a time and removes each when its time is up', async () => {
    vi.useFakeTimers()
    render(<Toaster />)
    await act(() => {
      toast('First', 1000)
      toast('Second', 3000)
      toast('Third', 3000)
    })
    const region = screen.getByRole('status')
    expect(region.textContent).toBe('FirstSecond')

    await act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(region.textContent).toBe('SecondThird')

    await act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(region.textContent).toBe('')
  })
})
