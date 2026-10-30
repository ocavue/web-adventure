import * as stylex from '@stylexjs/stylex'
import type { ComponentChildren } from 'preact'

import { focus } from '../../styles/shared.ts'
import { colors } from '../../styles/tokens.stylex.ts'

const styles = stylex.create({
  seg: {
    display: 'grid',
    gridAutoFlow: 'column',
    gridAutoColumns: '1fr',
    gap: 6,
    backgroundColor: colors.paper,
    padding: 4,
    borderRadius: 12,
    boxShadow: `inset 0 0 0 1.5px ${colors.line}`,
  },
  option: {
    appearance: 'none',
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingBlock: 9,
    paddingInline: 6,
    borderRadius: 9,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
    lineHeight: 1.5,
    color: colors.ink2,
  },
  pressed: {
    backgroundColor: colors.paper2,
    color: colors.ink,
    boxShadow: `0 1px 0 ${colors.line}, inset 0 0 0 1.5px ${colors.line}`,
  },
})

export interface SegmentedOption<T> {
  value: T
  label: ComponentChildren
}

export interface SegmentedControlProps<T> {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /** The id of the element that names the group. */
  labelledBy?: string
  xstyle?: stylex.StyleXStyles
}

/** A row of toggle buttons where exactly one is pressed. */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  labelledBy,
  xstyle,
}: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-labelledby={labelledBy} {...stylex.props(styles.seg, xstyle)}>
      {options.map((o) => {
        const pressed = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(o.value)}
            {...stylex.props(styles.option, focus.ring, pressed && styles.pressed)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
