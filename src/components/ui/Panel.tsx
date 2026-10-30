import * as stylex from '@stylexjs/stylex'
import type { ComponentChildren } from 'preact'

import { colors, radii } from '../../styles/tokens.stylex.ts'

const styles = stylex.create({
  panel: {
    backgroundColor: colors.paper2,
    borderRadius: radii.l,
    padding: 16,
    boxShadow: `inset 0 0 0 1.5px ${colors.line}`,
  },
})

export interface PanelProps {
  as?: 'div' | 'section' | 'article' | 'aside'
  /** The id of the heading that names this panel. */
  labelledBy?: string
  children?: ComponentChildren
  xstyle?: stylex.StyleXStyles
}

/** A white card with a thin outline. */
export function Panel({ as: Tag = 'div', labelledBy, children, xstyle }: PanelProps) {
  return (
    <Tag aria-labelledby={labelledBy} {...stylex.props(styles.panel, xstyle)}>
      {children}
    </Tag>
  )
}
