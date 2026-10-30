import * as stylex from '@stylexjs/stylex'

import { colors, fonts, radii } from '../styles/tokens.stylex.ts'

export const styles = stylex.create({
  main: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    minHeight: '100vh',
    paddingBlock: 48,
    textAlign: 'center',
  },
  title: { marginBlock: 0 },
  buddy: { maxWidth: 560, textAlign: 'start' },
  home: {
    display: 'inline-block',
    paddingBlock: 12,
    paddingInline: 24,
    borderRadius: radii.pill,
    backgroundColor: { default: colors.blaze, ':hover': colors.flame },
    color: colors.blazeInk,
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: 700,
    textDecoration: 'none',
  },
})
