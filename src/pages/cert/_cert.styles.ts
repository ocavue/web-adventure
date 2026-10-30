import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  // `layout.wrap` makes a stacking context below the top bar. On paper, the certificate must cover it.
  main: { zIndex: { default: 1, '@media print': 200 } },
})
