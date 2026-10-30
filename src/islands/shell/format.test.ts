import { describe, expect, it } from 'vitest'

import { compactXp } from './format.ts'

describe('compactXp', () => {
  it('shortens XP from 1000 on, with one decimal at most', () => {
    expect(compactXp(999)).toBe('999')
    expect(compactXp(1000)).toBe('1k')
    expect(compactXp(1234)).toBe('1.2k')
    expect(compactXp(12_960)).toBe('13k')
  })
})
