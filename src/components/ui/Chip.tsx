import * as stylex from '@stylexjs/stylex'
import type { ComponentChildren } from 'preact'

import { colors, radii } from '../../styles/tokens.stylex.ts'

import { Icon } from './Icon.tsx'
import type { IconName } from './icons.ts'

const styles = stylex.create({
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    paddingBlock: 6,
    paddingInline: 10,
    borderRadius: radii.pill,
    fontWeight: 700,
    fontSize: 14,
    fontVariantNumeric: 'tabular-nums',
    backgroundColor: colors.paper2,
    boxShadow: `inset 0 0 0 1.5px ${colors.line}`,
    whiteSpace: 'nowrap',
  },
  icon: { width: 18, height: 18 },
})

export interface ChipProps {
  icon?: IconName
  /** Styles for the icon, for example its color. */
  iconXstyle?: stylex.StyleXStyles
  title?: string
  children?: ComponentChildren
  xstyle?: stylex.StyleXStyles
}

/** A small pill with an icon and a stat. */
export function Chip({ icon, iconXstyle, title, children, xstyle }: ChipProps) {
  return (
    <span title={title} {...stylex.props(styles.chip, xstyle)}>
      {icon && <Icon name={icon} xstyle={[styles.icon, iconXstyle]} />}
      {children}
    </span>
  )
}
