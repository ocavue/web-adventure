import AxeBuilder from '@axe-core/playwright'

import { SCREENS } from './screens.ts'
import type { Theme } from './screens.ts'
import { expect, test } from './support.ts'

// Animations stop, so axe checks the colors that stay on screen, not a frame of a fade.
test.use({ reducedMotion: 'reduce' })

const THEMES: Theme[] = ['light', 'dark']

for (const screen of SCREENS) {
  for (const theme of THEMES) {
    test(`${screen.name} has no WCAG 2.1 AA violations (${theme})`, async ({ page }) => {
      test.fixme(!!screen.fixme, screen.fixme)
      await screen.open(page, theme)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      const results = await new AxeBuilder({ page })
        // Trail markers (`Blaze`) are pure decoration: hidden from assistive tech, and the trail
        // or level name is always printed next to them. WCAG 1.4.3 sets no contrast for such
        // text, but axe cannot tell, so it flags the white glyph on the lighter trail colors.
        .exclude('[data-blaze]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      const violations = results.violations.map((v) => ({
        rule: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => `${n.target.join(' ')}: ${n.failureSummary ?? ''}`),
      }))
      expect(violations).toEqual([])
    })
  }
}
