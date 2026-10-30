import * as stylex from '@stylexjs/stylex'

import type { ModuleId } from '../../lib/types.ts'
import { moduleThemes } from '../../styles/themes.ts'
import { accent, colors, fonts } from '../../styles/tokens.stylex.ts'

const styles = stylex.create({
  blaze: {
    width: 54,
    height: 64,
    borderRadius: 9,
    backgroundColor: accent.color,
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    fontFamily: fonts.mono,
    fontWeight: 600,
    fontSize: 15,
    position: 'relative',
    boxShadow: 'inset 0 -5px 0 rgba(0, 0, 0, 0.14)',
    textShadow: '0 1px 0 rgba(0, 0, 0, 0.25)',
    '::after': {
      content: "''",
      position: 'absolute',
      inset: 5,
      borderRadius: 5,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: 'rgba(255, 255, 255, 0.35)',
    },
  },
  sm: {
    width: 38,
    height: 44,
    fontSize: 12,
    borderRadius: 7,
    '::after': { inset: 3 },
  },
  xs: { width: 30, height: 34, fontSize: 10 },
  darkInk: { color: colors.blazeInk, textShadow: 'none' },
})

export interface BlazeProps {
  /** The short text painted on the marker, such as `JS` or a level number. */
  glyph: string
  size?: 'normal' | 'sm' | 'xs'
  /**
   * Paints the marker in this trail's color. Without it the marker uses the inherited `accent.color`.
   * Pass it for the light trails (`js`, `web`) so the glyph switches to dark ink.
   */
  mod?: ModuleId
  xstyle?: stylex.StyleXStyles
}

/** A painted trail marker: a colored tile with a dashed inner edge. Decorative. */
export function Blaze({ glyph, size = 'normal', mod, xstyle }: BlazeProps) {
  return (
    <span
      aria-hidden="true"
      data-blaze=""
      {...stylex.props(
        mod && moduleThemes[mod],
        styles.blaze,
        size !== 'normal' && styles.sm,
        size === 'xs' && styles.xs,
        (mod === 'js' || mod === 'web') && styles.darkInk,
        xstyle,
      )}
    >
      {glyph}
    </span>
  )
}
