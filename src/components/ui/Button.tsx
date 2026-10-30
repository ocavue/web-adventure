import * as stylex from '@stylexjs/stylex'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentChildren } from 'preact'

import { focus } from '../../styles/shared.ts'
import { colors, fonts, radii } from '../../styles/tokens.stylex.ts'

import { Icon } from './Icon.tsx'
import type { IconName } from './icons.ts'

export type ButtonVariant = 'primary' | 'default' | 'ghost' | 'good' | 'bad'

const primaryShadow = `color-mix(in srgb, ${colors.blaze} 55%, #5a3b00)`

const styles = stylex.create({
  base: {
    appearance: 'none',
    borderWidth: 0,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: fonts.display,
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: '0.01em',
    lineHeight: 1.2,
    textDecoration: 'none',
    paddingBlock: 12,
    paddingInline: 20,
    borderRadius: radii.m,
    minHeight: 48,
    transitionProperty: 'transform, box-shadow, background-color',
    transitionDuration: '0.08s, 0.08s, 0.15s',
    transitionTimingFunction: 'ease',
  },
  pressable: {
    transform: { default: null, ':active': 'translateY(2px)' },
  },
  default: {
    backgroundColor: { default: colors.paper2, ':hover': colors.paper3 },
    color: colors.ink,
    boxShadow: `inset 0 0 0 2px ${colors.line}, 0 3px 0 ${colors.line}`,
  },
  defaultActive: {
    boxShadow: {
      default: `inset 0 0 0 2px ${colors.line}, 0 3px 0 ${colors.line}`,
      ':active': `inset 0 0 0 2px ${colors.line}, 0 1px 0 ${colors.line}`,
    },
  },
  primary: {
    backgroundColor: {
      default: colors.blaze,
      ':hover': `color-mix(in srgb, ${colors.blaze} 88%, white)`,
    },
    color: colors.blazeInk,
    boxShadow: `0 4px 0 ${primaryShadow}`,
  },
  primaryActive: {
    boxShadow: { default: `0 4px 0 ${primaryShadow}`, ':active': `0 1px 0 ${primaryShadow}` },
  },
  good: {
    backgroundColor: colors.good,
    color: colors.paper2,
    boxShadow: `0 4px 0 color-mix(in srgb, ${colors.good} 60%, black)`,
  },
  bad: {
    backgroundColor: colors.bad,
    color: colors.paper2,
    boxShadow: `0 4px 0 color-mix(in srgb, ${colors.bad} 60%, black)`,
  },
  ghost: {
    backgroundColor: { default: 'transparent', ':hover': colors.paper3 },
    color: { default: colors.ink2, ':hover': colors.ink },
    boxShadow: 'none',
  },
  small: {
    minHeight: 38,
    paddingBlock: 8,
    paddingInline: 14,
    fontSize: 14,
    borderRadius: 11,
  },
  wide: { width: '100%' },
  disabled: { opacity: 0.6, cursor: 'not-allowed' },
  primaryDisabled: {
    backgroundColor: colors.paper3,
    color: colors.ink3,
    boxShadow: 'none',
    opacity: 1,
  },
})

interface CommonProps {
  variant?: ButtonVariant
  size?: 'normal' | 'small'
  wide?: boolean
  /** A leading icon. */
  icon?: IconName
  children?: ComponentChildren
  xstyle?: stylex.StyleXStyles
}

type Native<T> = Omit<T, 'class' | 'className' | 'style' | 'size' | 'icon'>

export type ButtonProps = CommonProps &
  (
    | ({ href?: undefined; disabled?: boolean } & Native<
        Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>
      >)
    | ({ href: string } & Native<AnchorHTMLAttributes<HTMLAnchorElement>>)
  )

function buttonStyles(
  variant: ButtonVariant,
  size: 'normal' | 'small',
  wide: boolean,
  disabled: boolean,
  xstyle: stylex.StyleXStyles | undefined,
) {
  return stylex.props(
    styles.base,
    focus.ring,
    !disabled && styles.pressable,
    styles[variant],
    !disabled && variant === 'default' && styles.defaultActive,
    !disabled && variant === 'primary' && styles.primaryActive,
    size === 'small' && styles.small,
    wide && styles.wide,
    disabled && styles.disabled,
    disabled && variant === 'primary' && styles.primaryDisabled,
    xstyle,
  )
}

/** The chunky trail button, with a pressed "3D" bottom edge. Renders a link when given `href`. */
export function Button({
  variant = 'default',
  size = 'normal',
  wide = false,
  icon,
  children,
  xstyle,
  ...rest
}: ButtonProps) {
  const content = (
    <>
      {icon && <Icon name={icon} />}
      {children}
    </>
  )
  if (rest.href !== undefined) {
    return (
      <a {...rest} {...buttonStyles(variant, size, wide, false, xstyle)}>
        {content}
      </a>
    )
  }
  return (
    <button type="button" {...rest} {...buttonStyles(variant, size, wide, !!rest.disabled, xstyle)}>
      {content}
    </button>
  )
}
