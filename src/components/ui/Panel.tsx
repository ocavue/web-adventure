import * as stylex from '@stylexjs/stylex'
import type { ComponentChildren } from 'preact'

import { surface } from '../../styles/shared.ts'

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
    <Tag aria-labelledby={labelledBy} {...stylex.props(surface.panel, xstyle)}>
      {children}
    </Tag>
  )
}
