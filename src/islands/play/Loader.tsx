import * as stylex from '@stylexjs/stylex'

import { Bit } from '../../components/ui/Bit.tsx'
import { colors, fonts } from '../../styles/tokens.stylex.ts'

const sway = stylex.keyframes({
  '0%, 100%': { transform: 'rotate(-4deg)' },
  '50%': { transform: 'rotate(4deg)' },
})

const fadeIn = stylex.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
})

const styles = stylex.create({
  loader: {
    position: 'relative',
    zIndex: 1,
    minHeight: '100vh',
    display: 'grid',
    placeContent: 'center',
    justifyItems: 'center',
    gap: 12,
    paddingInline: 16,
    textAlign: 'center',
    // Most lessons load in a blink. The delay keeps the loader from flashing.
    animationName: fadeIn,
    animationDuration: '0.2s',
    animationDelay: '0.3s',
    animationFillMode: 'backwards',
  },
  bit: {
    animationName: sway,
    animationDuration: '1.2s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
  },
  text: { fontFamily: fonts.display, fontWeight: 700, fontSize: 18, color: colors.ink2 },
})

/** Shown while the lesson page loads its questions. Also the static fallback of the island. */
export function Loader() {
  return (
    <div role="status" {...stylex.props(styles.loader)}>
      <div {...stylex.props(styles.bit)}>
        <Bit mood="happy" size="large" />
      </div>
      <p {...stylex.props(styles.text)}>Packing your backpack...</p>
    </div>
  )
}
