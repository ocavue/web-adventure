import * as stylex from '@stylexjs/stylex'

import { colors } from '../../styles/tokens.stylex.ts'

import { Icon } from './Icon.tsx'
import type { IconName } from './icons.ts'

const styles = stylex.create({
  medal: {
    width: 58,
    height: 58,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    backgroundColor: colors.paper3,
    color: colors.ink3,
    position: 'relative',
  },
  small: { width: 40, height: 40 },
  icon: { width: 28, height: 28 },
  smallIcon: { width: 20, height: 20 },
  got: (color: string) => ({
    backgroundColor: color,
    color: '#fff',
    boxShadow: `0 4px 0 color-mix(in srgb, ${color} 55%, black)`,
  }),
})

export interface MedalProps {
  icon: IconName
  /** The medal color. Without it, the medal is locked: gray with a lock icon. */
  color?: string
  /** `small` fits inside a toast. */
  size?: 'normal' | 'small'
  xstyle?: stylex.StyleXStyles
}

/** A round badge medal. Decorative: put the badge name next to it. */
export function Medal({ icon, color, size = 'normal', xstyle }: MedalProps) {
  const small = size === 'small'
  return (
    <div
      aria-hidden="true"
      {...stylex.props(
        styles.medal,
        small && styles.small,
        color !== undefined && styles.got(color),
        xstyle,
      )}
    >
      <Icon name={color ? icon : 'lock'} xstyle={small ? styles.smallIcon : styles.icon} />
    </div>
  )
}
