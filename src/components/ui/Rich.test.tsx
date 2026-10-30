import { render } from '@testing-library/preact'
import { describe, expect, it } from 'vitest'

import { Rich } from './Rich.tsx'

describe('Rich', () => {
  it('renders backtick spans as code', () => {
    const { container } = render(<Rich text="Use `let` or `const`." />)
    expect([...container.querySelectorAll('code')].map((c) => c.textContent)).toEqual([
      'let',
      'const',
    ])
    expect(container.textContent).toBe('Use let or const.')
  })
})
