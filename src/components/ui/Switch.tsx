import * as stylex from '@stylexjs/stylex'

import { focus } from '../../styles/shared.ts'
import { colors } from '../../styles/tokens.stylex.ts'

const styles = stylex.create({
  switch: {
    appearance: 'none',
    width: 50,
    height: 30,
    borderRadius: 99,
    backgroundColor: colors.line,
    position: 'relative',
    cursor: 'pointer',
    borderWidth: 0,
    padding: 0,
    flexShrink: 0,
    transitionProperty: 'background-color',
    transitionDuration: '0.15s',
    '::after': {
      content: "''",
      position: 'absolute',
      top: 3,
      left: 3,
      width: 24,
      height: 24,
      borderRadius: '50%',
      backgroundColor: colors.paper2,
      transitionProperty: 'transform',
      transitionDuration: '0.15s',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
    },
  },
  on: {
    backgroundColor: colors.good,
    '::after': { transform: 'translateX(20px)' },
  },
})

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** The accessible name. */
  label: string
  id?: string
  xstyle?: stylex.StyleXStyles
}

/** An on/off toggle. */
export function Switch({ checked, onChange, label, id, xstyle }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      {...stylex.props(styles.switch, focus.ring, checked && styles.on, xstyle)}
    />
  )
}
