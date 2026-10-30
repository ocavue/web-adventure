import * as stylex from '@stylexjs/stylex'
import type { ComponentChildren } from 'preact'

import { surface } from '../../styles/shared.ts'
import { colors, radii } from '../../styles/tokens.stylex.ts'

export type Mood = 'happy' | 'wow' | 'calm'

const bounce = stylex.keyframes({
  '0%': { transform: 'translateY(0)' },
  '35%': { transform: 'translateY(-14px) scale(1.04)' },
  '100%': { transform: 'translateY(0)' },
})

const wiggle = stylex.keyframes({
  '0%, 100%': { transform: 'rotate(0)' },
  '25%': { transform: 'rotate(-6deg)' },
  '75%': { transform: 'rotate(6deg)' },
})

const styles = stylex.create({
  bit: { width: 76, height: 76, flexShrink: 0 },
  large: { width: 96, height: 96 },
  small: { width: 44, height: 44 },
  bounce: {
    animationName: bounce,
    animationDuration: '0.6s',
    animationTimingFunction: 'cubic-bezier(0.3, 1.6, 0.5, 1)',
  },
  wiggle: { animationName: wiggle, animationDuration: '0.5s', animationTimingFunction: 'ease' },
  buddy: { display: 'flex', alignItems: 'flex-end', gap: 12 },
  bubble: {
    position: 'relative',
    borderRadius: radii.m,
    paddingBlock: 12,
    paddingInline: 16,
    fontSize: 16,
    minWidth: 0,
    '::before': {
      content: "''",
      position: 'absolute',
      left: -7,
      bottom: 16,
      width: 14,
      height: 14,
      backgroundColor: colors.paper2,
      transform: 'rotate(45deg)',
      boxShadow: `-1.5px 1.5px 0 0 ${colors.line}`,
    },
  },
})

const fill = stylex.create({
  body: { fill: colors.blaze },
  pack: { fill: colors.git },
  eye: { fill: colors.ink },
  shine: { fill: colors.paper2 },
  cheek: { fill: '#ff8a65', opacity: 0.55 },
  mouth: { stroke: colors.ink, fill: 'none', strokeWidth: 3, strokeLinecap: 'round' },
  ground: { fill: colors.contour },
  open: { fill: colors.ink },
  flag: { fill: colors.html, stroke: colors.ink, strokeWidth: 1.5, strokeLinejoin: 'round' },
})

export interface BitProps {
  mood?: Mood
  size?: 'small' | 'normal' | 'large'
  motion?: 'bounce' | 'wiggle'
}

/** Bit, the trail buddy mascot. */
export function Bit({ mood = 'happy', size = 'normal', motion }: BitProps) {
  return (
    <svg
      {...stylex.props(
        styles.bit,
        size === 'large' && styles.large,
        size === 'small' && styles.small,
        motion === 'bounce' && styles.bounce,
        motion === 'wiggle' && styles.wiggle,
      )}
      viewBox="0 0 80 80"
      aria-hidden="true"
    >
      <ellipse {...stylex.props(fill.ground)} cx="40" cy="74" rx="26" ry="5" />
      <rect {...stylex.props(fill.pack)} x="8" y="30" width="12" height="28" rx="5" />
      <rect {...stylex.props(fill.body)} x="14" y="12" width="52" height="58" rx="22" />
      <circle {...stylex.props(fill.eye)} cx="30" cy="38" r="5.5" />
      <circle {...stylex.props(fill.eye)} cx="50" cy="38" r="5.5" />
      <circle {...stylex.props(fill.shine)} cx="32" cy="36" r="1.8" />
      <circle {...stylex.props(fill.shine)} cx="52" cy="36" r="1.8" />
      <circle {...stylex.props(fill.cheek)} cx="23" cy="48" r="4" />
      <circle {...stylex.props(fill.cheek)} cx="57" cy="48" r="4" />
      {mood === 'wow' ? (
        <ellipse {...stylex.props(fill.open)} cx="40" cy="52" rx="5" ry="6" />
      ) : mood === 'calm' ? (
        <path {...stylex.props(fill.mouth)} d="M34 52h12" />
      ) : (
        <path {...stylex.props(fill.mouth)} d="M32 50c4 6 12 6 16 0" />
      )}
      <path {...stylex.props(fill.flag)} d="M40 12V4l9 3-9 3" />
    </svg>
  )
}

/** Bit with a speech bubble. */
export function Buddy({
  children,
  xstyle,
  ...bit
}: BitProps & { children: ComponentChildren; xstyle?: stylex.StyleXStyles }) {
  return (
    <div {...stylex.props(styles.buddy, xstyle)}>
      <Bit {...bit} />
      <div {...stylex.props(surface.panel, surface.raised, styles.bubble)}>{children}</div>
    </div>
  )
}
