import * as stylex from '@stylexjs/stylex'
import type { ComponentChildren } from 'preact'

import { accent, colors } from '../../styles/tokens.stylex.ts'

import { Icon } from './Icon.tsx'
import type { IconName } from './icons.ts'

const styles = stylex.create({
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    paddingBlock: 4,
    paddingInline: 9,
    borderRadius: 7,
    backgroundColor: colors.paper3,
    color: colors.ink2,
  },
  accent: {
    backgroundColor: `color-mix(in srgb, ${accent.color} 18%, ${colors.paper2})`,
    color: colors.ink,
  },
  retry: { backgroundColor: colors.blazeSoft, color: colors.ink },
  plain: { backgroundColor: 'transparent' },
})

export interface TagProps {
  /** `accent` tints the tag with `accent.color`. `retry` marks a second try. */
  tone?: 'default' | 'accent' | 'retry' | 'plain'
  icon?: IconName
  children?: ComponentChildren
  xstyle?: stylex.StyleXStyles
}

/** A small uppercase label, such as a question's trail or topic. */
export function Tag({ tone = 'default', icon, children, xstyle }: TagProps) {
  return (
    <span {...stylex.props(styles.tag, tone !== 'default' && styles[tone], xstyle)}>
      {icon && <Icon name={icon} />}
      {children}
    </span>
  )
}
