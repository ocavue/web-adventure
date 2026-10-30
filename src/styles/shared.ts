import * as stylex from '@stylexjs/stylex'

import { colors, fonts, radii, shadows } from './tokens.stylex.ts'

/** Typography and layout styles that many components share. */
export const text = stylex.create({
  display: {
    fontFamily: fonts.display,
    fontWeight: 800,
    letterSpacing: '-0.01em',
    lineHeight: 1.1,
    textWrap: 'balance',
  },
  h1: { fontSize: 'clamp(28px, 5vw, 40px)' },
  h2: { fontSize: 'clamp(22px, 3.4vw, 28px)' },
  h3: { fontSize: 19, fontWeight: 700 },
  eyebrow: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: colors.ink2,
  },
  muted: { color: colors.ink2 },
  small: { fontSize: 14 },
  tiny: { fontSize: 13 },
  mono: { fontFamily: fonts.mono, fontSize: '0.9em' },
})

export const layout = stylex.create({
  wrap: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 980,
    marginInline: 'auto',
    paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
    paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
    paddingBottom: 48,
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: 0,
  },
})

export const surface = stylex.create({
  panel: {
    backgroundColor: colors.paper2,
    borderRadius: radii.l,
    padding: 18,
    boxShadow: `${shadows.card}, inset 0 0 0 1.5px ${colors.line}`,
  },
})

/** A visible focus ring for keyboard users. */
export const focus = stylex.create({
  ring: {
    outline: { default: 'none', ':focus-visible': `3px solid ${colors.focus}` },
    outlineOffset: 2,
  },
})
