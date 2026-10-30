import * as stylex from '@stylexjs/stylex'

import type { Badge } from '../../lib/constants.ts'

import { BADGE_COLORS } from './Badge.tsx'
import type { IconName } from './icons.ts'
import { Medal } from './Medal.tsx'

const styles = stylex.create({
  text: { display: 'grid', gap: 2, minWidth: 0 },
})

/** The content of a "Badge earned" toast. */
export function BadgeToast({ badge }: { badge: Badge }) {
  return (
    <>
      <Medal icon={badge.icon as IconName} color={BADGE_COLORS[badge.color]} size="small" />
      <div {...stylex.props(styles.text)}>
        <b>Badge earned: {badge.name}</b>
        <span>{badge.desc}</span>
      </div>
    </>
  )
}
