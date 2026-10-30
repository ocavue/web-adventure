import * as stylex from '@stylexjs/stylex'
import type { ButtonHTMLAttributes } from 'preact'

import { focus } from '../../styles/shared.ts'
import { colors } from '../../styles/tokens.stylex.ts'

import { Icon } from './Icon.tsx'
import type { IconName } from './icons.ts'

const styles = stylex.create({
  btn: {
    appearance: 'none',
    borderWidth: 0,
    backgroundColor: { default: 'transparent', ':hover': colors.paper3 },
    color: { default: colors.ink2, ':hover': colors.ink },
    cursor: 'pointer',
    width: 42,
    height: 42,
    borderRadius: 12,
    display: 'grid',
    placeItems: 'center',
    padding: 0,
  },
})

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'class' | 'className' | 'style' | 'icon' | 'href' | 'label'
> {
  icon: IconName
  /** The accessible name, also shown as a tooltip. */
  label: string
  /** Renders a link instead of a button. */
  href?: string
  xstyle?: stylex.StyleXStyles
}

/** A square, borderless button that shows only an icon. */
export function IconButton({ icon, label, href, xstyle, ...rest }: IconButtonProps) {
  const attrs = stylex.props(styles.btn, focus.ring, xstyle)
  if (href !== undefined) {
    return (
      <a href={href} aria-label={label} title={label} {...attrs}>
        <Icon name={icon} />
      </a>
    )
  }
  return (
    <button type="button" aria-label={label} title={label} {...rest} {...attrs}>
      <Icon name={icon} />
    </button>
  )
}
