import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  main: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    // Fills the screen below the 65 px top bar, so the page does not scroll.
    minHeight: 'calc(100dvh - 65px)',
    paddingBlock: 48,
    textAlign: 'center',
  },
  title: { marginBlock: 0 },
  buddy: { maxWidth: 560, textAlign: 'start' },
})
