import * as stylex from '@stylexjs/stylex'

import type { Badge as BadgeInfo, BadgeColor } from '../../lib/constants.ts'
import { layout } from '../../styles/shared.ts'
import { colors } from '../../styles/tokens.stylex.ts'

const BADGE_COLORS: Record<BadgeColor, string> = {
  html: colors.html,
  css: colors.css,
  js: colors.js,
  ts: colors.ts,
  web: colors.web,
  react: colors.react,
  git: colors.git,
  blaze: colors.blaze,
  flame: colors.flame,
  ember: '#e8590c',
  amber: '#f59f00',
  red: '#e03131',
}

import type { IconName } from './icons.ts'
import { Medal } from './Medal.tsx'

const styles = stylex.create({
  badge: {
    display: 'grid',
    justifyItems: 'center',
    alignContent: 'start',
    gap: 6,
    textAlign: 'center',
    width: '100%',
  },
  name: { fontWeight: 700, fontSize: 13, lineHeight: 1.2 },
  desc: { fontSize: 12, color: colors.ink2, lineHeight: 1.3 },
})

export interface BadgeProps {
  badge: BadgeInfo
  /** Whether the player has earned it. Locked badges show a gray lock. */
  got: boolean
  xstyle?: stylex.StyleXStyles
}

/** A badge card: medal, name, and how to earn it. */
export function Badge({ badge, got, xstyle }: BadgeProps) {
  return (
    <div {...stylex.props(styles.badge, xstyle)}>
      <Medal icon={badge.icon as IconName} color={got ? BADGE_COLORS[badge.color] : undefined} />
      <div {...stylex.props(styles.name)}>
        {badge.name}
        {!got && <span {...stylex.props(layout.srOnly)}> (locked)</span>}
      </div>
      <div {...stylex.props(styles.desc)}>{badge.desc}</div>
    </div>
  )
}
