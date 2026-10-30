import * as stylex from '@stylexjs/stylex'

import { colors } from '../../styles/tokens.stylex.ts'

import { Icon } from './Icon.tsx'

const starIn = stylex.keyframes({
  from: { transform: 'scale(0) rotate(-40deg)' },
  to: { transform: 'none' },
})

const styles = stylex.create({
  row: { display: 'inline-flex', gap: 1 },
  bigRow: { display: 'flex', gap: 10, alignItems: 'flex-end' },
  star: { width: 16, height: 16, color: colors.line },
  big: { width: 64, height: 64, color: colors.line },
  bigMiddle: { width: 84, height: 84 },
  on: { color: colors.blaze },
  bigOn: {
    animationName: starIn,
    animationDuration: '0.5s',
    animationTimingFunction: 'cubic-bezier(0.3, 1.7, 0.5, 1)',
    animationFillMode: 'both',
  },
  delay: (s: number) => ({ animationDelay: `${s}s` }),
})

export interface StarsProps {
  /** Stars earned, from 0 to 3. */
  count: number
  /** `big` is the results-screen row, with a larger middle star that pops in. */
  size?: 'normal' | 'big'
  xstyle?: stylex.StyleXStyles
}

/** A row of three stars, filled up to `count`. */
export function Stars({ count, size = 'normal', xstyle }: StarsProps) {
  const big = size === 'big'
  return (
    <span
      role="img"
      aria-label={`${count} of 3 stars`}
      {...stylex.props(big ? styles.bigRow : styles.row, xstyle)}
    >
      {[0, 1, 2].map((i) => {
        const on = i < count
        return (
          <Icon
            key={i}
            name="star"
            xstyle={[
              big ? styles.big : styles.star,
              big && i === 1 && styles.bigMiddle,
              on && styles.on,
              big && on && styles.bigOn,
              big && on && i > 0 && styles.delay(i * 0.25),
            ]}
          />
        )
      })}
    </span>
  )
}
