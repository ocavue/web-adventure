import { describe, expect, it } from 'vitest'

import { MODULES } from './constants.ts'
import { TRAIL_DESCRIPTIONS } from './seo.ts'

describe('TRAIL_DESCRIPTIONS', () => {
  it.each(MODULES.map((m) => m.id))('fits a search result snippet: %s', (mod) => {
    expect(TRAIL_DESCRIPTIONS[mod].length).toBeGreaterThanOrEqual(120)
    expect(TRAIL_DESCRIPTIONS[mod].length).toBeLessThanOrEqual(160)
  })
})
