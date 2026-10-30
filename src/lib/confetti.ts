import { colors } from '../styles/tokens.stylex.ts'

import { progress } from './store.ts'
import { reducedMotion } from './theme.ts'

const PALETTE = [
  colors.blaze,
  colors.html,
  colors.css,
  colors.web,
  colors.react,
  colors.git,
  colors.ts,
]

/** Resolves `var(--x)` token references to the colors of the current theme. */
function themeColors(): string[] {
  const css = getComputedStyle(document.documentElement)
  return PALETTE.map((v) => css.getPropertyValue(v.replace(/^var\((.+)\)$/, '$1')).trim()).filter(
    Boolean,
  )
}

/** Throws a burst of confetti. `power` scales the number of pieces. Skipped with reduced motion. */
export async function confetti(power = 1): Promise<void> {
  if (reducedMotion(progress.peek().settings)) return
  // Loaded on first use, so pages without a celebration never download it.
  const { default: fire } = await import('canvas-confetti')
  const palette = themeColors()
  await fire({
    particleCount: Math.round(140 * power),
    origin: { y: 0.35 },
    spread: 70,
    startVelocity: 40,
    ticks: 170,
    zIndex: 60,
    colors: palette.length > 0 ? palette : undefined,
    disableForReducedMotion: true,
  })
}
