import * as stylex from '@stylexjs/stylex'

import { colors } from '../../styles/tokens.stylex.ts'

const styles = stylex.create({
  bar: {
    height: 10,
    backgroundColor: colors.paper3,
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    display: 'block',
    height: '100%',
    borderRadius: 99,
    transitionProperty: 'width',
    transitionDuration: '0.6s',
    transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
  dynamic: (pct: number, color: string) => ({ width: `${pct}%`, backgroundColor: color }),
})

export interface ProgressBarProps {
  /** How full the bar is, from 0 to 1. */
  value: number
  /** The fill color. Defaults to `colors.good`. */
  color?: string
  /** When set, the bar is a `progressbar` with this accessible name. Otherwise it is decorative. */
  label?: string
  xstyle?: stylex.StyleXStyles
  fillXstyle?: stylex.StyleXStyles
}

/** A rounded bar that fills with an animated width. */
export function ProgressBar({
  value,
  color = colors.good,
  label,
  xstyle,
  fillXstyle,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div
      role={label ? 'progressbar' : undefined}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-valuenow={label ? Math.round(pct) : undefined}
      aria-hidden={label ? undefined : true}
      {...stylex.props(styles.bar, xstyle)}
    >
      <i {...stylex.props(styles.fill, styles.dynamic(pct, color), fillXstyle)} />
    </div>
  )
}
